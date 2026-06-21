import prisma from '../../prisma';
import { TrainingService } from '../../services/trainingService';
import {
  SCORED_TRAINING_RESULTS,
  TRAINING_MODE_MARATHON,
  TRAINING_MODE_MIXED_WEAK_UNTRAINED,
  TRAINING_MODE_UNTRAINED_SUBLINES,
  TRAINING_MODE_WEAK_SUBLINES,
  TRAINING_STATS_RECENT_ATTEMPTS,
} from '../training/training.constants';
import {
  getAvailableSublineRows,
  getWeakSublinePool,
  HashedAvailableSublineDto,
  pickRandomSubline,
  SublineScope,
} from '../courses/sublines.service';

export type MarathonScope = { type: 'CHAPTER' | 'COURSE'; id: number };
export type MarathonMode = 'ALL' | 'WEAK_SUBLINES' | 'UNTRAINED_SUBLINES' | 'MIXED_WEAK_UNTRAINED';

export interface MarathonNextRequest {
  scope?: MarathonScope;
  mode: MarathonMode;
  lineIds: number[];
  sublineHashes: string[];
  recentSublineHashes: string[];
  recentLineIds: number[];
}

export class MarathonCandidateError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
  }
}

function sublineKey(subline: Pick<HashedAvailableSublineDto, 'lineId' | 'hash'>): string {
  return `${subline.lineId}:${subline.hash}`;
}

async function loadOwnedSelectedLineRows(userId: number, lineIds: number[]) {
  if (lineIds.length === 0) return [];
  return prisma.line.findMany({
    where: { id: { in: lineIds }, chapter: { course: { userId } } },
    select: { id: true, chapterId: true, chapter: { select: { courseId: true } } },
  });
}

function ensureAllSelectedLinesResolved(lineIds: number[], resolvedIds: Set<number>): void {
  const missing = lineIds.filter((id) => !resolvedIds.has(id));
  if (missing.length > 0) {
    throw new MarathonCandidateError(404, 'No valid selected lines found.');
  }
}

function ensureLinesInsideScope(scope: MarathonScope, rows: Awaited<ReturnType<typeof loadOwnedSelectedLineRows>>): void {
  const outside = rows.filter((line) =>
    scope.type === 'CHAPTER' ? line.chapterId !== scope.id : line.chapter.courseId !== scope.id,
  );
  if (outside.length > 0) {
    throw new MarathonCandidateError(400, 'Selected lines are outside the requested marathon scope.');
  }
}

async function loadSelectedLineSublines(userId: number, lineIds: number[]): Promise<HashedAvailableSublineDto[]> {
  const rows = await Promise.all(lineIds.map((lineId) => getAvailableSublineRows(userId, { type: 'LINE', id: lineId })));
  return rows.flatMap((lineRows) => lineRows ?? []);
}

export async function resolveMarathonCandidates(
  userId: number,
  request: MarathonNextRequest,
): Promise<{ scopeLabel: string; scope: MarathonScope | null; sublines: HashedAvailableSublineDto[] }> {
  if (!request.scope && request.lineIds.length === 0 && request.sublineHashes.length === 0) {
    throw new MarathonCandidateError(400, 'Provide a marathon scope, selected line ids, or selected subline hashes.');
  }

  let sublines: HashedAvailableSublineDto[] | null = null;
  const selectedLineIds = [...new Set(request.lineIds)];
  const selectedHashes = new Set(request.sublineHashes);

  if (request.scope) {
    sublines = await getAvailableSublineRows(userId, request.scope as SublineScope);
    if (sublines === null) {
      throw new MarathonCandidateError(404, `${request.scope.type === 'COURSE' ? 'Course' : 'Chapter'} not found.`);
    }
  }

  if (selectedLineIds.length > 0) {
    const rows = await loadOwnedSelectedLineRows(userId, selectedLineIds);
    ensureAllSelectedLinesResolved(selectedLineIds, new Set(rows.map((line) => line.id)));
    if (request.scope) ensureLinesInsideScope(request.scope, rows);

    const selectedLineSet = new Set(selectedLineIds);
    sublines = sublines
      ? sublines.filter((subline) => selectedLineSet.has(subline.lineId))
      : await loadSelectedLineSublines(userId, selectedLineIds);

    if (sublines.length === 0) {
      throw new MarathonCandidateError(404, 'No trainable sublines found for the selected lines.');
    }
  }

  if (selectedHashes.size > 0) {
    if (!sublines) {
      const ownedLineIds = await prisma.line.findMany({
        where: { chapter: { course: { userId } } },
        select: { id: true },
      });
      sublines = await loadSelectedLineSublines(userId, ownedLineIds.map((line) => line.id));
    }
    sublines = sublines.filter((subline) => selectedHashes.has(subline.hash));
    if (sublines.length === 0) {
      throw new MarathonCandidateError(404, 'No trainable sublines found for the selected subline hashes.');
    }
  }

  if (!sublines || sublines.length === 0) {
    throw new MarathonCandidateError(404, 'No trainable sublines found.');
  }

  const scopeLabel = request.scope
    ? request.scope.type.toLowerCase()
    : selectedHashes.size > 0
      ? 'selected sublines'
      : 'selected lines';

  return { scopeLabel, scope: request.scope ?? null, sublines };
}

