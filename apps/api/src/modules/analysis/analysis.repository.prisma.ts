import { Prisma } from '@prisma/client';
import { normalizeFenForPosition } from 'chess-domain';
import prisma from '../../prisma';
import {
  assertPositionKeyMatchesFen,
  positionKeyForNormalizedFen,
  positionKeyHex,
} from '../positions/position-key';
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
      normalizedFen: true,
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
          moveUci: true,
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

function compactPositionAnalysis(row: any, fromCache = true) {
  return {
    id: row.id,
    positionId: row.positionId,
    normalizedFen: row.position?.normalizedFen ?? '',
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
  const positionKey = positionKeyForNormalizedFen(normalizedFen);
  const persistenceMode = input.persistenceMode ?? 'rich';
  const normalizedLines = normalizeStoredEngineLines(input.lines);
  const linesToPersist = persistenceMode === 'compact' ? null : normalizedLines;

  return {
    input,
    normalizedFen,
    positionKey,
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
  const byPositionKey = new Map<string, ReturnType<typeof normalizedPositionAnalysisInput>>();

  for (const input of inputs) {
    const normalized = normalizedPositionAnalysisInput(input);
    byPositionKey.set(positionKeyHex(normalized.positionKey), normalized);
  }

  return Array.from(byPositionKey.values());
}

export async function findOrCreatePositionByNormalizedFen(normalizedFen: string) {
  const positionKey = positionKeyForNormalizedFen(normalizedFen);

  try {
    return await prisma.position.create({
      data: { normalizedFen, positionKey: new Uint8Array(positionKey) },
    });
  } catch {
    const byKey = await prisma.position.findUnique({
      where: { positionKey: new Uint8Array(positionKey) },
    });

    if (byKey) {
      assertPositionKeyMatchesFen({
        expectedNormalizedFen: normalizedFen,
        actualNormalizedFen: byKey.normalizedFen,
        positionKey,
      });

      return byKey;
    }

    const byFen = await prisma.position.findFirst({
      where: { normalizedFen },
    });

    if (byFen) {
      if (!byFen.positionKey) {
        return prisma.position.update({
          where: { id: byFen.id },
          data: { positionKey: new Uint8Array(positionKey) },
        });
      }

      assertPositionKeyMatchesFen({
        expectedNormalizedFen: normalizedFen,
        actualNormalizedFen: byFen.normalizedFen,
        positionKey: byFen.positionKey,
      });

      return byFen;
    }

    throw new Error('Could not create or find position');
  }
}

export async function findOrCreatePositionByFen(fen: string) {
  return findOrCreatePositionByNormalizedFen(normalizeFenForPosition(fen));
}

export async function getPositionAnalysisByFen(fen: string) {
  const normalizedFen = normalizeFenForPosition(fen);
  const positionKey = positionKeyForNormalizedFen(normalizedFen);

  const row = await prisma.positionAnalysis.findFirst({
    where: { position: { positionKey: new Uint8Array(positionKey) } },
    include: positionAnalysisInclude,
  });
  return row ? compactPositionAnalysis(row) : null;
}

export async function getPositionAnalysesByFens(fens: string[]) {
  const positionsByKey = new Map<string, Buffer>();

  for (const fen of fens) {
    const normalizedFen = normalizeFenForPosition(fen);
    const positionKey = positionKeyForNormalizedFen(normalizedFen);
    positionsByKey.set(positionKeyHex(positionKey), positionKey);
  }

  const positionKeys = Array.from(positionsByKey.values()).map((positionKey) => new Uint8Array(positionKey));
  if (!positionKeys.length) return [];

  const rows = await prisma.positionAnalysis.findMany({
    where: { position: { positionKey: { in: positionKeys } } },
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
      data: deduped.map(({ normalizedFen, positionKey }) => ({
        normalizedFen,
        positionKey: new Uint8Array(positionKey),
      })),
      skipDuplicates: true,
    });

    const positions = await tx.position.findMany({
      where: {
        positionKey: {
          in: deduped.map(({ positionKey }) => new Uint8Array(positionKey)),
        },
      },
      select: {
        id: true,
        normalizedFen: true,
        positionKey: true,
      },
    });

    const positionsByKey = new Map(positions.map((position) => [positionKeyHex(position.positionKey), position]));
    const upsertRows = deduped.map((item) => {
      const position = positionsByKey.get(positionKeyHex(item.positionKey));
      if (!position) throw new Error('Could not create or find position');

      assertPositionKeyMatchesFen({
        expectedNormalizedFen: item.normalizedFen,
        actualNormalizedFen: position.normalizedFen,
        positionKey: item.positionKey,
      });

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
  return prisma.gameAnalysisRun.findFirst({
    where: {
      importedGameId,
      importedGame: { userId },
      status: { in: ['RUNNING', 'COMPLETED', 'FAILED'] },
    },
    orderBy: { createdAt: 'desc' },
    include: compactGameAnalysisRunInclude,
  });
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
        completedAt: new Date(),
      },
      include: compactGameAnalysisRunInclude,
    });
    await updateImportedGameLatestAnalysisSnapshot(tx, data.importedGameId, run);
    return run;
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
    return run;
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
    const run = await tx.gameAnalysisRun.update({
      where: { id: runId },
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
        completedAt: new Date(),
      },
      include: compactGameAnalysisRunInclude,
    });
    await updateImportedGameLatestAnalysisSnapshot(tx, run.importedGameId, run);
    return run;
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
    return run;
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
  return prisma.importedGamePly.findMany({
    where: { importedGameId: gameId, importedGame: { userId } },
    orderBy: { plyNumber: 'asc' },
    select: {
      plyNumber: true,
      moveUci: true,
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
}

export async function getImportedGamePliesForBatchAnalysis(userId: number, gameId: number) {
  return prisma.importedGamePly.findMany({
    where: { importedGameId: gameId, importedGame: { userId } },
    orderBy: { plyNumber: 'asc' },
    select: {
      plyNumber: true,
      moveUci: true,
      scoreLossCp: true,
      classificationCode: true,
      positionId: true,
      position: {
        select: {
          normalizedFen: true,
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
                  normalizedFen: true,
                },
              },
            },
          },
        },
      },
    },
  });
}
