import type {
  SerializableTrainingSession,
  SerializableTrainingSubline,
} from 'chess-domain/training';

export type LocalTrainingStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED' | 'ERROR';

export type OfflineTrainingContext = {
  courseId: number;
  courseName: string;
  contentRevision: number;
  lineId: number;
  lineName: string;
  localStatus: LocalTrainingStatus;
  resumed: boolean;
  pendingAttemptCount: number;
  session: SerializableTrainingSession;
  subline: SerializableTrainingSubline;
};
