import { randomUUID } from 'crypto';
import { DerivedLineData, getWeakSublinePoolFromAttempts, HashedAvailableSublineDto } from '../courses/sublines.service';
import {
  buildMarathonNextResponse, filterCandidatesByMode, MarathonMode, MarathonNextRequest,
  MarathonScope, pickMarathonSubline, resolveMarathonCandidates,
} from './training-marathon-candidates.service';
import { performanceDebug } from '../../utils/performance-debug';
import { groupRecentAttempts, loadRecentScoredAttempts, sublineIdentityKey } from '../training/recent-scored-attempts';
import { PreparedLineStaleError } from '../../services/trainingService';
import prisma from '../../prisma';
import type { MarathonItemKind } from './training-marathon-candidates.service';

const RUN_TTL_MS = 30 * 60 * 1000;
const MAX_RUNS = 1000;
interface MarathonRun {
  id: string; userId: number; scope: MarathonScope | null; mode: MarathonMode;
  candidates: HashedAvailableSublineDto[]; preparedLines: Map<number, DerivedLineData>;
  preparedSublines: HashedAvailableSublineDto[]; recentHashes: string[]; servedUntrainedKeys: Set<string>;
  retryQueue: HashedAvailableSublineDto[];
  activeReview: { sessionId: number; subline: HashedAvailableSublineDto; itemKind: MarathonItemKind } | null;
  completedCount: number;
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
  const eligibleWeak = weak.filter((subline) =>
    attempts.has(key(subline)) || !run.servedUntrainedKeys.has(key(subline)),
  );
  const combined = new Map<string, HashedAvailableSublineDto>();
  for (const subline of [...eligibleWeak, ...untrained]) combined.set(key(subline), subline);
  return [...combined.values()];
}

export class MarathonRunStaleError extends Error {}
export class MarathonRunActiveSessionError extends Error {}

async function reconcileDailyReview(run: MarathonRun): Promise<void> {
  const active = run.activeReview;
  if (!active) return;
  const session = await prisma.trainingSession.findFirst({ where: { id: active.sessionId, userId: run.userId }, select: { result: true } });
  if (!session) throw new MarathonRunStaleError('Daily Review training session was not found.');
  if (session.result === 'IN_PROGRESS') throw new MarathonRunActiveSessionError('Finish the current Daily Review item before requesting another.');
  if (active.itemKind === 'SCHEDULED_REVIEW') {
    run.completedCount += 1;
    if (session.result === 'FAILED' && !run.retryQueue.some((candidate) => key(candidate) === key(active.subline))) {
      run.retryQueue.push(active.subline);
    }
  }
  run.activeReview = null;
}

export const TrainingMarathonRunService = {
  create: async (userId: number, request: MarathonNextRequest, reviewNow = new Date()) => {
    removeExpiredRuns();
    const resolved = await resolveMarathonCandidates(userId, request);
    const candidates = await filterCandidatesByMode(userId, resolved.sublines, request.mode, reviewNow);
    if (candidates.length === 0 && request.mode !== 'DAILY_REVIEW') return null;
    const now = Date.now();
    ensureCapacityForNewRun();
    const run: MarathonRun = { id: randomUUID(), userId, scope: resolved.scope, mode: request.mode, candidates,
      preparedLines: resolved.preparedLines, preparedSublines: resolved.sublines, recentHashes: [], servedUntrainedKeys: new Set(),
      retryQueue: [], activeReview: null, completedCount: 0,
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
    if (run.mode === 'DAILY_REVIEW') await reconcileDailyReview(run);
    if (run.mode === 'WEAK_SUBLINES' || run.mode === 'MIXED_WEAK_UNTRAINED') {
      run.candidates = await refreshStatusCandidates(run);
    }
    const itemKind: MarathonItemKind = run.mode === 'DAILY_REVIEW'
      ? (run.candidates.length > 0 ? 'SCHEDULED_REVIEW' : 'REINFORCEMENT_RETRY')
      : 'STANDARD';
    const subline = run.mode === 'DAILY_REVIEW' && itemKind === 'REINFORCEMENT_RETRY'
      ? run.retryQueue[0] ?? null
      : pickMarathonSubline(run.candidates, run.recentHashes);
    if (!subline) {
      if (run.mode === 'DAILY_REVIEW') return { state: 'COMPLETED' as const, mode: 'DAILY_REVIEW' as const, scope: run.scope, completedCount: run.completedCount };
      return null;
    }
    const preparedLine = run.preparedLines.get(subline.lineId);
    if (!preparedLine) return null;
    let response;
    try {
      response = await buildMarathonNextResponse(userId, run.scope ?? null, run.mode, subline, preparedLine, itemKind);
    } catch (error) {
      if (error instanceof PreparedLineStaleError) {
        runs.delete(runId);
        throw new MarathonRunStaleError('Training marathon run is stale.');
      }
      throw error;
    }
    run.recentHashes = [...run.recentHashes.filter((hash) => hash !== subline.hash), subline.hash].slice(-20);
    if (run.mode === 'DAILY_REVIEW') {
      if (itemKind === 'SCHEDULED_REVIEW') run.candidates = run.candidates.filter((candidate) => key(candidate) !== key(subline));
      else run.retryQueue = run.retryQueue.slice(1);
      run.activeReview = { sessionId: response.session.sessionId, subline, itemKind };
    } else if (run.mode === 'UNTRAINED_SUBLINES') {
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
      runs.set(id, { ...source, id, recentHashes: [...source.recentHashes], servedUntrainedKeys: new Set(source.servedUntrainedKeys),
        retryQueue: [...source.retryQueue], activeReview: source.activeReview ? { ...source.activeReview } : null });
    }
  },
  sizeForTests: () => runs.size,
};
