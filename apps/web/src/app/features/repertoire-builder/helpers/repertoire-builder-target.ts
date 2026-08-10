import type {
  LichessGamesPeerResolution,
  LichessGamesRatingGroup,
} from '@chess-trainer/contracts/opening-explorer';
import {
  REPERTOIRE_TARGET_CONTRACT_VERSION,
  repertoireTargetSchema,
  resolveRepertoireTargetPopulation,
  type RepertoireTarget,
  type RepertoireTargetCoverage,
  type RepertoireTargetObjective,
  type RepertoireTargetPopulationRequest,
  type RepertoireTargetStartingPoint,
} from '@chess-trainer/contracts/repertoire-target';
import type {
  RepertoireBuilderPersonaPreset,
  RepertoireBuilderProfileDefaults,
  RepertoireBuilderSetup,
} from '../state/repertoire-builder.models';

const PERSONA_PRESET_VERSION = '2026-08-builder-v2';
const SYSTEM_DEFAULT_VERSION = '2026-08-builder-v2';
const COMPATIBILITY_THEORY_BURDEN = 'MEDIUM' as const;
const COMPATIBILITY_COVERAGE_PERCENT = 80;

export const repertoireBuilderPersonaPresets: readonly RepertoireBuilderPersonaPreset[] = [
  {
    id: 'BALANCED',
    label: 'Balanced',
    description: 'Practical peer-tested choices with sound validation.',
  },
  {
    id: 'SOLID',
    label: 'Solid',
    description: 'Established, dependable choices with strong Master and objective support.',
  },
  {
    id: 'AGGRESSIVE',
    label: 'Aggressive',
    description: 'Active, justified choices that accept bounded objective cost.',
  },
  {
    id: 'SURPRISE',
    label: 'Surprise',
    description: 'Uncommon viable choices that overperform in the selected population.',
  },
];

export function defaultRepertoireBuilderSetup(): RepertoireBuilderSetup {
  return {
    side: 'WHITE',
    startingScope: 'FULL',
    customStartingPosition: '',
    speedPreset: 'BLITZ_AND_SLOWER',
    ratingTarget: 'MY_PEERS_PLUS_ONE',
    ratingGroup: null,
    persona: 'BALANCED',
    maximumTheoryBurden: COMPATIBILITY_THEORY_BURDEN,
    coveragePercent: COMPATIBILITY_COVERAGE_PERCENT,
  };
}

export function buildRepertoireBuilderTarget(
  setup: RepertoireBuilderSetup,
  peerResolution: LichessGamesPeerResolution | null,
  now: string,
  targetId = createId(),
  startingPoint: RepertoireTargetStartingPoint = { kind: 'INITIAL_POSITION' },
  profileDefaults: RepertoireBuilderProfileDefaults | null = setup.profileDefaults ?? null,
): RepertoireTarget {
  const activeProfileDefaults = profileDefaults?.setup.side === setup.side ? profileDefaults : null;
  const populationRequest = toPopulationRequest(setup.ratingTarget, setup.ratingGroup);
  const population = resolveRepertoireTargetPopulation(populationRequest, peerResolution);
  const effectiveObjective = objectiveForPersona(setup.persona);
  const effectiveCoverage = compatibilityCoverage();
  const defaultSetup = activeProfileDefaults?.setup ?? {
    ...setup,
    speedPreset: 'BLITZ_AND_SLOWER' as const,
  };
  const defaultObjective = objectiveForPersona(defaultSetup.persona);
  const defaultCoverage = compatibilityCoverage();
  const accountIds = peerResolution
    ? [...new Set(peerResolution.contributions.map((entry) => entry.accountId))].sort((a, b) => a - b)
    : [];
  const speedDefaultSource = activeProfileDefaults?.source
    ?? { kind: 'SYSTEM_DEFAULT' as const, policyVersion: SYSTEM_DEFAULT_VERSION };
  const intentDefaultSource = activeProfileDefaults?.source
    ?? { kind: 'PERSONA_PRESET' as const, presetVersion: PERSONA_PRESET_VERSION };
  const compatibilityDefaultSource = {
    kind: 'SYSTEM_DEFAULT' as const,
    policyVersion: SYSTEM_DEFAULT_VERSION,
  };

  return repertoireTargetSchema.parse({
    contractVersion: REPERTOIRE_TARGET_CONTRACT_VERSION,
    targetId,
    side: setup.side,
    startingPoint,
    speedPreset: setup.speedPreset,
    population,
    accountIds,
    objective: effectiveObjective,
    coverage: effectiveCoverage,
    defaults: [
      {
        field: 'speedPreset',
        source: speedDefaultSource,
        value: defaultSetup.speedPreset,
      },
      ...(population.peerResolution === null
        ? []
        : [{
            field: 'population' as const,
            source: { kind: 'PEER_RESOLUTION' as const },
            value: population,
          }]),
      {
        field: 'objective',
        source: intentDefaultSource,
        value: defaultObjective,
      },
      {
        field: 'coverage',
        source: compatibilityDefaultSource,
        value: defaultCoverage,
      },
    ],
    overriddenFields: [
      ...(setup.speedPreset === defaultSetup.speedPreset ? [] : ['speedPreset'] as const),
      ...(sameValue(effectiveObjective, defaultObjective) ? [] : ['objective'] as const),
    ],
    createdAt: now,
    updatedAt: now,
  });
}