export async function filterCandidatesByMode(
  userId: number,
  sublines: HashedAvailableSublineDto[],
  mode: MarathonMode,
): Promise<HashedAvailableSublineDto[]> {
  if (mode === 'ALL') return sublines;
  if (mode === 'WEAK_SUBLINES') return getWeakSublinePool(userId, sublines);

  const untrained = await getUntrainedSublinePool(userId, sublines);
  if (mode === 'UNTRAINED_SUBLINES') return untrained;

  const weak = await getWeakSublinePool(userId, sublines);
  const byKey = new Map<string, HashedAvailableSublineDto>();
  for (const subline of [...weak, ...untrained]) byKey.set(sublineKey(subline), subline);
  return [...byKey.values()];
}

export function filterOutRecentSublines(
  sublines: HashedAvailableSublineDto[],
  recentSublineHashes: string[],
): HashedAvailableSublineDto[] {
  const recent = new Set(recentSublineHashes);
  const fresh = sublines.filter((subline) => !recent.has(subline.hash));
  return fresh.length > 0 ? fresh : sublines;
}

export async function buildMarathonNextResponse(
  userId: number,
  scope: MarathonScope | null,
  mode: MarathonMode,
  subline: HashedAvailableSublineDto,
) {
  const session = await TrainingService.startForSubline(
    userId,
    subline,
    trainingModeForMarathonMode(mode),
  );
  return {
    scope,
    mode,
    line: {
      id: subline.lineId,
      name: subline.lineName,
      sideToTrain: subline.lineSideToTrain,
      startingFen: subline.lineStartingFen,
      chapterId: subline.chapterId,
      chapterName: subline.chapterName,
      courseId: subline.courseId,
    },
    subline: {
      hash: subline.hash,
      canonicalKeyVersion: subline.canonicalKeyVersion,
      moveText: subline.moveText,
      leafNodeId: subline.leafNodeId,
      moves: subline.moves,
    },
    session,
  };
}

export function pickMarathonSubline(
  sublines: HashedAvailableSublineDto[],
  recentSublineHashes: string[],
): HashedAvailableSublineDto | null {
  return pickRandomSubline(filterOutRecentSublines(sublines, recentSublineHashes), []);
}

async function getUntrainedSublinePool(
  userId: number,
  sublines: HashedAvailableSublineDto[],
): Promise<HashedAvailableSublineDto[]> {
  if (sublines.length === 0) return [];
  const lineIds = [...new Set(sublines.map((subline) => subline.lineId))];
  const hashes = [...new Set(sublines.map((subline) => subline.hash))];
  const attempts = await prisma.trainingSublineAttempt.findMany({
    where: {
      userId,
      lineId: { in: lineIds },
      sublineHash: { in: hashes },
      result: { in: [...SCORED_TRAINING_RESULTS] },
    },
    orderBy: [{ completedAt: 'desc' }, { startedAt: 'desc' }],
  });

  const recentCounts = new Map<string, number>();
  for (const attempt of attempts) {
    const key = `${attempt.lineId}:${attempt.sublineHash}`;
    const count = recentCounts.get(key) ?? 0;
    if (count < TRAINING_STATS_RECENT_ATTEMPTS) recentCounts.set(key, count + 1);
  }

  return sublines.filter((subline) => !recentCounts.has(sublineKey(subline)));
}

function trainingModeForMarathonMode(mode: MarathonMode): string {
  if (mode === 'WEAK_SUBLINES') return TRAINING_MODE_WEAK_SUBLINES;
  if (mode === 'UNTRAINED_SUBLINES') return TRAINING_MODE_UNTRAINED_SUBLINES;
  if (mode === 'MIXED_WEAK_UNTRAINED') return TRAINING_MODE_MIXED_WEAK_UNTRAINED;
  return TRAINING_MODE_MARATHON;
}
