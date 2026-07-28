import { z } from 'zod';
import { importedGameUserColorSchema } from '../imported-games';
import {
  lichessGamesPeerResolutionSchema,
  lichessGamesSpeedPresetSchema,
} from '../opening-explorer';
import {
  playerChessProfileOpeningCharacterSchema,
  playerChessProfileOpeningSoundnessSchema,
  playerChessProfileOpeningTheoryBurdenSchema,
} from '../player-chess-profile';

export const repertoireTargetContractVersionSchema = z.literal('2026-07-v1');
export type RepertoireTargetContractVersion = z.infer<typeof repertoireTargetContractVersionSchema>;

export const repertoireTargetStartingPointSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('INITIAL_POSITION') }),
  z.object({ kind: z.literal('FEN'), fen: z.string().trim().min(1) }),
  z.object({ kind: z.literal('COURSE_POSITION'), courseId: z.number().int().positive(), lineId: z.number().int().positive().optional() }),
]);
export type RepertoireTargetStartingPoint = z.infer<typeof repertoireTargetStartingPointSchema>;

export const repertoireTargetPopulationSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('ALL_PLAYERS') }),
  z.object({
    kind: z.literal('MY_PEERS'),
    peerResolution: lichessGamesPeerResolutionSchema,
  }),
  z.object({
    kind: z.literal('MY_PEERS_PLUS_ONE'),
    peerResolution: lichessGamesPeerResolutionSchema,
  }),
  z.object({
    kind: z.literal('EXPLICIT_LICHESS_GROUP'),
    groupId: z.string().trim().min(1),
  }),
]);
export type RepertoireTargetPopulation = z.infer<typeof repertoireTargetPopulationSchema>;

export const repertoireTargetPersonaSchema = z.enum([
  'BALANCED',
  'SOLID',
  'AGGRESSIVE',
  'SURPRISE',
  'CUSTOM',
]);
export type RepertoireTargetPersona = z.infer<typeof repertoireTargetPersonaSchema>;

export const repertoireTargetObjectiveSchema = z.object({
  persona: repertoireTargetPersonaSchema,
  preferredCharacters: z.array(playerChessProfileOpeningCharacterSchema).max(3).default([]),
  minimumSoundness: playerChessProfileOpeningSoundnessSchema,
  allowDeliberatelyDubious: z.boolean().default(false),
  maximumTheoryBurden: playerChessProfileOpeningTheoryBurdenSchema,
  complexityTolerance: z.enum(['LOW', 'MEDIUM', 'HIGH']),
});
export type RepertoireTargetObjective = z.infer<typeof repertoireTargetObjectiveSchema>;

export const repertoireTargetCoverageSchema = z.object({
  opponentResponseCoveragePercent: z.number().int().min(50).max(100),
  alwaysCoverPersonalResponseCount: z.number().int().min(1).max(100).nullable(),
  minimumPopulationGames: z.number().int().min(1).max(10_000).default(20),
});
export type RepertoireTargetCoverage = z.infer<typeof repertoireTargetCoverageSchema>;

export const repertoireTargetDerivationSchema = z.object({
  source: z.enum(['MANUAL', 'PLAYER_PROFILE', 'PERSONA_PRESET']),
  profileContractVersion: z.string().trim().min(1).nullable(),
  ratingNormalizationVersion: z.string().trim().min(1).nullable(),
  peerResolverPolicyVersion: z.string().trim().min(1).nullable(),
  derivedAt: z.iso.datetime({ offset: true }).nullable(),
});
export type RepertoireTargetDerivation = z.infer<typeof repertoireTargetDerivationSchema>;

export const repertoireTargetSchema = z.object({
  contractVersion: repertoireTargetContractVersionSchema,
  targetId: z.uuid(),
  side: importedGameUserColorSchema,
  startingPoint: repertoireTargetStartingPointSchema,
  speedPreset: lichessGamesSpeedPresetSchema,
  population: repertoireTargetPopulationSchema,
  provider: z.enum(['LICHESS']),
  accountIds: z.array(z.number().int().positive()).default([]),
  objective: repertoireTargetObjectiveSchema,
  coverage: repertoireTargetCoverageSchema,
  derivation: repertoireTargetDerivationSchema,
  overriddenFields: z.array(z.enum([
    'speedPreset',
    'population',
    'provider',
    'accountIds',
    'objective',
    'coverage',
  ])).default([]),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
}).superRefine((target, context) => {
  if (target.objective.minimumSoundness === 'DUBIOUS' && !target.objective.allowDeliberatelyDubious) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['objective', 'allowDeliberatelyDubious'],
      message: 'Dubious intent must be explicitly enabled',
    });
  }
  if (target.derivation.source === 'PLAYER_PROFILE' && !target.derivation.profileContractVersion) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['derivation', 'profileContractVersion'],
      message: 'Player-profile derivation requires profileContractVersion',
    });
  }
});
export type RepertoireTarget = z.infer<typeof repertoireTargetSchema>;

export const repertoireTargetRecalculationFieldSchema = z.enum([
  'side',
  'startingPoint',
  'speedPreset',
  'population',
  'provider',
  'accountIds',
  'objective',
  'coverage',
]);
export type RepertoireTargetRecalculationField = z.infer<typeof repertoireTargetRecalculationFieldSchema>;

export function repertoireTargetChangedFields(
  previous: RepertoireTarget,
  next: RepertoireTarget,
): RepertoireTargetRecalculationField[] {
  const fields = repertoireTargetRecalculationFieldSchema.options;
  return fields.filter((field) => JSON.stringify(previous[field]) !== JSON.stringify(next[field]));
}

export function repertoireTargetRequiresCandidateRecalculation(
  previous: RepertoireTarget,
  next: RepertoireTarget,
): boolean {
  return repertoireTargetChangedFields(previous, next).length > 0;
}
