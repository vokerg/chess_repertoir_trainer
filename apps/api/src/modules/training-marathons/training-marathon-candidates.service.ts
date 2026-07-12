import prisma from '../../prisma';
import { TrainingService } from '../../services/trainingService';
import {
  TRAINING_MODE_MARATHON,
  TRAINING_MODE_MIXED_WEAK_UNTRAINED,
  TRAINING_MODE_UNTRAINED_SUBLINES,
  TRAINING_MODE_WEAK_SUBLINES,
} from '../training/training.constants';
import {
  getAvailableSublineRows,
  getDerivedLineData,
  getDerivedSelectedLines,
  getWeakSublinePoolFromAttempts,
  DerivedLineData,
  HashedAvailableSublineDto,
  pickRandomSubline,
  SublineScope,
} from '../courses/sublines.service';
import { groupRecentAttempts, loadRecentScoredAttempts, sublineIdentityKey } from '../training/recent-scored-attempts';

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

export async function resolveMarathonCandidates(
  userId: number,
  request: MarathonNextRequest,
): Promise<{ scopeLabel: string; scope: MarathonScope | null; sublines: HashedAvailableSublineDto[]; preparedLines: Map<number, DerivedLineData> }> {
  if (!request.scope && request.lineIds.length === 0 && request.sublineHashes.length === 0) {
    throw new MarathonCandidateError(400, 'Provide a marathon scope, selected line ids, or selected subline hashes.');
  }

  let sublines: HashedAvailableSublineDto[] | null = null;
  let derivedLines: DerivedLineData[] = [];
  const selectedLineIds = [...new Set(request.lineIds)];
  const selectedHashes = new Set(request.sublineHashes);

  if (request.scope) {
    const scopedLines = await getDerivedLineData(userId, request.scope as SublineScope);
    if (scopedLines === null) {
      throw new MarathonCandidateError(404, `${request.scope.type === 'COURSE' ? 'Course' : 'Chapter'} not found.`);
    }
    derivedLines = scopedLines;
    sublines = derivedLines.flatMap((line) => line.sublines);
  }

  if (selectedLineIds.length > 0) {
    let selectedLines: DerivedLineData[];
    if (request.scope) {
      const scopedIds = new Set(derivedLines.map((line) => line.line.id));
      const unresolvedIds = selectedLineIds.filter((id) => !scopedIds.has(id));
      if (unresolvedIds.length > 0) {
        const ownedRows = await loadOwnedSelectedLineRows(userId, unresolvedIds);
        ensureAllSelectedLinesResolved(unresolvedIds, new Set(ownedRows.map((line) => line.id)));
        ensureLinesInsideScope(request.scope, ownedRows);
      }
      selectedLines = derivedLines.filter((line) => selectedLineIds.includes(line.line.id));
    } else {
      selectedLines = await getDerivedSelectedLines(userId, selectedLineIds);
      ensureAllSelectedLinesResolved(selectedLineIds, new Set(selectedLines.map((line) => line.line.id)));
    }

    const selectedLineSet = new Set(selectedLineIds);
    sublines = sublines
      ? sublines.filter((subline) => selectedLineSet.has(subline.lineId))
      : selectedLines.flatMap((line) => line.sublines);
    derivedLines = selectedLines;

    if (sublines.length === 0) {
      throw new MarathonCandidateError(404, 'No trainable sublines found for the selected lines.');
    }
  }

  if (selectedHashes.size > 0) {
    if (!sublines) {
      const ownedLineIds = await prisma.line.findMany({ where: { chapter: { course: { userId } } }, select: { id: true } });
      derivedLines = await getDerivedSelectedLines(userId, ownedLineIds.map((line) => line.id));
      sublines = derivedLines.flatMap((line) => line.sublines);
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

  return { scopeLabel, scope: request.scope ?? null, sublines, preparedLines: new Map(derivedLines.map((line) => [line.line.id, line])) };
}

export async function filterCandidatesByMode(
  userId: number,
  sublines: HashedAvailableSublineDto[],
  mode: MarathonMode,
): Promise<HashedAvailableSublineDto[]> {
  if (mode === 'ALL') return sublines;
  const attempts = groupRecentAttempts(await loadRecentScoredAttempts(
    userId,
    sublines.map(({ lineId, hash }) => ({ lineId, sublineHash: hash })),
  ));
  const weak = getWeakSublinePoolFromAttempts(sublines, attempts);
  if (mode === 'WEAK_SUBLINES') return weak;

  const untrained = sublines.filter((subline) => !attempts.has(sublineIdentityKey({ lineId: subline.lineId, sublineHash: subline.hash })));
  if (mode === 'UNTRAINED_SUBLINES') return untrained;
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
  preparedLine: DerivedLineData,
) {
  const session = await TrainingService.startForPreparedSubline(
    userId,
    preparedLine,
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

function trainingModeForMarathonMode(mode: MarathonMode): string {
  if (mode === 'WEAK_SUBLINES') return TRAINING_MODE_WEAK_SUBLINES;
  if (mode === 'UNTRAINED_SUBLINES') return TRAINING_MODE_UNTRAINED_SUBLINES;
  if (mode === 'MIXED_WEAK_UNTRAINED') return TRAINING_MODE_MIXED_WEAK_UNTRAINED;
  return TRAINING_MODE_MARATHON;
}
