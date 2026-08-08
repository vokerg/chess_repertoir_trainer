import { TestBed } from '@angular/core/testing';
import type { AdminMeResponse, AdminUserListResponse } from '@chess-trainer/contracts/admin';
import { firstValueFrom, of } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { AdminApiService } from './admin-api.service';

describe('AdminApiService', () => {
  let service: AdminApiService;
  let api: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['get']);
    TestBed.configureTestingModule({
      providers: [
        AdminApiService,
        { provide: ApiService, useValue: api },
      ],
    });
    service = TestBed.inject(AdminApiService);
  });

  it('loads server-derived administrator capability state', async () => {
    const response: AdminMeResponse = {
      capabilities: ['ADMIN_DIAGNOSTICS_READ'],
      actorKeyVersion: 1,
      sessionEvidence: {
        hasVerifiedSession: true,
        hasFactorVerificationAge: false,
        hasReverificationId: false,
      },
      requestBudget: {
        enforcement: 'UNENFORCED',
        scope: 'STRICT_BOUNDS_AND_SECURITY_TELEMETRY',
      },
    };
    api.get.and.returnValue(of(response));

    expect(await firstValueFrom(service.getMe())).toEqual(response);
    expect(api.get).toHaveBeenCalledOnceWith('/admin/me');
  });

  it('keeps user pagination cursor-bounded in the request', async () => {
    const response: AdminUserListResponse = { items: [], nextCursor: null };
    api.get.and.returnValue(of(response));

    await firstValueFrom(service.listUsers('opaque cursor', 25));

    expect(api.get).toHaveBeenCalledOnceWith('/admin/users?limit=25&cursor=opaque+cursor');
  });

  it('uses bounded detail and work endpoints for the selected user', async () => {
    api.get.and.returnValues(
      of({} as never),
      of({} as never),
    );

    await firstValueFrom(service.getUserDetail(17));
    await firstValueFrom(service.getUserWork(17, 20));

    expect(api.get.calls.argsFor(0)).toEqual(['/admin/users/17']);
    expect(api.get.calls.argsFor(1)).toEqual(['/admin/users/17/work?limit=20']);
  });

});
