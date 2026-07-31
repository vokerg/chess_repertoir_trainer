import { TRAP_PILOT_DATASET } from './trap-pilot.data';
import { TRAP_PILOT_EVIDENCE_BUNDLE } from './trap-pilot.evidence.generated';
import { TRAP_PILOT_EDITORIAL_DECISIONS } from './trap-pilot.review-decisions';
import type {
  TrapEvidenceMarker,
  TrapPilotDataset,
  TrapPilotRecord,
} from './trap-pilot.types';

function marker(snapshot: {
  profile: { id: string; version: string };
  capturedAt: string;
  payloadHash: string;
}): TrapEvidenceMarker {
  return {
    status: 'AVAILABLE',
    profile: { id: snapshot.profile.id, version: snapshot.profile.version },
    capturedAt: snapshot.capturedAt,
    payloadHash: snapshot.payloadHash,
  };
}

function review(record: TrapPilotRecord): TrapPilotRecord {
  const engine = TRAP_PILOT_EVIDENCE_BUNDLE.engineSnapshots.find(
    (item) => item.recordId === record.id,
  );
  const population = TRAP_PILOT_EVIDENCE_BUNDLE.populationSnapshots.find(
    (item) => item.recordId === record.id,
  );
  if (!engine || !population) {
    throw new Error(`Record ${record.id} is missing generated evidence.`);
  }
  const evidence = { engine: marker(engine), population: marker(population) };
  const decision = TRAP_PILOT_EDITORIAL_DECISIONS[record.id];
  if (!decision) {
    return {
      ...record,
      editorial: {
        ...record.editorial,
        reviewState: 'READY_FOR_REVIEW',
        reviewRationale: 'Evidence is bound; final editorial review remains open.',
      },
      evidence,
    };
  }
  return {
    ...record,
    lifecycle: decision.lifecycle,
    setupSoundness: decision.setupSoundness,
    editorial: {
      ...record.editorial,
      warnings: decision.warning
        ? [...record.editorial.warnings, decision.warning]
        : record.editorial.warnings,
      reviewState: decision.reviewState,
      reviewRationale: decision.rationale,
    },
    evidence,
  };
}

export const TRAP_PILOT_REVIEWED_DATASET: TrapPilotDataset = {
  ...TRAP_PILOT_DATASET,
  records: TRAP_PILOT_DATASET.records.map(review),
};
