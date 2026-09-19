import type {
  SerializableTrainingSession,
  SerializableTrainingSubline,
} from 'chess-domain/training';
import type { OfflineTrainingMode } from './offline-marathon-policy';

export type LocalTrainingStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED' | 'ERROR';

export type OfflineTrainingContext = {
  courseId: number;
  courseName: string;
  contentRevision: number;
  lineId: number;
  lineName: string;
  trainingMode: OfflineTrainingMode;
  marathonRunId: string | null;
  localStatus: LocalTrainingStatus;
  resumed: boolean;
  pendingAttemptCount: number;
  session: SerializableTrainingSession;
  subline: SerializableTrainingSubline;
};
