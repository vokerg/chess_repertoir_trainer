import type { ParamMap, Params } from '@angular/router';
import {
  PLAYER_CHESS_PROFILE_CONTRACT_VERSION,
  type PlayerChessProfileOpeningCharacter,
  type PlayerChessProfileOpeningGroup,
  type PlayerChessProfileResponse,
} from '@chess-trainer/contracts/player-chess-profile';
import type {
  RepertoireTargetDefaultSource,
  RepertoireTargetPersona,
  RepertoireTargetTheoryBurden,
} from '@chess-trainer/contracts/repertoire-target';
import { repertoireBuilderPersonaPresets } from './helpers/repertoire-builder-target';
import type { RepertoireBuilderSetup } from './state/repertoire-builder.models';

const PROFILE_SOURCE = 'player-profile' as const;
const PROFILE_INTENT = 'profile-starting-point' as const;
const PROFILE_LAUNCH_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const PROFILE_LAUNCH_FUTURE_TOLERANCE_MS = 5 * 60 * 1000;
const MIN_PROFILED_GAMES = 5;

const CHARACTER_ORDER: readonly PlayerChessProfileOpeningCharacter[] = [
  'SOLID',
  'POSITIONAL',
  'BALANCED',
  'DYNAMIC',
  'SHARP',
  'TACTICAL',
  'SURPRISE',
];

const THEORY_ORDER: readonly RepertoireTargetTheoryBurden[] = ['MEDIUM', 'LOW', 'HIGH'];

export interface RepertoireBuilderProfileSuggestion {
  side: 'WHITE' | 'BLACK';
  setup: RepertoireBuilderSetup;
  profileSource: Extract<RepertoireTargetDefaultSource, { kind: 'PLAYER_PROFILE' }>;
  profiledGames: number;
  strongestCharacter: PlayerChessProfileOpeningCharacter | null;
  evidenceSummary: string;
}

export interface RepertoireBuilderProfileLaunch extends RepertoireBuilderProfileSuggestion {
  source: 'PLAYER_PROFILE';
  intent: 'PROFILE_STARTING_POINT';
}

export interface RepertoireBuilderProfileLaunchParseResult {
  context: RepertoireBuilderProfileLaunch | null;
  error: string | null;
}

type ProfileLaunchResponse = Pick<
  PlayerChessProfileResponse,
  'generatedAt' | 'classificationVersion' | 'filters' | 'openingGroups'
>;

export function buildRepertoireBuilderProfileSuggestions(
  response: ProfileLaunchResponse,
): readonly RepertoireBuilderProfileSuggestion[] {
  return (['WHITE', 'BLACK'] as const)
    .map((side) => buildSideSuggestion(response, side))
    .filter(isSuggestion);
}

export function buildRepertoireBuilderProfileLaunchQueryParams(
  suggestion: RepertoireBuilderProfileSuggestion,
): Params {
  return {
    source: PROFILE_SOURCE,
    intent: PROFILE_INTENT,
    side: suggestion.side,
    speedPreset: suggestion.setup.speedPreset,
    persona: suggestion.setup.persona,
    theoryBurden: suggestion.setup.maximumTheoryBurden,
    coveragePercent: suggestion.setup.coveragePercent,
    profileContractVersion: suggestion.profileSource.profileContractVersion,
    profileGeneratedAt: suggestion.profileSource.profileGeneratedAt,
    classificationVersion: suggestion.profileSource.classificationVersion,
    profiledGames: suggestion.profiledGames,
    strongestCharacter: suggestion.strongestCharacter ?? undefined,
  };
}

