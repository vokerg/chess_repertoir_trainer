import type { TrapPilotRecord } from './trap-pilot.types';
import { TRAP_PILOT_CLASSIC_CANDIDATES } from './trap-pilot.candidates.classics';
import { TRAP_PILOT_CLOSED_FLANK_EXPANSION } from './trap-pilot.candidates.closed-flank.expansion';
import { TRAP_PILOT_GAMBIT_EXPANSION } from './trap-pilot.candidates.gambits.expansion';
import { TRAP_PILOT_MATING_CANDIDATES } from './trap-pilot.candidates.mates';
import { TRAP_PILOT_OPEN_GAME_EXPANSION } from './trap-pilot.candidates.open-games.expansion';
import { TRAP_PILOT_POSITIONAL_CANDIDATES } from './trap-pilot.candidates.positional';

export const TRAP_PILOT_CANDIDATE_RECORDS: readonly TrapPilotRecord[] = [
  ...TRAP_PILOT_MATING_CANDIDATES,
  ...TRAP_PILOT_CLASSIC_CANDIDATES,
  ...TRAP_PILOT_POSITIONAL_CANDIDATES,
  ...TRAP_PILOT_OPEN_GAME_EXPANSION,
  ...TRAP_PILOT_GAMBIT_EXPANSION,
  ...TRAP_PILOT_CLOSED_FLANK_EXPANSION,
];