export function requiresPeerResolution(setup: RepertoireBuilderSetup): boolean {
  return setup.ratingTarget === 'MY_PEERS' || setup.ratingTarget === 'MY_PEERS_PLUS_ONE';
}

export function targetPopulationLabel(target: RepertoireTarget): string {
  switch (target.population.requested.kind) {
    case 'ALL_PLAYERS':
      return 'All Lichess rating groups';
    case 'MY_PEERS':
      return `My peers · ${ratingRangeLabel(target.population.effectiveRatingGroups)}`;
    case 'MY_PEERS_PLUS_ONE':
      return `My peers and one group higher · ${ratingRangeLabel(target.population.effectiveRatingGroups)}`;
    case 'EXPLICIT_LICHESS_GROUP':
      return `Explicit group · ${ratingGroupLabel(target.population.requested.ratingGroup)}`;
  }
}

export function ratingGroupLabel(group: LichessGamesRatingGroup): string {
  if (group === 0) return '< 1000';
  if (group === 2500) return '2500+';
  return `${group}–${group + 199}`;
}

function toPopulationRequest(
  ratingTarget: RepertoireBuilderSetup['ratingTarget'],
  ratingGroup: LichessGamesRatingGroup | null,
): RepertoireTargetPopulationRequest {
  switch (ratingTarget) {
    case 'ALL':
      return { kind: 'ALL_PLAYERS' };
    case 'MY_PEERS':
      return { kind: 'MY_PEERS' };
    case 'MY_PEERS_PLUS_ONE':
      return { kind: 'MY_PEERS_PLUS_ONE' };
    case 'GROUP':
      if (ratingGroup === null) throw new Error('Choose a Lichess rating group.');
      return { kind: 'EXPLICIT_LICHESS_GROUP', ratingGroup };
  }
}

function objectiveForPersona(
  persona: RepertoireBuilderSetup['persona'],
): RepertoireTargetObjective {
  switch (persona) {
    case 'BALANCED':
      return {
        persona,
        preferredCharacters: ['BALANCED', 'DYNAMIC'],
        minimumSoundness: 'PLAYABLE',
        riskTolerance: 'MEDIUM',
        allowDeliberatelyDubious: false,
        maximumTheoryBurden: COMPATIBILITY_THEORY_BURDEN,
        complexityTolerance: 'MEDIUM',
      };
    case 'SOLID':
      return {
        persona,
        preferredCharacters: ['SOLID', 'POSITIONAL'],
        minimumSoundness: 'SOUND',
        riskTolerance: 'LOW',
        allowDeliberatelyDubious: false,
        maximumTheoryBurden: COMPATIBILITY_THEORY_BURDEN,
        complexityTolerance: 'LOW',
      };
    case 'AGGRESSIVE':
      return {
        persona,
        preferredCharacters: ['SHARP', 'TACTICAL', 'DYNAMIC'],
        minimumSoundness: 'PLAYABLE',
        riskTolerance: 'HIGH',
        allowDeliberatelyDubious: false,
        maximumTheoryBurden: COMPATIBILITY_THEORY_BURDEN,
        complexityTolerance: 'HIGH',
      };
    case 'SURPRISE':
      return {
        persona,
        preferredCharacters: ['SURPRISE', 'TACTICAL'],
        minimumSoundness: 'RISKY',
        riskTolerance: 'HIGH',
        allowDeliberatelyDubious: false,
        maximumTheoryBurden: COMPATIBILITY_THEORY_BURDEN,
        complexityTolerance: 'HIGH',
      };
  }
}

function compatibilityCoverage(): RepertoireTargetCoverage {
  return {
    opponentResponseCoveragePercent: COMPATIBILITY_COVERAGE_PERCENT,
    alwaysCoverPersonalResponseCount: 4,
    minimumPopulationGames: 20,
  };
}

function ratingRangeLabel(groups: readonly LichessGamesRatingGroup[]): string {
  if (groups.length === 0) return 'unresolved';
  if (groups.length === 1) return ratingGroupLabel(groups[0]);
  const first = groups[0];
  const last = groups.at(-1)!;
  const lower = first === 0 ? '< 1000' : String(first);
  const upper = last === 2500 ? '2500+' : String(last + 199);
  return `${lower}–${upper}`;
}

function createId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `00000000-0000-4000-8000-${Math.random().toString(16).slice(2, 14).padEnd(12, '0')}`;
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