export function parseRepertoireBuilderProfileLaunch(
  params: ParamMap,
  now = new Date(),
): RepertoireBuilderProfileLaunchParseResult {
  if (params.get('source') !== PROFILE_SOURCE) return { context: null, error: null };
  if (params.get('intent') !== PROFILE_INTENT) return invalidProfileLaunch();

  const side = profileSide(params.get('side'));
  const speedPreset = profileSpeedPreset(params.get('speedPreset'));
  const persona = profilePersona(params.get('persona'));
  const maximumTheoryBurden = theoryBurden(params.get('theoryBurden'));
  const coveragePercent = boundedInteger(params.get('coveragePercent'), 50, 100);
  const profileContractVersion = boundedText(params.get('profileContractVersion'), 80);
  const profileGeneratedAt = profileDateTime(params.get('profileGeneratedAt'));
  const classificationVersion = boundedText(params.get('classificationVersion'), 120);
  const profiledGames = boundedInteger(params.get('profiledGames'), MIN_PROFILED_GAMES, 1_000_000);
  const strongestCharacter = optionalCharacter(params.get('strongestCharacter'));

  if (
    side === null
    || speedPreset === null
    || persona === null
    || maximumTheoryBurden === null
    || coveragePercent === null
    || profileContractVersion !== PLAYER_CHESS_PROFILE_CONTRACT_VERSION
    || profileGeneratedAt === null
    || classificationVersion === null
    || profiledGames === null
  ) {
    return invalidProfileLaunch();
  }

  const generatedAtMs = Date.parse(profileGeneratedAt);
  const ageMs = now.getTime() - generatedAtMs;
  if (ageMs > PROFILE_LAUNCH_MAX_AGE_MS || ageMs < -PROFILE_LAUNCH_FUTURE_TOLERANCE_MS) {
    return {
      context: null,
      error: 'This profile suggestion has expired. Recalculate Chess profile before launching Builder again.',
    };
  }

  const setup: RepertoireBuilderSetup = {
    side,
    speedPreset,
    ratingTarget: 'MY_PEERS',
    ratingGroup: null,
    persona,
    maximumTheoryBurden,
    coveragePercent,
  };
  const evidenceSummary = profileEvidenceSummary(
    side,
    persona,
    maximumTheoryBurden,
    profiledGames,
    strongestCharacter,
  );

  return {
    context: {
      source: 'PLAYER_PROFILE',
      intent: 'PROFILE_STARTING_POINT',
      side,
      setup,
      profileSource: {
        kind: 'PLAYER_PROFILE',
        profileContractVersion,
        profileGeneratedAt,
        classificationVersion,
      },
      profiledGames,
      strongestCharacter,
      evidenceSummary,
    },
    error: null,
  };
}

export function isRepertoireBuilderProfileLaunch(
  value: unknown,
): value is RepertoireBuilderProfileLaunch {
  return Boolean(value && typeof value === 'object' && (value as { source?: unknown }).source === 'PLAYER_PROFILE');
}

function buildSideSuggestion(
  response: ProfileLaunchResponse,
  side: 'WHITE' | 'BLACK',
): RepertoireBuilderProfileSuggestion | null {
  const rows = response.openingGroups.filter((row) => (
    row.userColor === side && row.classification !== null
  ));
  const profiledGames = rows.reduce((total, row) => total + row.games, 0);
  if (profiledGames < MIN_PROFILED_GAMES) return null;

  const strongestCharacter = strongestProfileCharacter(rows);
  const persona = personaForCharacter(strongestCharacter);
  const preset = repertoireBuilderPersonaPresets.find((entry) => entry.id === persona);
  if (!preset) return null;
  const maximumTheoryBurden = dominantTheoryBurden(rows, preset.defaultTheoryBurden);
  const setup: RepertoireBuilderSetup = {
    side,
    speedPreset: response.filters.speedPreset,
    ratingTarget: 'MY_PEERS',
    ratingGroup: null,
    persona,
    maximumTheoryBurden,
    coveragePercent: preset.defaultCoveragePercent,
  };

  return {
    side,
    setup,
    profileSource: {
      kind: 'PLAYER_PROFILE',
      profileContractVersion: PLAYER_CHESS_PROFILE_CONTRACT_VERSION,
      profileGeneratedAt: response.generatedAt,
      classificationVersion: response.classificationVersion,
    },
    profiledGames,
    strongestCharacter,
    evidenceSummary: profileEvidenceSummary(
      side,
      persona,
      maximumTheoryBurden,
      profiledGames,
      strongestCharacter,
    ),
  };
}

