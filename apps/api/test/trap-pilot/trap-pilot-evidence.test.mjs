import assert from 'node:assert/strict';
import { TRAP_PILOT_DATASET } from '../../dist/modules/trap-pilot/trap-pilot.data.js';
import { TRAP_PILOT_EVIDENCE_BUNDLE } from '../../dist/modules/trap-pilot/trap-pilot.evidence.generated.js';
import {
  hashTrapPilotEvidence,
  withEngineEvidenceHash,
} from '../../dist/modules/trap-pilot/trap-pilot.evidence.js';
import { validateTrapPilotEvidenceBundle } from '../../dist/modules/trap-pilot/trap-pilot.evidence.validator.js';
import { deriveTrapOccurrenceIdentity } from '../../dist/modules/trap-pilot/trap-pilot.validator.js';

{
  const report = validateTrapPilotEvidenceBundle(TRAP_PILOT_DATASET, TRAP_PILOT_EVIDENCE_BUNDLE);
  assert.equal(report.valid, true);
  assert.equal(report.errorCount, 0);
}

{
  assert.equal(
    hashTrapPilotEvidence({ beta: 2, alpha: { zeta: 3, eta: 4 } }),
    hashTrapPilotEvidence({ alpha: { eta: 4, zeta: 3 }, beta: 2 }),
  );
}

const record = TRAP_PILOT_DATASET.records[0];
const engineSnapshot = withEngineEvidenceHash({
  recordId: record.id,
  occurrenceIdentity: deriveTrapOccurrenceIdentity(record),
  profile: {
    id: 'trap-pilot-stockfish',
    version: 'depth-24-multipv-3-v1',
    engine: 'wasm',
    engineVersion: 'fixture',
    depth: 24,
    multipv: 3,
  },
  capturedAt: '2026-07-27T00:00:00.000Z',
  targets: [
    {
      role: 'TRIGGER',
      referenceId: 'trigger',
      fen: `${record.trigger.normalizedFen} 0 1`,
      bestMoveUci: null,
      bestScoreCpWhite: null,
      bestMateWhite: null,
      lines: [],
    },
  ],
});

{
  const bundle = {
    ...structuredClone(TRAP_PILOT_EVIDENCE_BUNDLE),
    engineSnapshots: [engineSnapshot],
  };
  const report = validateTrapPilotEvidenceBundle(TRAP_PILOT_DATASET, bundle);
  assert.equal(report.valid, true);
  assert.ok(report.issues.some((issue) => issue.code === 'UNREFERENCED_ENGINE_SNAPSHOT'));
}

{
  const tampered = structuredClone(engineSnapshot);
  tampered.profile.depth = 25;
  const bundle = {
    ...structuredClone(TRAP_PILOT_EVIDENCE_BUNDLE),
    engineSnapshots: [tampered],
  };
  const report = validateTrapPilotEvidenceBundle(TRAP_PILOT_DATASET, bundle);
  assert.equal(report.valid, false);
  assert.ok(report.issues.some((issue) => issue.code === 'INVALID_ENGINE_EVIDENCE_HASH'));
}

{
  const bundle = {
    ...structuredClone(TRAP_PILOT_EVIDENCE_BUNDLE),
    datasetVersion: 'stale-dataset-version',
  };
  const report = validateTrapPilotEvidenceBundle(TRAP_PILOT_DATASET, bundle);
  assert.equal(report.valid, false);
  assert.ok(report.issues.some((issue) => issue.code === 'EVIDENCE_DATASET_VERSION_MISMATCH'));
}
