import assert from 'node:assert/strict';
import { isTrainableUserBlunder } from '../../dist/modules/lab/tactical-detections/tactical-detection-policy.js';

assert.equal(
  isTrainableUserBlunder({
    evalBeforeUserCp: 512,
    evalAfterTriggerUserCp: 260,
  }),
  false,
  'winning-to-still-winning drops should not be trainable blunders',
);

assert.equal(
  isTrainableUserBlunder({
    evalBeforeUserCp: 100,
    evalAfterTriggerUserCp: -100,
  }),
  true,
  'a meaningful drop through equality should remain trainable',
);

assert.equal(
  isTrainableUserBlunder({
    evalBeforeUserCp: 350,
    evalAfterTriggerUserCp: 150,
  }),
  true,
  'the practical-position boundary should be inclusive',
);

assert.equal(
  isTrainableUserBlunder({
    evalBeforeUserCp: 100,
    evalAfterTriggerUserCp: 0,
  }),
  false,
  'small eval drops should not be trainable blunders',
);

assert.equal(
  isTrainableUserBlunder({
    evalBeforeUserCp: null,
    evalAfterTriggerUserCp: -300,
  }),
  false,
  'missing evaluations should not produce detections',
);

console.log('Tactical detection policy tests passed.');
