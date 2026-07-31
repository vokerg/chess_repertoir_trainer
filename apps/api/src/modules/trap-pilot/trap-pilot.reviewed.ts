import { TRAP_PILOT_DATASET } from './trap-pilot.data';
import { TRAP_PILOT_EVIDENCE_BUNDLE } from './trap-pilot.evidence.generated';
import type { TrapPilotDataset } from './trap-pilot.types';

export const TRAP_PILOT_REVIEWED_DATASET: TrapPilotDataset = {
  ...TRAP_PILOT_DATASET,
  records: TRAP_PILOT_DATASET.records,
};
