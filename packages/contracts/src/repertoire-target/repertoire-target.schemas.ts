import { z } from 'zod';
import { importedGameUserColorSchema } from '../imported-games';
import {
  LICHESS_GAMES_RATING_GROUPS,
  lichessGamesPeerResolutionSchema,
  lichessGamesRatingGroupSchema,
  lichessGamesSpeedPresetSchema,
  type LichessGamesPeerResolution,
  type LichessGamesRatingGroup,
} from '../opening-explorer';
import {
  playerChessProfileOpeningCharacterSchema,
} from '../player-chess-profile';

export const REPERTOIRE_TARGET_CONTRACT_VERSION = '2026-07-v1' as const;
export const repertoireTargetContractVersionSchema = z.literal(REPERTOIRE_TARGET_CONTRACT_VERSION);
export type RepertoireTargetContractVersion = z.infer<typeof repertoireTargetContractVersionSchema>;

export const repertoireTargetStartingPointSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('INITIAL_POSITION') }),
  z.object({ kind: z.literal('FEN'), fen: z.string().trim().min(1) }),
  z.object({
    kind: z.literal('COURSE_POSITION'),
    courseId: z.number().int().positive(),
    lineId: z.number().int().positive().optional(),
  }),
]);
export type RepertoireTargetStartingPoint = z.infer<typeof repertoireTargetStartingPointSchema>;

export const repertoireTargetPopulationRequestSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('ALL_PLAYERS') }),
  z.object({ kind: z.literal('MY_PEERS') }),
  z.object({ kind: z.literal('MY_PEERS_PLUS_ONE') }),
  z.object({
    kind: z.literal('EXPLICIT_LICHESS_GROUP'),
    ratingGroup: lichessGamesRatingGroupSchema,
  }),
]);
export type RepertoireTargetPopulationRequest = z.infer<typeof repertoireTargetPopulationRequestSchema>;

export const repertoireTargetPopulationSchema = z.object({
  source: z.literal('LICHESS_GAMES'),
  requested: repertoireTargetPopulationRequestSchema,
  effectiveRatingGroups: z.array(lichessGamesRatingGroupSchema).min(1),
  peerResolution: lichessGamesPeerResolutionSchema.nullable(),
}).superRefine((population, context) => {
  const effectiveGroups = sortedUniqueRatingGroups(population.effectiveRatingGroups);
  if (effectiveGroups.length !== population.effectiveRatingGroups.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['effectiveRatingGroups'],
      message: 'effectiveRatingGroups must not contain duplicates',
    });
  }

  const isPeerRequest = population.requested.kind === 'MY_PEERS'
    || population.requested.kind === 'MY_PEERS_PLUS_ONE';

  if (isPeerRequest && population.peerResolution === null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['peerResolution'],
      message: 'Peer population targets require a factual peer-resolution snapshot',
    });
    return;
  }

  if (!isPeerRequest && population.peerResolution !== null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['peerResolution'],
      message: 'peerResolution is only allowed for peer population targets',
    });
  }

  let expectedGroups: LichessGamesRatingGroup[];
  if (population.requested.kind === 'ALL_PLAYERS') {
    expectedGroups = [...LICHESS_GAMES_RATING_GROUPS];
  } else if (population.requested.kind === 'EXPLICIT_LICHESS_GROUP') {
    expectedGroups = [population.requested.ratingGroup];
  } else if (population.peerResolution !== null) {
    const selectedGroups = sortedUniqueRatingGroups(population.peerResolution.selectedGroups);
    if (selectedGroups.length !== population.peerResolution.selectedGroups.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['peerResolution', 'selectedGroups'],
        message: 'peerResolution.selectedGroups must not contain duplicates',
      });
    }
    expectedGroups = population.requested.kind === 'MY_PEERS_PLUS_ONE'
      ? appendHigherLichessRatingGroup(selectedGroups)
      : selectedGroups;
  } else {
    return;
  }

  if (!sameRatingGroups(effectiveGroups, expectedGroups)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['effectiveRatingGroups'],
      message: 'effectiveRatingGroups do not match the requested population target',
    });
  }
});
export type RepertoireTargetPopulation = z.infer<typeof repertoireTargetPopulationSchema>;

export const repertoireTargetPersonaSchema = z.enum([
  'BALANCED',
  'SOLID',
  'AGGRESSIVE',
  'SURPRISE',
  'CUSTOM',
]);
export type RepertoireTargetPersona = z.infer<typeof repertoireTargetPersonaSchema>;

export const repertoireTargetSoundnessSchema = z.enum([
  'SOUND',
  'PLAYABLE',
  'RISKY',
  'DUBIOUS',
]);
export type RepertoireTargetSoundness = z.infer<typeof repertoireTargetSoundnessSchema>;

export const repertoireTargetTheoryBurdenSchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);
export type RepertoireTargetTheoryBurden = z.infer<typeof repertoireTargetTheoryBurdenSchema>;

export const repertoireTargetToleranceSchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);
export type RepertoireTargetTolerance = z.infer<typeof repertoireTargetToleranceSchema>;

export const repertoireTargetObjectiveSchema = z.object({
  persona: repertoireTargetPersonaSchema,
  preferredCharacters: z.array(playerChessProfileOpeningCharacterSchema).max(3).default([]),
  minimumSoundness: repertoireTargetSoundnessSchema,
  riskTolerance: repertoireTargetToleranceSchema,
  allowDeliberatelyDubious: z.boolean().default(false),
  maximumTheoryBurden: repertoireTargetTheoryBurdenSchema,
  complexityTolerance: repertoireTargetToleranceSchema,
}).superRefine((objective, context) => {
  if (new Set(objective.preferredCharacters).size !== objective.preferredCharacters.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['preferredCharacters'],
      message: 'preferredCharacters must not contain duplicates',
    });
  }
  if (objective.minimumSoundness === 'DUBIOUS' && !objective.allowDeliberatelyDubious) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['allowDeliberatelyDubious'],
      message: 'Dubious intent must be explicitly enabled',
    });
  }
  if (objective.minimumSoundness !== 'DUBIOUS' && objective.allowDeliberatelyDubious) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['allowDeliberatelyDubious'],
      message: 'Deliberately dubious opt-in is only valid for a dubious target',
    });
  }
});
export type RepertoireTargetObjective = z.infer<typeof repertoireTargetObjectiveSchema>;

export const repertoireTargetCoverageSchema = z.object({
  opponentResponseCoveragePercent: z.number().int().min(50).max(100),
  alwaysCoverPersonalResponseCount: z.number().int().min(1).max(100).nullable(),
  minimumPopulationGames: z.number().int().min(1).max(10_000).default(20),
});
export type RepertoireTargetCoverage = z.infer<typeof repertoireTargetCoverageSchema>;

export const repertoireTargetDefaultSourceSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('SYSTEM_DEFAULT'),
    policyVersion: z.string().trim().min(1),
  }),
  z.object({
    kind: z.literal('PERSONA_PRESET'),
    presetVersion: z.string().trim().min(1),
  }),
  z.object({
    kind: z.literal('PLAYER_PROFILE'),
    profileContractVersion: z.string().trim().min(1),
    profileGeneratedAt: z.iso.datetime({ offset: true }),
    classificationVersion: z.string().trim().min(1),
  }),
  z.object({ kind: z.literal('PEER_RESOLUTION') }),
]);
export type RepertoireTargetDefaultSource = z.infer<typeof repertoireTargetDefaultSourceSchema>;

export const repertoireTargetDefaultFieldSchema = z.enum([
  'speedPreset',
  'population',
  'objective',
  'coverage',
]);
export type RepertoireTargetDefaultField = z.infer<typeof repertoireTargetDefaultFieldSchema>;

export const repertoireTargetDefaultSchema = z.discriminatedUnion('field', [
  z.object({
    field: z.literal('speedPreset'),
    source: repertoireTargetDefaultSourceSchema,
    value: lichessGamesSpeedPresetSchema,
  }),
  z.object({
    field: z.literal('population'),
    source: repertoireTargetDefaultSourceSchema,
    value: repertoireTargetPopulationSchema,
  }),
  z.object({
    field: z.literal('objective'),
    source: repertoireTargetDefaultSourceSchema,
    value: repertoireTargetObjectiveSchema,
  }),
  z.object({
    field: z.literal('coverage'),
    source: repertoireTargetDefaultSourceSchema,
    value: repertoireTargetCoverageSchema,
  }),
]);
export type RepertoireTargetDefault = z.infer<typeof repertoireTargetDefaultSchema>;

export const repertoireTargetFieldSchema = z.enum([
  'contractVersion',
  'targetId',
  'side',
  'startingPoint',
  'speedPreset',
  'population',
  'accountIds',
  'objective',
  'coverage',
  'defaults',
  'overriddenFields',
  'createdAt',
  'updatedAt',
]);
export type RepertoireTargetField = z.infer<typeof repertoireTargetFieldSchema>;

export const REPERTOIRE_TARGET_IMMUTABLE_FIELDS = [
  'contractVersion',
  'targetId',
  'createdAt',
] as const satisfies readonly RepertoireTargetField[];

export const REPERTOIRE_TARGET_MUTABLE_FIELDS = [
  'side',
  'startingPoint',
  'speedPreset',
  'population',
  'accountIds',
  'objective',
  'coverage',
  'defaults',
  'overriddenFields',
  'updatedAt',
] as const satisfies readonly RepertoireTargetField[];

