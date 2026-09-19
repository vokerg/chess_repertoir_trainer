import { describe, expect, it } from 'vitest';
import {
  filterOfflineMarathonCandidates,
  marathonCandidateKey,
  pickOfflineMarathonCandidate,
  rememberMarathonSubline,
  trainingModeForOfflineMarathon,
  type MarathonCandidateAttempt,
} from './offline-marathon-policy';

const candidates = [
  { lineId: 1, sublineHash: 'a' },
  { lineId: 2, sublineHash: 'b' },
  { lineId: 3, sublineHash: 'c' },
  { lineId: 4, sublineHash: 'd' },
];

const attempts: MarathonCandidateAttempt[] = [
  { lineId: 1, sublineHash: 'a', result: 'PASSED', completedAt: '2026-07-13T10:00:00.000Z' },
  { lineId: 2, sublineHash: 'b', result: 'FAILED', completedAt: '2026-07-13T10:01:00.000Z' },
  { lineId: 2, sublineHash: 'b', result: 'PASSED', completedAt: '2026-07-13T10:02:00.000Z' },
];

describe('offline marathon candidate policy', () => {
  it('keeps all candidates for ALL mode and maps server-compatible training modes', () => {
    expect(filterOfflineMarathonCandidates(candidates, attempts, 'ALL')).toEqual(candidates);
    expect(trainingModeForOfflineMarathon('ALL')).toBe('MARATHON');
    expect(trainingModeForOfflineMarathon('WEAK_SUBLINES')).toBe('WEAK_SUBLINES');
  });

  it('uses recent pass rate and attempt count for the weak pool', () => {
    expect(filterOfflineMarathonCandidates(candidates, attempts, 'WEAK_SUBLINES')).toEqual([
      { lineId: 3, sublineHash: 'c' },
      { lineId: 4, sublineHash: 'd' },
    ]);
  });

  it('serves untrained candidates once per run', () => {
    const served = new Set([marathonCandidateKey(candidates[2]!) ]);
    expect(filterOfflineMarathonCandidates(candidates, attempts, 'UNTRAINED_SUBLINES', served)).toEqual([
      { lineId: 4, sublineHash: 'd' },
    ]);
    expect(filterOfflineMarathonCandidates(candidates, attempts, 'MIXED_WEAK_UNTRAINED', served)).toEqual([
      { lineId: 4, sublineHash: 'd' },
    ]);
  });

  it('avoids recent sublines until the pool is exhausted', () => {
    const recent = [marathonCandidateKey(candidates[0]!)];
    expect(pickOfflineMarathonCandidate(candidates.slice(0, 2), recent, () => 0)).toEqual(candidates[1]);
    expect(pickOfflineMarathonCandidate([candidates[0]!], recent, () => 0)).toEqual(candidates[0]);
    expect(rememberMarathonSubline(recent, candidates[1]!)).toEqual([
      marathonCandidateKey(candidates[0]!),
      marathonCandidateKey(candidates[1]!),
    ]);
  });
});
