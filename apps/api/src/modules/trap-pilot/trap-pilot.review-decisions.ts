import type { TrapPilotRecord, TrapSetupSoundness } from './trap-pilot.types';

export interface TrapPilotEditorialDecision {
  lifecycle: TrapPilotRecord['lifecycle'];
  setupSoundness: TrapSetupSoundness;
  reviewState: TrapPilotRecord['editorial']['reviewState'];
  rationale: string;
  warning?: string;
}

export const TRAP_PILOT_EDITORIAL_DECISIONS: Readonly<Record<string, TrapPilotEditorialDecision>> = {
  'fools-mate-e5-v1': {
    lifecycle: 'VALIDATED',
    setupSoundness: 'SOUND',
    reviewState: 'APPROVED',
    rationale: 'Approved: the retained engine evidence confirms the ordinary setup and forced punishment after the tempting response.',
  },
  'blackburne-shilling-main-bait-v1': {
    lifecycle: 'VALIDATED',
    setupSoundness: 'DUBIOUS',
    reviewState: 'DOWNGRADED',
    rationale: 'Downgraded: accurate play leaves White about +1.0 at the trigger, although the tempting capture reverses the evaluation.',
    warning: 'Evidence-backed folklore downgrade: tactically real, but objectively inferior against accurate play.',
  },
  'fried-liver-kxf7-v1': {
    lifecycle: 'REJECTED',
    setupSoundness: 'UNASSESSED',
    reviewState: 'REJECTED',
    rationale: 'Rejected: the declared safe defence still leaves White about +5.6 in the retained engine snapshot.',
    warning: 'Evidence-backed rejection: the declared safe defence is contradicted by engine evidence.',
  },
};
