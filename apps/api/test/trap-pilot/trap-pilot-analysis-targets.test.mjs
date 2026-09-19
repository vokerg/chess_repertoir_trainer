import assert from 'node:assert/strict';
import { TRAP_PILOT_DATASET } from '../../dist/modules/trap-pilot/trap-pilot.data.js';
import { deriveTrapEngineAnalysisTargets } from '../../dist/modules/trap-pilot/trap-pilot.analysis-targets.js';

for (const record of TRAP_PILOT_DATASET.records) {
  const targets = deriveTrapEngineAnalysisTargets(record);
  assert.equal(targets[0]?.role, 'TRIGGER');
  assert.equal(
    targets.length,
    1 + record.temptingResponses.length + record.punishments.length + record.safeDefenses.length,
  );
  assert.equal(
    new Set(targets.map((target) => `${target.role}:${target.referenceId}`)).size,
    targets.length,
  );
  for (const target of targets) {
    assert.equal(target.fen.split(/\s+/).length, 6);
  }
}
