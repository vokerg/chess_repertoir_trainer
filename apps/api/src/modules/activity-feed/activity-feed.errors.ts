import type { ActivityFeedErrorCode } from '@chess-trainer/contracts/activity-feed';

export class ActivityFeedError extends Error {
  constructor(
    message: string,
    readonly code: ActivityFeedErrorCode,
  ) {
    super(message);
    this.name = 'ActivityFeedError';
  }
}

export class ActivityRangeTooLargeError extends ActivityFeedError {
  constructor(maximumDays: number) {
    super(`Activity history range cannot exceed ${maximumDays} days`, 'ACTIVITY_RANGE_TOO_LARGE');
    this.name = 'ActivityRangeTooLargeError';
  }
}

export class InvalidActivityTypeError extends ActivityFeedError {
  constructor(type: string) {
    super(`Unsupported activity type: ${type}`, 'INVALID_ACTIVITY_TYPE');
    this.name = 'InvalidActivityTypeError';
  }
}

export class InvalidActivityValueError extends ActivityFeedError {
  constructor(message: string) {
    super(message, 'INVALID_ACTIVITY_VALUE');
    this.name = 'InvalidActivityValueError';
  }
}

export class InvalidTimeZoneError extends ActivityFeedError {
  constructor(timeZone: string) {
    super(`Invalid IANA time zone: ${timeZone}`, 'INVALID_TIME_ZONE');
    this.name = 'InvalidTimeZoneError';
  }
}

export class TimeZoneChangeRequiresRebuildError extends ActivityFeedError {
  constructor() {
    super(
      'The time zone cannot change after activity exists until a calendar-day rebuild is available',
      'TIME_ZONE_CHANGE_REQUIRES_REBUILD',
    );
    this.name = 'TimeZoneChangeRequiresRebuildError';
  }
}
