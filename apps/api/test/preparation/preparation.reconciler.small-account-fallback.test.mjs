import assert from 'node:assert/strict';
import { DEFAULT_PREPARATION_CONFIG } from '../../dist/modules/preparation/preparation.config.js';
import { pickAnalysisTarget } from '../../dist/modules/preparation/preparation-reconciler.service.js';

function target(overrides = {}) {
  return {
    id: 1,
    accountId: 1,
    ordinal: 0,
    currentImportRunId: 1,
    importStatus: 'COMPLETED',
    importWorkKey: null,
    importedCount: 1,
    indexedCount: 1,
    indexPendingCount: 0,
    indexFailedCount: 0,
    analysedCount: 0,
    analysisPendingCount: 1,
    analysisRunningCount: 0,
    analysisFailedCount: 0,
    normalIndexBatches: 1,
    normalAnalysisBatches: 0,
    ...overrides,
  };
}

assert.equal(
  pickAnalysisTarget([target()], DEFAULT_PREPARATION_CONFIG)?.id,
  1,
  'one eligible game uses the quiescent small-account fallback',
);

assert.equal(
  pickAnalysisTarget([
    target({ importedCount: 2, indexedCount: 2, analysisPendingCount: 2 }),
  ], DEFAULT_PREPARATION_CONFIG)?.id,
  1,
  'two eligible games use the quiescent small-account fallback',
);

assert.equal(
  pickAnalysisTarget([
    target({
      importedCount: 10,
      indexedCount: 2,
      indexFailedCount: 8,
      analysisPendingCount: 2,
    }),
  ], DEFAULT_PREPARATION_CONFIG),
  null,
  'a larger account cannot masquerade as small merely because fewer than three indexed games remain analysable',
);

assert.equal(
  pickAnalysisTarget([
    target({
      importedCount: 10,
      indexedCount: 3,
      indexFailedCount: 7,
      analysisPendingCount: 3,
    }),
  ], DEFAULT_PREPARATION_CONFIG)?.id,
  1,
  'a larger account still enters the normal first-analysis lane at the configured threshold',
);

assert.equal(
  pickAnalysisTarget([
    target({
      importedCount: 10,
      indexedCount: 2,
      indexFailedCount: 8,
      analysisPendingCount: 1,
      normalAnalysisBatches: 1,
    }),
  ], DEFAULT_PREPARATION_CONFIG)?.id,
  1,
  'after first analysis, the analysis tail may continue from remaining indexed evidence regardless of account size',
);

console.log('Preparation small-account first-analysis fallback tests passed.');
