import { z } from 'zod';

export const serializableTrainingVersionSchema = z.literal(1);
export const serializableTrainingSideSchema = z.enum(['WHITE', 'BLACK']);
export const serializableTrainingStatusSchema = z.enum(['IN_PROGRESS', 'PASSED', 'FAILED']);
export const serializableTrainingEventKindSchema = z.enum([
  'MOVE_ATTEMPT',
  'MISSED_ON_EARLY_FINISH',
]);

export const serializableTrainingMoveSnapshotSchema = z.object({
  nodeId: z.number().int().positive(),
  moveUci: z.string().min(1),
  moveSan: z.string().min(1),
  fenBefore: z.string().min(1),
  fenAfter: z.string().min(1),
  isUserMove: z.boolean(),
  comment: z.string().nullable().optional(),
  annotation: z.string().nullable().optional(),
  branchLabel: z.string().nullable().optional(),
});

export const serializableTrainingSublineSchema = z.object({
  version: serializableTrainingVersionSchema,
  lineId: z.number().int().positive(),
  startingFen: z.string().min(1),
  sideToTrain: serializableTrainingSideSchema,
  sublineHash: z.string().min(1),
  sublineKeyVersion: z.number().int().positive(),
  leafNodeId: z.number().int().positive(),
  moves: z.array(serializableTrainingMoveSnapshotSchema).min(1),
});

export const serializableTrainingEventSchema = z.object({
  version: serializableTrainingVersionSchema,
  sequence: z.number().int().positive(),
  kind: serializableTrainingEventKindSchema,
  occurredAt: z.string().datetime({ offset: true }),
  fenBefore: z.string().min(1),
  expectedNodeId: z.number().int().positive(),
  expectedMoveUci: z.string().min(1),
  playedMoveUci: z.string().min(1).nullable(),
  wasCorrect: z.boolean(),
});

export const serializableTrainingCountersSchema = z.object({
  mistakesCount: z.number().int().nonnegative(),
  totalExpectedMoves: z.number().int().nonnegative(),
  correctMoves: z.number().int().nonnegative(),
  accuracy: z.number().min(0).max(1).nullable(),
});

export const serializableTrainingSessionSchema = z.object({
  version: serializableTrainingVersionSchema,
  sessionId: z.string().min(1),
  lineId: z.number().int().positive(),
  sublineHash: z.string().min(1),
  sublineKeyVersion: z.number().int().positive(),
  courseContentRevision: z.number().int().positive(),
  sideToTrain: serializableTrainingSideSchema,
  startingFen: z.string().min(1),
  startedAt: z.string().datetime({ offset: true }),
  completedAt: z.string().datetime({ offset: true }).nullable(),
  status: serializableTrainingStatusSchema,
  nextMoveIndex: z.number().int().nonnegative(),
  expectedMoveIndex: z.number().int().nonnegative().nullable(),
  currentFen: z.string().min(1),
  lastMoveUci: z.string().min(1).nullable(),
  completed: z.boolean(),
  completedEarly: z.boolean(),
  counters: serializableTrainingCountersSchema,
  events: z.array(serializableTrainingEventSchema),
});

export const serializableTrainingReviewMistakeSchema = z.object({
  sequence: z.number().int().positive(),
  occurredAt: z.string().datetime({ offset: true }),
  kind: serializableTrainingEventKindSchema,
  fenBefore: z.string().min(1),
  expectedNodeId: z.number().int().positive(),
  expectedMoveUci: z.string().min(1),
  expectedMoveSan: z.string().min(1),
  playedMoveUci: z.string().min(1).nullable(),
  comment: z.string().nullable(),
  annotation: z.string().nullable(),
  branchLabel: z.string().nullable(),
});

export const serializableTrainingReviewSchema = z.object({
  sessionId: z.string().min(1),
  lineId: z.number().int().positive(),
  sublineHash: z.string().min(1),
  status: serializableTrainingStatusSchema,
  completed: z.boolean(),
  completedEarly: z.boolean(),
  counters: serializableTrainingCountersSchema,
  mistakes: z.array(serializableTrainingReviewMistakeSchema),
});

export type SerializableTrainingMoveSnapshotDto = z.infer<
  typeof serializableTrainingMoveSnapshotSchema
>;
export type SerializableTrainingSublineDto = z.infer<
  typeof serializableTrainingSublineSchema
>;
export type SerializableTrainingEventDto = z.infer<
  typeof serializableTrainingEventSchema
>;
export type SerializableTrainingSessionDto = z.infer<
  typeof serializableTrainingSessionSchema
>;
export type SerializableTrainingReviewDto = z.infer<
  typeof serializableTrainingReviewSchema
>;
