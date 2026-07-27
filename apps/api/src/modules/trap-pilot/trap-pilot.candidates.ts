import type { TrapPilotRecord } from './trap-pilot.types';
import { TRAP_PILOT_CLASSIC_CANDIDATES } from './trap-pilot.candidates.classics';
import { TRAP_PILOT_MATING_CANDIDATES } from './trap-pilot.candidates.mates';
import { TRAP_PILOT_POSITIONAL_CANDIDATES } from './trap-pilot.candidates.positional';

export const TRAP_PILOT_CANDIDATE_RECORDS: readonly TrapPilotRecord[] = [
  ...TRAP_PILOT_MATING_CANDIDATES,
  ...TRAP_PILOT_CLASSIC_CANDIDATES,
  ...TRAP_PILOT_POSITIONAL_CANDIDATES,
];
