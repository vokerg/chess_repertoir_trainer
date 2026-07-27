import assert from 'node:assert/strict';
import { TRAP_PILOT_DATASET } from '../../dist/modules/trap-pilot/trap-pilot.data.js';
import {
  deriveTrapOccurrenceIdentity,
  validateTrapPilotDataset,
} from '../../dist/modules/trap-pilot/trap-pilot.validator.js';

{
  const report = validateTrapPilotDataset(TRAP_PILOT_DATASET);
  if (!report.valid) console.error(JSON.stringify(report.issues, null, 2));
  assert.equal(report.valid, true);
  assert.equal(report.recordCount, 20);
  assert.equal(report.errorCount, 0);
  assert.ok(report.warningCount > 0);
  assert.equal(report.issues.some((issue) => issue.code === 'PILOT_SIZE_INCOMPLETE'), false);
  assert.ok(report.issues.some((issue) => issue.code === 'ENGINE_EVIDENCE_MISSING'));
  assert.ok(report.issues.some((issue) => issue.code === 'POPULATION_EVIDENCE_MISSING'));

  const identities = report.records.map((record) => record.occurrenceIdentity);
  assert.equal(new Set(identities).size, TRAP_PILOT_DATASET.records.length);
  for (const identity of identities) assert.match(identity, /^[a-f0-9]{64}$/);

  assert.ok(TRAP_PILOT_DATASET.records.some((record) => record.setupSoundness === 'SOUND'));
  assert.ok(TRAP_PILOT_DATASET.records.some((record) => record.setupSoundness === 'PLAYABLE_RISK'));
  assert.ok(TRAP_PILOT_DATASET.records.some((record) => record.setupSoundness === 'DUBIOUS'));
  assert.ok(TRAP_PILOT_DATASET.records.some((record) => record.punishments.some((item) => item.outcome === 'MATE')));
  assert.ok(TRAP_PILOT_DATASET.records.some((record) => record.punishments.some((item) => item.outcome === 'MATERIAL')));
  assert.ok(TRAP_PILOT_DATASET.records.some((record) => record.punishments.some((item) => item.outcome === 'POSITIONAL_BIND')));
}

{
  const malformed = structuredClone(TRAP_PILOT_DATASET);
  malformed.records[0].trigger.setupRoutes[0].movesUci = ['e2e5'];
  const report = validateTrapPilotDataset(malformed);
  assert.equal(report.valid, false);
  assert.ok(report.issues.some((issue) => issue.code === 'ILLEGAL_UCI_MOVE'));
}

{
  const duplicate = structuredClone(TRAP_PILOT_DATASET);
  const copiedRecord = structuredClone(duplicate.records[0]);
  copiedRecord.id = 'legal-trap-duplicate-copy';
  duplicate.records.push(copiedRecord);
  const report = validateTrapPilotDataset(duplicate);
  assert.equal(report.valid, false);
  assert.ok(report.issues.some((issue) => issue.code === 'DUPLICATE_OCCURRENCE_IDENTITY'));
}

{
  const falselyValidated = structuredClone(TRAP_PILOT_DATASET);
  falselyValidated.records[0].lifecycle = 'VALIDATED';
  const report = validateTrapPilotDataset(falselyValidated);
  assert.equal(report.valid, false);
  assert.ok(report.issues.some((issue) => issue.code === 'VALIDATED_RECORD_MISSING_EVIDENCE'));
}

{
  const original = TRAP_PILOT_DATASET.records[0];
  const reorderedAliases = structuredClone(original);
  reorderedAliases.aliases = [...reorderedAliases.aliases].reverse();
  assert.equal(deriveTrapOccurrenceIdentity(original), deriveTrapOccurrenceIdentity(reorderedAliases));
}
