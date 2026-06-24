export type TrainingLogResult = 'IN_PROGRESS' | 'PASSED' | 'FAILED' | 'ABANDONED';

export interface TrainingLogItem {
  id: number;
  startedAt: string;
  completedAt: string | null;
  result: TrainingLogResult;
  courseId: number;
  courseName: string;
  chapterId: number;
  chapterName: string;
  lineId: number;
  lineName: string;
  sequence: string | null;
  isActiveSubline: boolean;
  accuracy: number | null;
  mistakesCount: number;
}

export interface TrainingLogResponse {
  items: TrainingLogItem[];
}
