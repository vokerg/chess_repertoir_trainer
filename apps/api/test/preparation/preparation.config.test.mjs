import assert from 'node:assert/strict';
import {
  DEFAULT_PREPARATION_CONFIG,
  readPreparationConfig,
} from '../../dist/modules/preparation/preparation.config.js';

assert.deepEqual(
  readPreparationConfig({}),
  DEFAULT_PREPARATION_CONFIG,
  'empty environment preserves the validated preparation defaults',
);

assert.throws(
  () => readPreparationConfig({
    PREPARATION_FIRST_ANALYSIS_MIN_INDEXED: '3',
    PREPARATION_FIRST_ANALYSIS_SMALL_ACCOUNT_FALLBACK: '3',
  }),
  /SMALL_ACCOUNT_FALLBACK must be less than PREPARATION_FIRST_ANALYSIS_MIN_INDEXED/,
  'fallback remains a distinct below-threshold path',
);

assert.throws(
  () => readPreparationConfig({
    PREPARATION_FIRST_ANALYSIS_BATCH_SIZE: '1',
    PREPARATION_FIRST_ANALYSIS_MIN_INDEXED: '3',
    PREPARATION_FIRST_ANALYSIS_SMALL_ACCOUNT_FALLBACK: '2',
  }),
  /SMALL_ACCOUNT_FALLBACK must not exceed PREPARATION_FIRST_ANALYSIS_BATCH_SIZE/,
  'fallback cannot request more tasks than the FIRST_ANALYSIS lane can admit',
);

console.log('Preparation configuration tests passed.');