export const REPERTOIRE_TARGET_RECALCULATION_FIELDS = [
  'side',
  'startingPoint',
  'speedPreset',
  'population',
  'accountIds',
  'objective',
  'coverage',
] as const satisfies readonly RepertoireTargetField[];

export const repertoireTargetSchema = z.object({
  contractVersion: repertoireTargetContractVersionSchema,
  targetId: z.uuid(),
  side: importedGameUserColorSchema,
  startingPoint: repertoireTargetStartingPointSchema,
  speedPreset: lichessGamesSpeedPresetSchema,
  population: repertoireTargetPopulationSchema,
  accountIds: z.array(z.number().int().positive()).default([]),
  objective: repertoireTargetObjectiveSchema,
  coverage: repertoireTargetCoverageSchema,
  defaults: z.array(repertoireTargetDefaultSchema).max(4).default([]),
  overriddenFields: z.array(repertoireTargetDefaultFieldSchema).max(4).default([]),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
}).superRefine((target, context) => {
  if (new Set(target.accountIds).size !== target.accountIds.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['accountIds'],
      message: 'accountIds must not contain duplicates',
    });
  }

  const defaultFields = target.defaults.map((entry) => entry.field);
  if (new Set(defaultFields).size !== defaultFields.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['defaults'],
      message: 'Each target field can have at most one recorded default',
    });
  }

  if (new Set(target.overriddenFields).size !== target.overriddenFields.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['overriddenFields'],
      message: 'overriddenFields must not contain duplicates',
    });
  }

  const expectedOverrides = target.defaults
    .filter((entry) => !defaultMatchesEffectiveValue(target, entry))
    .map((entry) => entry.field)
    .sort();
  const recordedOverrides = [...target.overriddenFields].sort();
  if (JSON.stringify(expectedOverrides) !== JSON.stringify(recordedOverrides)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['overriddenFields'],
      message: 'overriddenFields must exactly match defaults changed by the effective target',
    });
  }

  for (const entry of target.defaults) {
    if (entry.source.kind === 'PEER_RESOLUTION') {
      if (entry.field !== 'population' || entry.value.peerResolution === null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['defaults'],
          message: 'PEER_RESOLUTION defaults are only valid for a peer-resolved population',
        });
      }
    }
  }

  const peerPopulation = target.population.requested.kind === 'MY_PEERS'
    || target.population.requested.kind === 'MY_PEERS_PLUS_ONE';
  if (peerPopulation && target.accountIds.length === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['accountIds'],
      message: 'Peer population targets require at least one accountId',
    });
  }
  if (target.population.peerResolution !== null) {
    const accountIds = new Set(target.accountIds);
    for (const contribution of target.population.peerResolution.contributions) {
      if (!accountIds.has(contribution.accountId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['population', 'peerResolution', 'contributions'],
          message: 'Peer-resolution contributions must belong to the selected accountIds',
        });
        break;
      }
    }
  }

  if (Date.parse(target.createdAt) > Date.parse(target.updatedAt)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['updatedAt'],
      message: 'updatedAt must not be earlier than createdAt',
    });
  }
});
export type RepertoireTarget = z.infer<typeof repertoireTargetSchema>;

export function appendHigherLichessRatingGroup(
  selectedGroups: readonly LichessGamesRatingGroup[],
): LichessGamesRatingGroup[] {
  const selected = sortedUniqueRatingGroups(selectedGroups);
  if (selected.length === 0) return [];
  const highestIndex = Math.max(...selected.map((group) => LICHESS_GAMES_RATING_GROUPS.indexOf(group)));
  const higher = LICHESS_GAMES_RATING_GROUPS[highestIndex + 1];
  return higher === undefined ? selected : [...selected, higher];
}

export function resolveRepertoireTargetPopulation(
  requested: RepertoireTargetPopulationRequest,
  peerResolution: LichessGamesPeerResolution | null = null,
): RepertoireTargetPopulation {
  let effectiveRatingGroups: LichessGamesRatingGroup[];
  if (requested.kind === 'ALL_PLAYERS') {
    effectiveRatingGroups = [...LICHESS_GAMES_RATING_GROUPS];
  } else if (requested.kind === 'EXPLICIT_LICHESS_GROUP') {
    effectiveRatingGroups = [requested.ratingGroup];
  } else if (peerResolution !== null) {
    effectiveRatingGroups = requested.kind === 'MY_PEERS_PLUS_ONE'
      ? appendHigherLichessRatingGroup(peerResolution.selectedGroups)
      : sortedUniqueRatingGroups(peerResolution.selectedGroups);
  } else {
    effectiveRatingGroups = [];
  }

  return repertoireTargetPopulationSchema.parse({
    source: 'LICHESS_GAMES',
    requested,
    effectiveRatingGroups,
    peerResolution,
  });
}