function strongestProfileCharacter(
  rows: readonly PlayerChessProfileOpeningGroup[],
): PlayerChessProfileOpeningCharacter | null {
  const gamesByCharacter = new Map<PlayerChessProfileOpeningCharacter, number>();
  for (const row of rows) {
    const characters = row.classification?.character ?? [];
    if (characters.length === 0) continue;
    const contribution = row.games / characters.length;
    for (const character of characters) {
      gamesByCharacter.set(character, (gamesByCharacter.get(character) ?? 0) + contribution);
    }
  }
  return CHARACTER_ORDER.reduce<PlayerChessProfileOpeningCharacter | null>((best, character) => {
    if (best === null) return gamesByCharacter.has(character) ? character : null;
    return (gamesByCharacter.get(character) ?? 0) > (gamesByCharacter.get(best) ?? 0)
      ? character
      : best;
  }, null);
}

function dominantTheoryBurden(
  rows: readonly PlayerChessProfileOpeningGroup[],
  fallback: RepertoireTargetTheoryBurden,
): RepertoireTargetTheoryBurden {
  const gamesByTheory = new Map<RepertoireTargetTheoryBurden, number>();
  for (const row of rows) {
    const theory = row.classification?.theoryBurden;
    if (theory !== 'LOW' && theory !== 'MEDIUM' && theory !== 'HIGH') continue;
    gamesByTheory.set(theory, (gamesByTheory.get(theory) ?? 0) + row.games);
  }
  if (gamesByTheory.size === 0) return fallback;
  return THEORY_ORDER.reduce((best, theory) => (
    (gamesByTheory.get(theory) ?? 0) > (gamesByTheory.get(best) ?? 0) ? theory : best
  ), fallback);
}

function personaForCharacter(
  character: PlayerChessProfileOpeningCharacter | null,
): Exclude<RepertoireTargetPersona, 'CUSTOM'> {
  switch (character) {
    case 'SOLID':
    case 'POSITIONAL':
      return 'SOLID';
    case 'DYNAMIC':
    case 'SHARP':
    case 'TACTICAL':
      return 'AGGRESSIVE';
    case 'SURPRISE':
      return 'SURPRISE';
    case 'BALANCED':
    case null:
      return 'BALANCED';
  }
}

function profileEvidenceSummary(
  side: 'WHITE' | 'BLACK',
  persona: Exclude<RepertoireTargetPersona, 'CUSTOM'>,
  theory: RepertoireTargetTheoryBurden,
  profiledGames: number,
  strongestCharacter: PlayerChessProfileOpeningCharacter | null,
): string {
  const character = strongestCharacter ? humanize(strongestCharacter) : 'mixed character';
  return `${profiledGames} profiled ${side.toLowerCase()} games · ${character} · ${humanize(persona)} intent · ${theory.toLowerCase()} theory`;
}

function profileSide(value: string | null): 'WHITE' | 'BLACK' | null {
  return value === 'WHITE' || value === 'BLACK' ? value : null;
}

function profileSpeedPreset(value: string | null): RepertoireBuilderSetup['speedPreset'] | null {
  return value === 'ALL' || value === 'BLITZ_AND_SLOWER' || value === 'BLITZ' || value === 'BULLET'
    ? value
    : null;
}

function profilePersona(value: string | null): RepertoireBuilderSetup['persona'] | null {
  return value === 'BALANCED' || value === 'SOLID' || value === 'AGGRESSIVE' || value === 'SURPRISE'
    ? value
    : null;
}

function theoryBurden(value: string | null): RepertoireTargetTheoryBurden | null {
  return value === 'LOW' || value === 'MEDIUM' || value === 'HIGH' ? value : null;
}

function optionalCharacter(value: string | null): PlayerChessProfileOpeningCharacter | null {
  if (value === null || value === '') return null;
  return CHARACTER_ORDER.includes(value as PlayerChessProfileOpeningCharacter)
    ? value as PlayerChessProfileOpeningCharacter
    : null;
}

function profileDateTime(value: string | null): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed && Number.isFinite(Date.parse(trimmed)) ? trimmed : null;
}

function boundedInteger(value: string | null, min: number, max: number): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function boundedText(value: string | null, maxLength: number): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : null;
}

function invalidProfileLaunch(): RepertoireBuilderProfileLaunchParseResult {
  return {
    context: null,
    error: 'This Chess profile link is incomplete or no longer valid. Recalculate the profile and launch Builder again.',
  };
}

function humanize(value: string): string {
  return value.toLowerCase().replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase());
}

function isSuggestion(
  suggestion: RepertoireBuilderProfileSuggestion | null,
): suggestion is RepertoireBuilderProfileSuggestion {
  return suggestion !== null;
}
