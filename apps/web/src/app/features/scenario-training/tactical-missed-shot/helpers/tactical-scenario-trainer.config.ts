import { Observable } from 'rxjs';
import { ScenarioTrainingApiService } from '../data-access/scenario-training-api.service';
import {
  ScenarioTrainingSession,
  StartScenarioRequest,
} from '../data-access/scenario-training.models';

export type TacticalScenarioKind = 'missed-shot' | 'blunder';

export interface TacticalScenarioTrainerConfig {
  routeBase: string;
  title: string;
  emptySubtitle: string;
  loadingScenario: string;
  loadingNextScenario: string;
  startError: string;
  excludeError: string;
  start(
    api: ScenarioTrainingApiService,
    request: StartScenarioRequest,
  ): Observable<ScenarioTrainingSession>;
  originalMoveLabel: string;
  revealOriginalMoveLabel: string;
  hideOriginalMoveLabel: string;
  originalMoveRevealPrefix: string;
  excludeLabel: string;
  excludingLabel: string;
  challengeHelpText: string;
  introTitle: string;
  introHelpText: string;
  replayLabel: string;
  contextHelpText: string;
}

const MISSED_SHOT_CONFIG: TacticalScenarioTrainerConfig = {
  routeBase: '/scenario-training/tactical-missed-shot',
  title: 'Tactical missed shot',
  emptySubtitle: 'Find a move that keeps the opportunity alive.',
  loadingScenario: 'Loading scenario...',
  loadingNextScenario: 'Loading next scenario...',
  startError: 'Could not start a missed-shot scenario.',
  excludeError: 'Could not exclude this shot.',
  start: (api, request) => api.startTacticalMissedShot(request),
  originalMoveLabel: 'Game move',
  revealOriginalMoveLabel: 'Reveal game reply',
  hideOriginalMoveLabel: 'Hide game reply',
  originalMoveRevealPrefix: 'Original reply',
  excludeLabel: 'Exclude this shot',
  excludingLabel: 'Excluding...',
  challengeHelpText: 'Play any legal move from the challenge position.',
  introTitle: 'Opponent move',
  introHelpText: 'Replaying the move that created the opportunity.',
  replayLabel: 'Replay opponent move',
  contextHelpText: 'Review the game up to the move that created the opportunity.',
};

const BLUNDER_CONFIG: TacticalScenarioTrainerConfig = {
  routeBase: '/scenario-training/tactical-blunder',
  title: 'Blunder trainer',
  emptySubtitle: 'Find a safer move instead of repeating your blunder.',
  loadingScenario: 'Loading blunder scenario...',
  loadingNextScenario: 'Loading next blunder scenario...',
  startError: 'Could not start a blunder-avoidance scenario.',
  excludeError: 'Could not exclude this blunder.',
  start: (api, request) => api.startTacticalBlunder(request),
  originalMoveLabel: 'Original blunder',
  revealOriginalMoveLabel: 'Reveal original blunder',
  hideOriginalMoveLabel: 'Hide original blunder',
  originalMoveRevealPrefix: 'Original blunder',
  excludeLabel: 'Exclude this blunder',
  excludingLabel: 'Excluding...',
  challengeHelpText: 'Play a move that avoids the blunder and keeps the position within tolerance.',
  introTitle: 'Position before the blunder',
  introHelpText: 'Replaying the move before your decision.',
  replayLabel: 'Replay previous move',
  contextHelpText: 'Review the game up to the position before your blunder.',
};

export function tacticalScenarioTrainerConfig(kind: unknown): TacticalScenarioTrainerConfig {
  return kind === 'blunder' ? BLUNDER_CONFIG : MISSED_SHOT_CONFIG;
}
