import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { ActivityFeedApiService } from './activity-feed-api.service';

describe('ActivityFeedApiService', () => {
  let service: ActivityFeedApiService;
  let api: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'put']);
    api.get.and.returnValue(of({}));
    api.put.and.returnValue(of({}));

    TestBed.configureTestingModule({
      providers: [
        ActivityFeedApiService,
        { provide: ApiService, useValue: api },
      ],
    });
    service = TestBed.inject(ActivityFeedApiService);
  });

  it('uses the ACT-001 today and preference endpoints', () => {
    service.getToday().subscribe();
    service.updatePreferences({ timeZone: 'Europe/Copenhagen' }).subscribe();

    expect(api.get).toHaveBeenCalledOnceWith('/me/activity/today');
    expect(api.put).toHaveBeenCalledOnceWith('/me/activity/preferences', {
      timeZone: 'Europe/Copenhagen',
    });
  });
});
