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
} from '@chess-trainer/contracts/repertoire-target';
import type {
  RepertoireBuilderPersonaPreset,
  RepertoireBuilderSetup,
} from '../state/repertoire-builder.models';

const PERSONA_PRESET_VERSION = '2026-07-builder-v1';
const SYSTEM_DEFAULT_VERSION = '2026-07-builder-v1';

export const repertoireBuilderPersonaPresets: readonly RepertoireBuilderPersonaPreset[] = [
  {
    id: 'BALANCED',
    label: 'Balanced',
    description: 'Prefer sound, flexible choices without committing to maximum theory.',
    defaultTheoryBurden: 'MEDIUM',
    defaultCoveragePercent: 80,
  },
  {
    id: 'SOLID',
    label: 'Solid',
    description: 'Prioritize dependable structures, lower risk, and a lighter theory load.',
    defaultTheoryBurden: 'LOW',
    defaultCoveragePercent: 85,
  },
  {
    id: 'AGGRESSIVE',
    label: 'Aggressive',
    description: 'Accept complexity and theory when it supports active, forcing play.',
    defaultTheoryBurden: 'HIGH',
    defaultCoveragePercent: 80,
  },
  {
    id: 'SURPRISE',
    label: 'Surprise',
    description: 'Prefer practical and less expected choices while keeping explicit risk limits.',
    defaultTheoryBurden: 'LOW',
    defaultCoveragePercent: 70,
  },
];

export function defaultRepertoireBuilderSetup(): RepertoireBuilderSetup {
  return {
    side: 'WHITE',
    speedPreset: 'BLITZ_AND_SLOWER',
    ratingTarget: 'MY_PEERS_PLUS_ONE',
    ratingGroup: null,
    persona: 'BALANCED',
    maximumTheoryBurden: 'MEDIUM',
    coveragePercent: 80,
  };
}

export function buildRepertoireBuilderTarget(
  setup: RepertoireBuilderSetup,
  peerResolution: LichessGamesPeerResolution | null,
  now: string,
  targetId = createId(),
): RepertoireTarget {
  const populationRequest = toPopulationRequest(setup.ratingTarget, setup.ratingGroup);
  const population = resolveRepertoireTargetPopulation(populationRequest, peerResolution);
  const preset = requirePersonaPreset(setup.persona);
  const presetObjective = objectiveForPersona(setup.persona, preset.defaultTheoryBurden);
  const objective = objectiveForPersona(setup.persona, setup.maximumTheoryBurden);
  const presetCoverage = coverageForPreset(preset.defaultCoveragePercent);
  const coverage = coverageForPreset(setup.coveragePercent);
  const accountIds = peerResolution
    ? [...new Set(peerResolution.contributions.map((entry) => entry.accountId))].sort((a, b) => a - b)
    : [];

  return repertoireTargetSchema.parse({
    contractVersion: REPERTOIRE_TARGET_CONTRACT_VERSION,
    targetId,
    side: setup.side,
    startingPoint: { kind: 'INITIAL_POSITION' },
    speedPreset: setup.speedPreset,
    population,
    accountIds,
    objective,
    coverage,
    defaults: [
      {
        field: 'speedPreset',
        source: { kind: 'SYSTEM_DEFAULT', policyVersion: SYSTEM_DEFAULT_VERSION },
        value: 'BLITZ_AND_SLOWER',
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
        source: { kind: 'PERSONA_PRESET', presetVersion: PERSONA_PRESET_VERSION },
        value: presetObjective,
      },
      {
        field: 'coverage',
        source: { kind: 'PERSONA_PRESET', presetVersion: PERSONA_PRESET_VERSION },
        value: presetCoverage,
      },
    ],
    overriddenFields: [
      ...(setup.speedPreset === 'BLITZ_AND_SLOWER' ? [] : ['speedPreset'] as const),
      ...(sameValue(objective, presetObjective) ? [] : ['objective'] as const),
      ...(sameValue(coverage, presetCoverage) ? [] : ['coverage'] as const),
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
  maximumTheoryBurden: RepertoireBuilderSetup['maximumTheoryBurden'],
): RepertoireTargetObjective {
  switch (persona) {
    case 'BALANCED':
      return {
        persona,
        preferredCharacters: ['BALANCED', 'DYNAMIC'],
        minimumSoundness: 'PLAYABLE',
        riskTolerance: 'MEDIUM',
        allowDeliberatelyDubious: false,
        maximumTheoryBurden,
        complexityTolerance: 'MEDIUM',
      };
    case 'SOLID':
      return {
        persona,
        preferredCharacters: ['SOLID', 'POSITIONAL'],
        minimumSoundness: 'SOUND',
        riskTolerance: 'LOW',
        allowDeliberatelyDubious: false,
        maximumTheoryBurden,
        complexityTolerance: 'LOW',
      };
    case 'AGGRESSIVE':
      return {
        persona,
        preferredCharacters: ['SHARP', 'TACTICAL', 'DYNAMIC'],
        minimumSoundness: 'PLAYABLE',
        riskTolerance: 'HIGH',
        allowDeliberatelyDubious: false,
        maximumTheoryBurden,
        complexityTolerance: 'HIGH',
      };
    case 'SURPRISE':
      return {
        persona,
        preferredCharacters: ['SURPRISE', 'TACTICAL'],
        minimumSoundness: 'RISKY',
        riskTolerance: 'HIGH',
        allowDeliberatelyDubious: false,
        maximumTheoryBurden,
        complexityTolerance: 'HIGH',
      };
  }
}

function coverageForPreset(percent: number): RepertoireTargetCoverage {
  return {
    opponentResponseCoveragePercent: Math.max(50, Math.min(100, Math.round(percent))),
    alwaysCoverPersonalResponseCount: 4,
    minimumPopulationGames: 20,
  };
}

function requirePersonaPreset(persona: RepertoireBuilderSetup['persona']): RepertoireBuilderPersonaPreset {
  const preset = repertoireBuilderPersonaPresets.find((entry) => entry.id === persona);
  if (!preset) throw new Error(`Unsupported repertoire persona ${persona}.`);
  return preset;
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
