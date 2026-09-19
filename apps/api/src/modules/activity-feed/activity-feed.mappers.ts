import type { ActivityAggregate } from '@chess-trainer/contracts/activity-feed';
import type { ActivityAggregateRecord } from './activity-feed.types';

export function databaseDateToDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function mapActivityAggregate(record: ActivityAggregateRecord): ActivityAggregate {
  return {
    type: record.type,
    count: record.count,
    firstOccurredAt: record.firstOccurredAt?.toISOString() ?? null,
    lastOccurredAt: record.lastOccurredAt?.toISOString() ?? null,
  };
}
