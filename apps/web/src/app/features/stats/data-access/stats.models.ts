export interface StatsSummary {
  totalCourses: number;
  totalLines: number;
  totalTrainingSessions: number;
  weakestLines: Array<{ id: number; name: string; failureRate: number }>;
}
