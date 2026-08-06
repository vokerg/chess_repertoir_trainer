import type { DailyGoalId } from '../activity-feed';

export interface HomeTodayGoal {
  id: DailyGoalId;
  label: string;
  current: number;
  target: number;
  completed: boolean;
  progressPercent: number;
}

export interface HomeTodayActivity {
  date: string;
  timeZone: string;
  goals: readonly HomeTodayGoal[];
  completedGoals: number;
  totalGoals: number;
  completionPercent: number;
  allCompleted: boolean;
  hasProgress: boolean;
}
