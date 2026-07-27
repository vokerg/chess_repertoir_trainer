import assert from 'node:assert/strict';
import { TRAP_PILOT_DATASET } from '../../dist/modules/trap-pilot/trap-pilot.data.js';
import { TRAP_PILOT_EVIDENCE_BUNDLE } from '../../dist/modules/trap-pilot/trap-pilot.evidence.generated.js';
import { withEngineEvidenceHash } from '../../dist/modules/trap-pilot/trap-pilot.evidence.js';
import { buildTrapPilotReviewReport } from '../../dist/modules/trap-pilot/trap-pilot.review.js';
import { deriveTrapOccurrenceIdentity } from '../../dist/modules/trap-pilot/trap-pilot.validator.js';

{
  const report = buildTrapPilotReviewReport(TRAP_PILOT_DATASET, TRAP_PILOT_EVIDENCE_BUNDLE);
  assert.equal(report.recordCount, 50);
  assert.equal(report.counts.NEEDS_EVIDENCE, 50);
  assert.equal(report.counts.BLOCKED, 0);
  assert.equal(report.counts.APPROVED, 0);
}

{
  const dataset = structuredClone(TRAP_PILOT_DATASET);
  const record = dataset.records[0];
  record.editorial.reviewState = 'DOWNGRADED';
  record.editorial.reviewRationale = 'Fixture evidence contradicts the original folklore classification.';
  const report = buildTrapPilotReviewReport(dataset, TRAP_PILOT_EVIDENCE_BUNDLE);
  assert.equal(report.records[0].disposition, 'DOWNGRADED');
}

{
  const record = TRAP_PILOT_DATASET.records[0];
  const generatedEngine = withEngineEvidenceHash({
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
        lines: [],
      },
    ],
  });
  const bundle = {
    ...structuredClone(TRAP_PILOT_EVIDENCE_BUNDLE),
    engineSnapshots: [generatedEngine],
  };
  const report = buildTrapPilotReviewReport(TRAP_PILOT_DATASET, bundle);
  assert.equal(report.records[0].disposition, 'EVIDENCE_READY_FOR_REVIEW');
}

{
  const dataset = structuredClone(TRAP_PILOT_DATASET);
  dataset.records[0].trigger.setupRoutes[0].movesUci = ['e2e5'];
  const report = buildTrapPilotReviewReport(dataset, TRAP_PILOT_EVIDENCE_BUNDLE);
  assert.equal(report.records[0].disposition, 'BLOCKED');
}
