import { randomUUID } from 'crypto';
import { DerivedLineData, HashedAvailableSublineDto } from '../courses/sublines.service';
import {
  buildMarathonNextResponse, filterCandidatesByMode, MarathonMode, MarathonNextRequest,
  pickMarathonSubline, resolveMarathonCandidates,
} from './training-marathon-candidates.service';
import { performanceDebug } from '../../utils/performance-debug';

const RUN_TTL_MS = 30 * 60 * 1000;
const MAX_RUNS = 1000;
interface MarathonRun {
  id: string; userId: number; scope: MarathonNextRequest['scope'] | null; mode: MarathonMode;
  candidates: HashedAvailableSublineDto[]; preparedLines: Map<number, DerivedLineData>;
  recentHashes: string[]; createdAt: number; lastAccessedAt: number;
}
const runs = new Map<string, MarathonRun>();

function cleanup(now = Date.now()): void {
  for (const [id, run] of runs) if (now - run.lastAccessedAt > RUN_TTL_MS) runs.delete(id);
  while (runs.size >= MAX_RUNS) runs.delete(runs.keys().next().value as string);
}

export const TrainingMarathonRunService = {
  create: async (userId: number, request: MarathonNextRequest) => {
    cleanup();
    const resolved = await resolveMarathonCandidates(userId, request);
    const candidates = await filterCandidatesByMode(userId, resolved.sublines, request.mode);
    if (candidates.length === 0) return null;
    const now = Date.now();
    const run: MarathonRun = { id: randomUUID(), userId, scope: resolved.scope, mode: request.mode, candidates,
      preparedLines: resolved.preparedLines, recentHashes: [], createdAt: now, lastAccessedAt: now };
    runs.set(run.id, run);
    return { runId: run.id };
  },

  next: async (userId: number, runId: string) => {
    const startedAt = performance.now();
    cleanup();
    const run = runs.get(runId);
    if (!run || run.userId !== userId) return null;
    run.lastAccessedAt = Date.now();
    const subline = pickMarathonSubline(run.candidates, run.recentHashes);
    if (!subline) return null;
    run.recentHashes = [...run.recentHashes.filter((hash) => hash !== subline.hash), subline.hash].slice(-20);
    const preparedLine = run.preparedLines.get(subline.lineId);
    if (!preparedLine) return null;
    const response = await buildMarathonNextResponse(userId, run.scope ?? null, run.mode, subline, preparedLine);
    performanceDebug('training-marathon-run-next', startedAt, { candidates: run.candidates.length });
    return response;
  },

  clearForTests: () => runs.clear(),
};
