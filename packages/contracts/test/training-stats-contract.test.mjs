import assert from 'node:assert/strict';
import {
  activeTrainingStatsSchema,
  sublineTrainingStatusSchema,
  trainingStatsSummarySchema,
} from '../dist/training/index.js';

const weakestSubline = {
  hash: 'line-7:subline-a',
  lineId: 7,
  lineName: 'Open Sicilian',
  chapterId: 3,
  chapterName: 'Sicilian Defence',
  moveText: '1. e4 c5 2. Nf3 d6',
  recentAttempts: 4,
  passedCount: 1,
  failedCount: 3,
  passRate: 0.25,
};

const activeStats = {
  scopeType: 'CHAPTER',
  scopeId: 3,
  activeSublineCount: 6,
  trainedSublineCount: 4,
  untrainedSublineCount: 2,
  weakSublineCount: 1,
  statsWindowSize: 5,
  totalAttempts: 14,
  passedCount: 9,
  failedCount: 5,
  passRate: 0.7,
  failureRate: 0.3,
  attemptPassRate: 9 / 14,
  status: 'STABLE',
  weakestSublines: [weakestSubline],
};

assert.deepEqual(activeTrainingStatsSchema.parse(activeStats), activeStats);
assert.equal(
  activeTrainingStatsSchema.safeParse({ ...activeStats, passRate: 1.1 }).success,
  false,
  'aggregate pass rate must stay within the wire-level probability range',
);

const sublineStatus = {
  ...weakestSubline,
  canonicalKeyVersion: 1,
  leafNodeId: 42,
  passRate: null,
  recentAttempts: 0,
  passedCount: 0,
  failedCount: 0,
  status: 'NEW',
};

assert.deepEqual(sublineTrainingStatusSchema.parse(sublineStatus), sublineStatus);

const summary = {
  totalCourses: 2,
  totalLines: 8,
  totalTrainingSessions: 31,
  weakestSublines: [weakestSubline],
  weakestLines: [{ id: 7, name: 'Open Sicilian', failureRate: 0.75 }],
};

assert.deepEqual(trainingStatsSummarySchema.parse(summary), summary);
assert.equal(
  trainingStatsSummarySchema.safeParse({ ...summary, totalTrainingSessions: -1 }).success,
  false,
  'aggregate counts cannot be negative',
);

console.log('Training statistics contract tests passed.');
