import type { ActivityType, DailyGoalId } from '@chess-trainer/contracts/activity-feed';

export const ACTIVITY_TYPE_ORDER: readonly ActivityType[] = [
  'GAMES_PLAYED',
  'REPERTOIRE_LINES_TRAINED',
  'LICHESS_PUZZLES_COMPLETED',
  'TACTICAL_SCENARIOS_COMPLETED',
  'GAME_ANALYSES_COMPLETED',
];

export interface ActivityAggregateRecord {
  id: number;
  userId: number;
  activityDate: Date;
  type: ActivityType;
  count: number;
  firstOccurredAt: Date | null;
  lastOccurredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActivityIncrementInput {
  userId: number;
  activityDate: Date;
  type: ActivityType;
  amount: number;
  occurredAt: Date;
}

export interface ActivityReconcileInput {
  userId: number;
  activityDate: Date;
  type: ActivityType;
  count: number;
  firstOccurredAt: Date | null;
  lastOccurredAt: Date | null;
}

export interface StaticDailyGoalDefinition {
  id: DailyGoalId;
  activityType: ActivityType;
  label: string;
  target: number;
}
