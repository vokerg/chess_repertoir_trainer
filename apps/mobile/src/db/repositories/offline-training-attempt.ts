import {
  mobileTrainingAttemptSchema,
  type MobileTrainingAttemptDto,
} from '@chess-trainer/contracts/mobile-sync';
import type {
  SerializableTrainingSession,
  SerializableTrainingSubline,
} from 'chess-domain/training';
import type { OfflineTrainingMode } from './offline-marathon-policy';

export function buildMobileTrainingAttempt(
  courseId: number,
  subline: SerializableTrainingSubline,
  session: SerializableTrainingSession,
  trainingMode: OfflineTrainingMode = 'LINE',
): MobileTrainingAttemptDto {
  if (!session.completed || !session.completedAt || session.status === 'IN_PROGRESS') {
    throw new Error('Only completed local sessions can become synchronization attempts.');
  }
  return mobileTrainingAttemptSchema.parse({
    attemptSchemaVersion: 1,
    clientAttemptId: session.sessionId,
    courseId,
    courseContentRevision: session.courseContentRevision,
    trainingMode,
    session,
    subline,
    events: session.events,
    counters: session.counters,
  });
}
