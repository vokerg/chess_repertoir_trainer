import { Prisma } from '@prisma/client';
import { normalizeFenForPosition, decodeUciMove } from 'chess-domain';
import { ActivityFeedService } from '../activity-feed/activity-feed.service';
import prisma from '../../prisma';
import {
  compactPositionIdentity,
  compactPositionMapKey,
  hydratePositionFen,
  normalizedFenFromPosition,
  positionIdentitySelect,
  transitionalPositionWriteFields,
} from '../positions/position-storage';
import { PlyAnalysisUpdate, StorePositionAnalysisInput, StoredEngineLine, StoredPositionAnalysis } from './analysis.types';
import {
  bestMateWhiteFrom,
  bestMoveUciFrom,
  bestScoreCpWhiteFrom,
  firstUciMove,
  normalizeStoredEngineLines,
} from './position-analysis-normalization';

const positionAnalysisInclude = {
  position: {
    select: {
      ...positionIdentitySelect,
    },
  },
} as const;

const compactGameAnalysisRunInclude = {
  importedGame: {
    select: {
      plies: {
        orderBy: { plyNumber: 'asc' as const },
        select: {
          plyNumber: true,
          moveCode: true,
          scoreLossCp: true,
          classificationCode: true,
          position: {
            select: {
              analysis: {
                select: {
                  id: true,
                  bestMoveUci: true,
                  bestScoreCpWhite: true,
                  bestMateWhite: true,
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

type StoredCompactRun = Prisma.GameAnalysisRunGetPayload<{ include: typeof compactGameAnalysisRunInclude }>;

function decodeCompactRun(run: StoredCompactRun) {
  return {
    ...run,
    importedGame: {
      ...run.importedGame,
      plies: run.importedGame.plies.map(({ moveCode, ...ply }) => ({ ...ply, moveUci: decodeUciMove(moveCode) })),
    },
  };
}

function latestAnalysisSnapshotData(run: {
  id: number;
  status: string;
  createdAt: Date;
  completedAt: Date | null;
  whiteAccuracy: number | null;
  blackAccuracy: number | null;
}) {
  return {
    latestAnalysisRunId: run.id,
    latestAnalysisStatus: run.status,
    latestAnalysisCreatedAt: run.createdAt,
    latestAnalysisCompletedAt: run.completedAt,
    latestWhiteAccuracy: run.whiteAccuracy,
    latestBlackAccuracy: run.blackAccuracy,
  };
}

async function updateImportedGameLatestAnalysisSnapshot(
  tx: Prisma.TransactionClient,
  importedGameId: number,
  run: Parameters<typeof latestAnalysisSnapshotData>[0],
) {
  await tx.importedGame.update({
    where: { id: importedGameId },
    data: latestAnalysisSnapshotData(run),
  });
}

async function recordCompletedGameAnalysisActivity(
  tx: Prisma.TransactionClient,
  importedGameId: number,
  completedAt: Date,
) {
  const game = await tx.importedGame.findUnique({
    where: { id: importedGameId },
    select: { userId: true },
  });
  if (!game) throw new Error('Imported game not found for completed analysis');
  await ActivityFeedService.recordIncrement({
    userId: game.userId,
    type: 'GAME_ANALYSES_COMPLETED',
    occurredAt: completedAt,
  }, tx);
}

function compactPositionAnalysis(row: any, fromCache = true) {
  return {
    id: row.id,
    positionId: row.positionId,
    normalizedFen: normalizedFenFromPosition(row.position),
    bestMoveUci: firstUciMove(row.bestMoveUci) ?? undefined,
    bestScoreCpWhite: row.bestScoreCpWhite ?? undefined,
    bestMateWhite: row.bestMateWhite ?? undefined,
    lines: Array.isArray(row.lines) ? row.lines : [],
    fromCache,
  };
}

function dedupePlyAnalysisUpdates(updates: PlyAnalysisUpdate[]) {
  const updatesByPlyNumber = new Map<number, PlyAnalysisUpdate>();
  for (const update of updates) {
    updatesByPlyNumber.set(update.plyNumber, update);
  }
  return Array.from(updatesByPlyNumber.values()).sort((left, right) => left.plyNumber - right.plyNumber);
}

function normalizedPositionAnalysisInput(input: StorePositionAnalysisInput) {
  const normalizedFen = normalizeFenForPosition(input.fen);
  const positionDataCompact = compactPositionIdentity(normalizedFen);
  const persistenceMode = input.persistenceMode ?? 'rich';
  const normalizedLines = normalizeStoredEngineLines(input.lines);
  const linesToPersist = persistenceMode === 'compact' ? null : normalizedLines;

  return {
    input,
    normalizedFen,
    positionDataCompact,
    persistenceMode,
    normalizedLines,
    linesToPersist,
    incomingDepth: normalizedLines[0]?.depth ?? null,
    bestMoveUci: bestMoveUciFrom(input, normalizedLines),
    bestScoreCpWhite: bestScoreCpWhiteFrom(input, normalizedLines),
    bestMateWhite: bestMateWhiteFrom(input, normalizedLines),
  };
}

type NormalizedPositionAnalysisInput = Pick<
  ReturnType<typeof normalizedPositionAnalysisInput>,
  'bestMoveUci' | 'bestScoreCpWhite' | 'bestMateWhite' | 'linesToPersist' | 'persistenceMode' | 'incomingDepth'
>;

function persistedLines(lines: unknown): StoredEngineLine[] {
  return Array.isArray(lines) ? normalizeStoredEngineLines(lines as StoredEngineLine[]) : [];
}

function bestLineDepth(lines: unknown): number | null {
  const depth = persistedLines(lines)[0]?.depth;
  return typeof depth === 'number' ? depth : null;
}

function hasPersistedLines(lines: unknown): boolean {
  return persistedLines(lines).length > 0;
}

function isIncomingAtLeastAsDeep(incomingDepth: number | null, existingDepth: number | null): boolean {
  return incomingDepth === null || existingDepth === null || incomingDepth >= existingDepth;
}

function scalarWriteData(input: NormalizedPositionAnalysisInput) {
  return {
    bestMoveUci: input.bestMoveUci,
    bestScoreCpWhite: input.bestScoreCpWhite,
    bestMateWhite: input.bestMateWhite,
  };
}

function linesJsonInput(lines: StoredEngineLine[] | null): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return lines && lines.length ? lines as unknown as Prisma.InputJsonValue : Prisma.DbNull;
}

function positionAnalysisWriteData(existing: { lines: Prisma.JsonValue | null }, input: NormalizedPositionAnalysisInput) {
  const existingHasLines = hasPersistedLines(existing.lines);
  const existingDepth = bestLineDepth(existing.lines);
  const incomingHasLines = !!input.linesToPersist?.length;

  if (input.persistenceMode === 'compact') {
    return !existingHasLines || isIncomingAtLeastAsDeep(input.incomingDepth, existingDepth)
      ? scalarWriteData(input)
      : {};
  }

  if (incomingHasLines && (!existingHasLines || isIncomingAtLeastAsDeep(input.incomingDepth, existingDepth))) {
    return {
      ...scalarWriteData(input),
      lines: linesJsonInput(input.linesToPersist),
    };
  }

  return existingHasLines ? {} : scalarWriteData(input);
}

function dedupePositionAnalysisInputs(inputs: StorePositionAnalysisInput[]) {
  const byCompactIdentity = new Map<string, ReturnType<typeof normalizedPositionAnalysisInput>>();

  for (const input of inputs) {
    const normalized = normalizedPositionAnalysisInput(input);
    const key = compactPositionMapKey(normalized.positionDataCompact);
    const previous = byCompactIdentity.get(key);
    if (previous && previous.normalizedFen !== normalized.normalizedFen) {
      throw new Error(`Position compact invariant failed before analysis write: ${previous.normalizedFen} vs ${normalized.normalizedFen}`);
    }
    byCompactIdentity.set(key, normalized);
  }

  return Array.from(byCompactIdentity.values());
}

export async function findOrCreatePositionByNormalizedFen(normalizedFen: string) {
  const positionDataCompact = compactPositionIdentity(normalizedFen);
  let position;
  try {
    position = await prisma.position.create({
      data: transitionalPositionWriteFields(normalizedFen, positionDataCompact),
      select: positionIdentitySelect,
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
    position = await prisma.position.findUnique({
      where: { positionDataCompact },
      select: positionIdentitySelect,
    });
    if (!position) throw new Error('Position compact invariant failed: unique conflict without canonical Position', { cause: error });
  }
  return { id: position.id, normalizedFen: normalizedFenFromPosition(position, normalizedFen) };
}

export async function findOrCreatePositionByFen(fen: string) {
  return findOrCreatePositionByNormalizedFen(normalizeFenForPosition(fen));
}

export async function getPositionAnalysisByFen(fen: string) {
  const normalizedFen = normalizeFenForPosition(fen);
  const positionDataCompact = compactPositionIdentity(normalizedFen);

  const row = await prisma.positionAnalysis.findFirst({
    where: { position: { positionDataCompact } },
    include: positionAnalysisInclude,
  });
  return row ? compactPositionAnalysis(row) : null;
}

export async function getPositionAnalysesByFens(fens: string[]) {
  const identities = new Map<string, Uint8Array<ArrayBuffer>>();
  for (const fen of fens) {
    const data = compactPositionIdentity(normalizeFenForPosition(fen));
    identities.set(compactPositionMapKey(data), data);
  }
  if (!identities.size) return [];
  const rows = await prisma.positionAnalysis.findMany({
    where: { position: { positionDataCompact: { in: [...identities.values()] } } },
    include: positionAnalysisInclude,
  });
  return rows.map((row) => compactPositionAnalysis(row));
}

export async function getPositionAnalysisByPositionId(positionId: number) {
  const row = await prisma.positionAnalysis.findUnique({
    where: { positionId },
    include: positionAnalysisInclude,
  });
  return row ? compactPositionAnalysis(row) : null;
}

export async function upsertPositionAnalysis(positionId: number, data: StorePositionAnalysisInput) {
  const normalized = normalizedPositionAnalysisInput(data);
  const existing = await prisma.positionAnalysis.findUnique({ where: { positionId } });

  const row = existing
    ? await prisma.positionAnalysis.update({
      where: { positionId },
      data: positionAnalysisWriteData(existing, normalized),
      include: positionAnalysisInclude,
    })
    : await prisma.positionAnalysis.create({
      data: {
        positionId,
        bestMoveUci: normalized.bestMoveUci,
        bestScoreCpWhite: normalized.bestScoreCpWhite,
        bestMateWhite: normalized.bestMateWhite,
        lines: linesJsonInput(normalized.linesToPersist),
      },
      include: positionAnalysisInclude,
    });

  return compactPositionAnalysis(row, false);
}

export async function upsertPositionAnalysesBulk(inputs: StorePositionAnalysisInput[]): Promise<StoredPositionAnalysis[]> {
  const deduped = dedupePositionAnalysisInputs(inputs);
  if (!deduped.length) return [];

  return prisma.$transaction(async (tx) => {
    await tx.position.createMany({
      data: deduped.map(({ normalizedFen, positionDataCompact }) => transitionalPositionWriteFields(normalizedFen, positionDataCompact)),
      skipDuplicates: true,
    });

    const positions = await tx.position.findMany({
      where: { positionDataCompact: { in: deduped.map(({ positionDataCompact }) => positionDataCompact) } },
      select: positionIdentitySelect,
    });
    const positionsByCompact = new Map(positions.map((position) => {
      normalizedFenFromPosition(position);
      return [compactPositionMapKey(position.positionDataCompact!), position] as const;
    }));
    const upsertRows = deduped.map((item) => {
      const position = positionsByCompact.get(compactPositionMapKey(item.positionDataCompact));
      if (!position) throw new Error('Position compact invariant failed: could not resolve bulk Position');
      normalizedFenFromPosition(position, item.normalizedFen);

      return {
        positionId: position.id,
        bestMoveUci: item.bestMoveUci,
        bestScoreCpWhite: item.bestScoreCpWhite,
        bestMateWhite: item.bestMateWhite,
        linesToPersist: item.linesToPersist,
        persistenceMode: item.persistenceMode,
        incomingDepth: item.incomingDepth,
      };
    });

    const existingRows = await tx.positionAnalysis.findMany({
      where: { positionId: { in: upsertRows.map((row) => row.positionId) } },
    });
    const existingByPositionId = new Map(existingRows.map((row) => [row.positionId, row]));

    for (const row of upsertRows) {
      const existing = existingByPositionId.get(row.positionId);
      const input = {
        bestMoveUci: row.bestMoveUci,
        bestScoreCpWhite: row.bestScoreCpWhite,
        bestMateWhite: row.bestMateWhite,
        linesToPersist: row.linesToPersist,
        persistenceMode: row.persistenceMode,
        incomingDepth: row.incomingDepth,
      };

      if (existing) {
        await tx.positionAnalysis.update({
          where: { positionId: row.positionId },
          data: positionAnalysisWriteData(existing, input),
        });
      } else {
        await tx.positionAnalysis.create({
          data: {
            positionId: row.positionId,
            bestMoveUci: row.bestMoveUci,
            bestScoreCpWhite: row.bestScoreCpWhite,
            bestMateWhite: row.bestMateWhite,
            lines: linesJsonInput(row.linesToPersist),
          },
        });
      }
    }

    const rows = await tx.positionAnalysis.findMany({
      where: {
        positionId: { in: upsertRows.map((row) => row.positionId) },
      },
      include: positionAnalysisInclude,
    });

    return rows.map((row) => compactPositionAnalysis(row, false));
  });
}

export async function getImportedGameForAnalysis(userId: number, importedGameId: number) {
  return prisma.importedGame.findFirst({
    where: { id: importedGameId, userId },
  });
}

export async function getLatestGameAnalysisForImportedGame(userId: number, importedGameId: number) {
  const run = await prisma.gameAnalysisRun.findFirst({
    where: {
      importedGameId,
      importedGame: { userId },
      status: { in: ['RUNNING', 'COMPLETED', 'FAILED'] },
    },
    orderBy: [
      { createdAt: 'desc' },
      { id: 'desc' },
    ],
    include: compactGameAnalysisRunInclude,
  });
  return run ? decodeCompactRun(run) : null;
}

export async function createClientGameAnalysisRun(data: {
  importedGameId: number;
  positionsDone: number;
  summary: unknown;
  accuracyVersion: string;
  whiteAccuracy: number | null;
  blackAccuracy: number | null;
  whiteAverageCentipawnLoss: number | null;
  blackAverageCentipawnLoss: number | null;
  whiteMovesAnalyzed: number;
  blackMovesAnalyzed: number;
}) {
  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<Array<{ id: number }>>(Prisma.sql`
      SELECT "id"
      FROM "ImportedGame"
      WHERE "id" = ${data.importedGameId}
      FOR UPDATE
    `);
    if (!locked[0]) throw new Error('Imported game not found');

    const existing = await tx.gameAnalysisRun.findFirst({
      where: {
        importedGameId: data.importedGameId,
        status: 'COMPLETED',
        positionsTotal: data.positionsDone,
        positionsDone: data.positionsDone,
      },
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
      include: compactGameAnalysisRunInclude,
    });
    if (existing) return { run: decodeCompactRun(existing), reusedExisting: true };

    const completedAt = new Date();
    const run = await tx.gameAnalysisRun.create({
      data: {
        importedGameId: data.importedGameId,
        status: 'COMPLETED',
        positionsTotal: data.positionsDone,
        positionsDone: data.positionsDone,
        summary: data.summary as any,
        accuracyVersion: data.accuracyVersion,
        whiteAccuracy: data.whiteAccuracy,
        blackAccuracy: data.blackAccuracy,
        whiteAverageCentipawnLoss: data.whiteAverageCentipawnLoss,
        blackAverageCentipawnLoss: data.blackAverageCentipawnLoss,
        whiteMovesAnalyzed: data.whiteMovesAnalyzed,
        blackMovesAnalyzed: data.blackMovesAnalyzed,
        completedAt,
      },
      include: compactGameAnalysisRunInclude,
    });
    await updateImportedGameLatestAnalysisSnapshot(tx, data.importedGameId, run);
    await recordCompletedGameAnalysisActivity(tx, data.importedGameId, completedAt);
    return { run: decodeCompactRun(run), reusedExisting: false };
  });
}

export async function createRunningGameAnalysisRun(data: {
  importedGameId: number;
  positionsTotal: number;
  positionsDone?: number;
}) {
  return prisma.$transaction(async (tx) => {
    const run = await tx.gameAnalysisRun.create({
      data: {
        importedGameId: data.importedGameId,
        status: 'RUNNING',
        positionsTotal: data.positionsTotal,
        positionsDone: data.positionsDone ?? 0,
      },
      include: compactGameAnalysisRunInclude,
    });
    await updateImportedGameLatestAnalysisSnapshot(tx, data.importedGameId, run);
    return decodeCompactRun(run);
  });
}

export async function updateGameAnalysisRunProgress(
  runId: number,
  data: {
    positionsDone: number;
    positionsTotal?: number;
  },
) {
  return prisma.gameAnalysisRun.update({
    where: { id: runId },
    data: {
      positionsDone: data.positionsDone,
      ...(typeof data.positionsTotal === 'number' ? { positionsTotal: data.positionsTotal } : {}),
    },
  });
}

export async function completeGameAnalysisRun(
  runId: number,
  data: {
    positionsTotal: number;
    positionsDone: number;
    summary: unknown;
    accuracyVersion: string;
    whiteAccuracy: number | null;
    blackAccuracy: number | null;
    whiteAverageCentipawnLoss: number | null;
    blackAverageCentipawnLoss: number | null;
    whiteMovesAnalyzed: number;
    blackMovesAnalyzed: number;
  },
) {
  return prisma.$transaction(async (tx) => {
    const completedAt = new Date();
    const transitioned = await tx.gameAnalysisRun.updateMany({
      where: { id: runId, status: 'RUNNING' },
      data: {
        status: 'COMPLETED',
        positionsTotal: data.positionsTotal,
        positionsDone: data.positionsDone,
        summary: data.summary as any,
        accuracyVersion: data.accuracyVersion,
        whiteAccuracy: data.whiteAccuracy,
        blackAccuracy: data.blackAccuracy,
        whiteAverageCentipawnLoss: data.whiteAverageCentipawnLoss,
        blackAverageCentipawnLoss: data.blackAverageCentipawnLoss,
        whiteMovesAnalyzed: data.whiteMovesAnalyzed,
        blackMovesAnalyzed: data.blackMovesAnalyzed,
        error: null,
        completedAt,
      },
    });
    const run = await tx.gameAnalysisRun.findUnique({
      where: { id: runId },
      include: compactGameAnalysisRunInclude,
    });
    if (!run) throw new Error('Game analysis run not found');
    if (transitioned.count === 0) {
      if (run.status === 'COMPLETED') return decodeCompactRun(run);
      throw new Error('Game analysis run is not running');
    }

    await updateImportedGameLatestAnalysisSnapshot(tx, run.importedGameId, run);
    await recordCompletedGameAnalysisActivity(tx, run.importedGameId, completedAt);
    return decodeCompactRun(run);
  });
}

export async function failGameAnalysisRun(runId: number, error: string) {
  return prisma.$transaction(async (tx) => {
    const run = await tx.gameAnalysisRun.update({
      where: { id: runId },
      data: {
        status: 'FAILED',
        error,
        completedAt: new Date(),
      },
      include: compactGameAnalysisRunInclude,
    });
    await updateImportedGameLatestAnalysisSnapshot(tx, run.importedGameId, run);
    return decodeCompactRun(run);
  });
}

export async function updateImportedGamePlyAnalysis(userId: number, gameId: number, updates: PlyAnalysisUpdate[]) {
  const game = await prisma.importedGame.findFirst({
    where: { id: gameId, userId },
    select: { id: true },
  });
  if (!game) throw new Error('Imported game not found');

  const dedupedUpdates = dedupePlyAnalysisUpdates(updates);
  const updatedRows = dedupedUpdates.length
    ? await prisma.$queryRaw<Array<{ plyNumber: number }>>(Prisma.sql`
        WITH payload AS (
          SELECT *
          FROM unnest(
            ARRAY[${Prisma.join(dedupedUpdates.map((update) => Prisma.sql`${update.plyNumber}`))}]::smallint[],
            ARRAY[${Prisma.join(dedupedUpdates.map((update) => Prisma.sql`${update.scoreLossCp}`))}]::smallint[],
            ARRAY[${Prisma.join(dedupedUpdates.map((update) => Prisma.sql`${update.classificationCode}`))}]::smallint[]
          ) AS input("plyNumber", "scoreLossCp", "classificationCode")
        )
        UPDATE "ImportedGamePly" AS ply
        SET
          "scoreLossCp" = payload."scoreLossCp",
          "classificationCode" = payload."classificationCode"
        FROM payload
        WHERE ply."importedGameId" = ${gameId}
          AND ply."plyNumber" = payload."plyNumber"
        RETURNING ply."plyNumber"
      `)
    : [];

  return { importedGameId: gameId, updatedPlies: updatedRows.length };
}

export async function clearImportedGamePlyAnalysis(userId: number, gameId: number) {
  return prisma.$transaction(async (tx) => {
    const game = await tx.importedGame.findFirst({
      where: { id: gameId, userId },
      select: { id: true },
    });
    if (!game) throw new Error('Imported game not found');

    const result = await tx.importedGamePly.updateMany({
      where: { importedGameId: gameId },
      data: { scoreLossCp: null, classificationCode: null },
    });

    return { importedGameId: gameId, clearedPlies: result.count };
  });
}

export async function getImportedGamePliesForAnalysisSummary(userId: number, gameId: number) {
  const rows = await prisma.importedGamePly.findMany({
    where: { importedGameId: gameId, importedGame: { userId } },
    orderBy: { plyNumber: 'asc' },
    select: {
      plyNumber: true,
      moveCode: true,
      scoreLossCp: true,
      classificationCode: true,
      position: {
        select: {
          analysis: {
            select: {
              id: true,
              bestMoveUci: true,
              bestScoreCpWhite: true,
              bestMateWhite: true,
              lines: true,
            },
          },
        },
      },
    },
  });
  return rows.map(({ moveCode, ...ply }) => ({ ...ply, moveUci: decodeUciMove(moveCode) }));
}

export async function getImportedGamePliesForBatchAnalysis(userId: number, gameId: number) {
  const rows = await prisma.importedGamePly.findMany({
    where: { importedGameId: gameId, importedGame: { userId } },
    orderBy: { plyNumber: 'asc' },
    select: {
      plyNumber: true,
      moveCode: true,
      scoreLossCp: true,
      classificationCode: true,
      positionId: true,
      position: {
        select: {
          ...positionIdentitySelect,
          analysis: {
            select: {
              id: true,
              positionId: true,
              bestMoveUci: true,
              bestScoreCpWhite: true,
              bestMateWhite: true,
              lines: true,
              position: {
                select: {
                  ...positionIdentitySelect,
                },
              },
            },
          },
        },
      },
    },
  });
  return rows.map(({ moveCode, ...ply }) => ({
    ...ply,
    moveUci: decodeUciMove(moveCode),
    position: {
      ...hydratePositionFen(ply.position),
      analysis: ply.position.analysis ? { ...ply.position.analysis, position: hydratePositionFen(ply.position.analysis.position) } : null,
    },
  }));
}
