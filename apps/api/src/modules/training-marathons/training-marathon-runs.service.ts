import { randomUUID } from 'crypto';
import { DerivedLineData, getWeakSublinePoolFromAttempts, HashedAvailableSublineDto } from '../courses/sublines.service';
import {
  buildMarathonNextResponse, filterCandidatesByMode, MarathonMode, MarathonNextRequest,
  pickMarathonSubline, resolveMarathonCandidates,
} from './training-marathon-candidates.service';
import { performanceDebug } from '../../utils/performance-debug';
import { groupRecentAttempts, loadRecentScoredAttempts, sublineIdentityKey } from '../training/recent-scored-attempts';
import { PreparedLineStaleError } from '../../services/trainingService';

const RUN_TTL_MS = 30 * 60 * 1000;
const MAX_RUNS = 1000;
interface MarathonRun {
  id: string; userId: number; scope: MarathonNextRequest['scope'] | null; mode: MarathonMode;
  candidates: HashedAvailableSublineDto[]; preparedLines: Map<number, DerivedLineData>;
  preparedSublines: HashedAvailableSublineDto[]; recentHashes: string[]; servedUntrainedKeys: Set<string>;
  createdAt: number; lastAccessedAt: number;
}
const runs = new Map<string, MarathonRun>();

function removeExpiredRuns(now = Date.now()): void {
  for (const [id, run] of runs) if (now - run.lastAccessedAt > RUN_TTL_MS) runs.delete(id);
}

function ensureCapacityForNewRun(): void {
  while (runs.size >= MAX_RUNS) runs.delete(runs.keys().next().value as string);
}

function key(subline: HashedAvailableSublineDto): string {
  return sublineIdentityKey({ lineId: subline.lineId, sublineHash: subline.hash });
}

async function refreshStatusCandidates(run: MarathonRun): Promise<HashedAvailableSublineDto[]> {
  const attempts = groupRecentAttempts(await loadRecentScoredAttempts(
    run.userId,
    run.preparedSublines.map(({ lineId, hash }) => ({ lineId, sublineHash: hash })),
  ));
  const weak = getWeakSublinePoolFromAttempts(run.preparedSublines, attempts);
  if (run.mode === 'WEAK_SUBLINES') return weak;
  const untrained = run.preparedSublines.filter((subline) =>
    !attempts.has(key(subline)) && !run.servedUntrainedKeys.has(key(subline)),
  );
  const combined = new Map<string, HashedAvailableSublineDto>();
  for (const subline of [...weak, ...untrained]) combined.set(key(subline), subline);
  return [...combined.values()];
}

export class MarathonRunStaleError extends Error {}

export const TrainingMarathonRunService = {
  create: async (userId: number, request: MarathonNextRequest) => {
    removeExpiredRuns();
    const resolved = await resolveMarathonCandidates(userId, request);
    const candidates = await filterCandidatesByMode(userId, resolved.sublines, request.mode);
    if (candidates.length === 0) return null;
    const now = Date.now();
    ensureCapacityForNewRun();
    const run: MarathonRun = { id: randomUUID(), userId, scope: resolved.scope, mode: request.mode, candidates,
      preparedLines: resolved.preparedLines, preparedSublines: resolved.sublines, recentHashes: [], servedUntrainedKeys: new Set(),
      createdAt: now, lastAccessedAt: now };
    runs.set(run.id, run);
    return { runId: run.id };
  },

  next: async (userId: number, runId: string) => {
    const startedAt = performance.now();
    removeExpiredRuns();
    const run = runs.get(runId);
    if (!run || run.userId !== userId) return null;
    run.lastAccessedAt = Date.now();
    if (run.mode === 'WEAK_SUBLINES' || run.mode === 'MIXED_WEAK_UNTRAINED') {
      run.candidates = await refreshStatusCandidates(run);
    }
    const subline = pickMarathonSubline(run.candidates, run.recentHashes);
    if (!subline) return null;
    const preparedLine = run.preparedLines.get(subline.lineId);
    if (!preparedLine) return null;
    let response;
    try {
      response = await buildMarathonNextResponse(userId, run.scope ?? null, run.mode, subline, preparedLine);
    } catch (error) {
      if (error instanceof PreparedLineStaleError) {
        runs.delete(runId);
        throw new MarathonRunStaleError('Training marathon run is stale.');
      }
      throw error;
    }
    run.recentHashes = [...run.recentHashes.filter((hash) => hash !== subline.hash), subline.hash].slice(-20);
    if (run.mode === 'UNTRAINED_SUBLINES') {
      run.candidates = run.candidates.filter((candidate) => key(candidate) !== key(subline));
    } else if (run.mode === 'MIXED_WEAK_UNTRAINED') {
      run.servedUntrainedKeys.add(key(subline));
    }
    performanceDebug('training-marathon-run-next', startedAt, { candidates: run.candidates.length });
    return response;
  },

  clearForTests: () => runs.clear(),
  fillToCapacityForTests: (sourceRunId: string) => {
    const source = runs.get(sourceRunId);
    if (!source) throw new Error('Source run not found');
    while (runs.size < MAX_RUNS) {
      const id = `test-${runs.size}`;
      runs.set(id, { ...source, id, recentHashes: [...source.recentHashes], servedUntrainedKeys: new Set(source.servedUntrainedKeys) });
    }
  },
  sizeForTests: () => runs.size,
};