export function repertoireTargetChangedFields(
  previous: RepertoireTarget,
  next: RepertoireTarget,
): RepertoireTargetField[] {
  return repertoireTargetFieldSchema.options.filter((field) => (
    JSON.stringify(normalizeTargetField(previous, field))
      !== JSON.stringify(normalizeTargetField(next, field))
  ));
}

export function repertoireTargetImmutableFieldsChanged(
  previous: RepertoireTarget,
  next: RepertoireTarget,
): RepertoireTargetField[] {
  const changed = new Set(repertoireTargetChangedFields(previous, next));
  return REPERTOIRE_TARGET_IMMUTABLE_FIELDS.filter((field) => changed.has(field));
}

export function repertoireTargetCandidateChangedFields(
  previous: RepertoireTarget,
  next: RepertoireTarget,
): RepertoireTargetField[] {
  return REPERTOIRE_TARGET_RECALCULATION_FIELDS.filter((field) => (
    JSON.stringify(normalizeCandidateField(previous, field))
      !== JSON.stringify(normalizeCandidateField(next, field))
  ));
}

export function repertoireTargetRequiresCandidateRecalculation(
  previous: RepertoireTarget,
  next: RepertoireTarget,
): boolean {
  return repertoireTargetCandidateChangedFields(previous, next).length > 0;
}

function defaultMatchesEffectiveValue(
  target: RepertoireTarget,
  entry: RepertoireTargetDefault,
): boolean {
  const effectiveValue = target[entry.field];
  return JSON.stringify(normalizeDefaultFieldValue(entry.field, effectiveValue))
    === JSON.stringify(normalizeDefaultFieldValue(entry.field, entry.value));
}

function normalizeDefaultFieldValue(field: RepertoireTargetDefaultField, value: unknown): unknown {
  if (field === 'population') {
    return normalizePopulationForCandidate(value as RepertoireTargetPopulation);
  }
  return value;
}

function normalizeTargetField(target: RepertoireTarget, field: RepertoireTargetField): unknown {
  if (field === 'accountIds') return sortedUniqueNumbers(target.accountIds);
  if (field === 'population') return normalizePopulation(target.population);
  if (field === 'defaults') {
    return [...target.defaults]
      .sort((left, right) => left.field.localeCompare(right.field))
      .map((entry) => ({
        ...entry,
        value: normalizeDefaultFieldValue(entry.field, entry.value),
      }));
  }
  if (field === 'overriddenFields') return [...target.overriddenFields].sort();
  return target[field];
}

function normalizeCandidateField(target: RepertoireTarget, field: RepertoireTargetField): unknown {
  if (field === 'population') return normalizePopulationForCandidate(target.population);
  return normalizeTargetField(target, field);
}

function normalizePopulationForCandidate(population: RepertoireTargetPopulation): unknown {
  return {
    source: population.source,
    requested: population.requested,
    effectiveRatingGroups: sortedUniqueRatingGroups(population.effectiveRatingGroups),
  };
}

function normalizePopulation(population: RepertoireTargetPopulation): unknown {
  const candidatePopulation = normalizePopulationForCandidate(population) as object;
  return {
    ...candidatePopulation,
    peerResolution: population.peerResolution === null ? null : {
      ...population.peerResolution,
      selectedGroups: sortedUniqueRatingGroups(population.peerResolution.selectedGroups),
      distribution: [...population.peerResolution.distribution]
        .sort((left, right) => left.group - right.group),
      contributions: [...population.peerResolution.contributions]
        .sort((left, right) => contributionSortKey(left).localeCompare(contributionSortKey(right))),
    },
  };
}

function contributionSortKey(contribution: LichessGamesPeerResolution['contributions'][number]): string {
  return [
    contribution.accountId,
    contribution.provider,
    contribution.username,
    contribution.speed,
    contribution.games,
  ].join('|');
}

function sortedUniqueRatingGroups(
  values: readonly LichessGamesRatingGroup[],
): LichessGamesRatingGroup[] {
  return [...new Set(values)].sort((left, right) => left - right);
}

function sortedUniqueNumbers(values: readonly number[]): number[] {
  return [...new Set(values)].sort((left, right) => left - right);
}

function sameRatingGroups(
  left: readonly LichessGamesRatingGroup[],
  right: readonly LichessGamesRatingGroup[],
): boolean {
  return JSON.stringify(sortedUniqueRatingGroups(left)) === JSON.stringify(sortedUniqueRatingGroups(right));
}
