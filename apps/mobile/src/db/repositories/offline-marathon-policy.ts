export const MARATHON_RECENT_ATTEMPT_LIMIT = 5;
export const WEAK_MARATHON_PERCENTAGE = 0.3;
export const MARATHON_RECENT_SUBLINE_LIMIT = 20;

export type OfflineMarathonMode =
  | 'ALL'
  | 'WEAK_SUBLINES'
  | 'UNTRAINED_SUBLINES'
  | 'MIXED_WEAK_UNTRAINED';

export type OfflineTrainingMode =
  | 'LINE'
  | 'MARATHON'
  | 'WEAK_SUBLINES'
  | 'UNTRAINED_SUBLINES'
  | 'MIXED_WEAK_UNTRAINED';

export type MarathonCandidateIdentity = {
  lineId: number;
  sublineHash: string;
};

export type MarathonCandidateAttempt = MarathonCandidateIdentity & {
  result: 'PASSED' | 'FAILED';
  completedAt: string;
};

export function marathonCandidateKey(candidate: MarathonCandidateIdentity): string {
  return `${candidate.lineId}:${candidate.sublineHash}`;
}

export function trainingModeForOfflineMarathon(mode: OfflineMarathonMode): OfflineTrainingMode {
  if (mode === 'WEAK_SUBLINES') return 'WEAK_SUBLINES';
  if (mode === 'UNTRAINED_SUBLINES') return 'UNTRAINED_SUBLINES';
  if (mode === 'MIXED_WEAK_UNTRAINED') return 'MIXED_WEAK_UNTRAINED';
  return 'MARATHON';
}

export function filterOfflineMarathonCandidates<T extends MarathonCandidateIdentity>(
  candidates: readonly T[],
  attempts: readonly MarathonCandidateAttempt[],
  mode: OfflineMarathonMode,
  servedUntrainedKeys: ReadonlySet<string> = new Set(),
): T[] {
  if (mode === 'ALL') return [...candidates];

  const recentAttempts = groupRecentAttempts(attempts);
  const weak = rankWeakCandidates(candidates, recentAttempts);
  if (mode === 'WEAK_SUBLINES') return weak;

  const untrained = candidates.filter((candidate) => {
    const key = marathonCandidateKey(candidate);
    return !recentAttempts.has(key) && !servedUntrainedKeys.has(key);
  });
  if (mode === 'UNTRAINED_SUBLINES') return untrained;

  const combined = new Map<string, T>();
  for (const candidate of weak) {
    const key = marathonCandidateKey(candidate);
    if (recentAttempts.has(key) || !servedUntrainedKeys.has(key)) combined.set(key, candidate);
  }
  for (const candidate of untrained) combined.set(marathonCandidateKey(candidate), candidate);
  return [...combined.values()];
}

export function pickOfflineMarathonCandidate<T extends MarathonCandidateIdentity>(
  candidates: readonly T[],
  recentSublineKeys: readonly string[],
  random: () => number = Math.random,
): T | null {
  if (candidates.length === 0) return null;
  const recent = new Set(recentSublineKeys);
  const fresh = candidates.filter((candidate) => !recent.has(marathonCandidateKey(candidate)));
  const pool = fresh.length > 0 ? fresh : [...candidates];
  const randomValue = Math.max(0, Math.min(0.999999999999, random()));
  return pool[Math.floor(randomValue * pool.length)] ?? null;
}

export function rememberMarathonSubline(
  recentSublineKeys: readonly string[],
  candidate: MarathonCandidateIdentity,
): string[] {
  const key = marathonCandidateKey(candidate);
  return [...recentSublineKeys.filter((item) => item !== key), key].slice(-MARATHON_RECENT_SUBLINE_LIMIT);
}

function groupRecentAttempts(
  attempts: readonly MarathonCandidateAttempt[],
): Map<string, MarathonCandidateAttempt[]> {
  const sorted = [...attempts].sort((left, right) => right.completedAt.localeCompare(left.completedAt));
  const grouped = new Map<string, MarathonCandidateAttempt[]>();
  for (const attempt of sorted) {
    const key = marathonCandidateKey(attempt);
    const current = grouped.get(key) ?? [];
    if (current.length >= MARATHON_RECENT_ATTEMPT_LIMIT) continue;
    grouped.set(key, [...current, attempt]);
  }
  return grouped;
}

function rankWeakCandidates<T extends MarathonCandidateIdentity>(
  candidates: readonly T[],
  recentAttempts: ReadonlyMap<string, readonly MarathonCandidateAttempt[]>,
): T[] {
  const ranked = candidates.map((candidate) => {
    const attempts = recentAttempts.get(marathonCandidateKey(candidate)) ?? [];
    const passed = attempts.filter((attempt) => attempt.result === 'PASSED').length;
    return {
      candidate,
      passRate: attempts.length > 0 ? passed / attempts.length : 0,
      recentAttempts: attempts.length,
    };
  }).sort((left, right) =>
    left.passRate - right.passRate
    || left.recentAttempts - right.recentAttempts
    || marathonCandidateKey(left.candidate).localeCompare(marathonCandidateKey(right.candidate)),
  );

  const take = Math.max(1, Math.ceil(candidates.length * WEAK_MARATHON_PERCENTAGE));
  return ranked.slice(0, take).map((item) => item.candidate);
}
