import {
  mobileTrainingAttemptSchema,
  type MobileTrainingAttemptDto,
} from '@chess-trainer/contracts/mobile-sync';
import type {
  SerializableTrainingSession,
  SerializableTrainingSubline,
} from 'chess-domain/training';

export function buildMobileTrainingAttempt(
  courseId: number,
  subline: SerializableTrainingSubline,
  session: SerializableTrainingSession,
): MobileTrainingAttemptDto {
  if (!session.completed || !session.completedAt || session.status === 'IN_PROGRESS') {
    throw new Error('Only completed local sessions can become synchronization attempts.');
  }
  return mobileTrainingAttemptSchema.parse({
    attemptSchemaVersion: 1,
    clientAttemptId: session.sessionId,
    courseId,
    courseContentRevision: session.courseContentRevision,
    trainingMode: 'LINE',
    session,
    subline,
    events: session.events,
    counters: session.counters,
  });
}
