import { Injectable, inject } from '@angular/core';
import type {
  ActivityPreferencesResponse,
  TodayActivityResponse,
  UpdateActivityPreferences,
} from '@chess-trainer/contracts/activity-feed';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';

@Injectable()
export class ActivityFeedApiService {
  private readonly api = inject(ApiService);

  getToday(): Observable<TodayActivityResponse> {
    return this.api.get<TodayActivityResponse>('/me/activity/today');
  }

  updatePreferences(
    preferences: UpdateActivityPreferences,
  ): Observable<ActivityPreferencesResponse> {
    return this.api.put<ActivityPreferencesResponse>('/me/activity/preferences', preferences);
  }
}
