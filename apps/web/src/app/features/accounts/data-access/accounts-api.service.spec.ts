import { TestBed } from '@angular/core/testing';
import type {
  DataLifecycleExecuteRequest,
  DataLifecyclePreviewResponse,
} from '@chess-trainer/contracts/data-lifecycle';
import { firstValueFrom, of } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { AccountsApiService } from './accounts-api.service';

describe('AccountsApiService lifecycle endpoints', () => {
  let service: AccountsApiService;
  let api: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'post']);
    TestBed.configureTestingModule({
      providers: [AccountsApiService, { provide: ApiService, useValue: api }],
    });
    service = TestBed.inject(AccountsApiService);
  });

  it('uses the account-scoped self-service lifecycle protocol', async () => {
    const preview = { operationId: 44 } as DataLifecyclePreviewResponse;
    const execute: DataLifecycleExecuteRequest = {
      previewToken: 'preview-token-with-safe-length',
      confirmationPhrase: 'PURGE ACCOUNT 5',
      idempotencyKey: 'stable-key-44',
    };
    api.post.and.returnValue(of(preview as never));

    await firstValueFrom(service.previewLifecycle({ action: 'PURGE_ACCOUNT_DATA', accountId: 5 }));
    await firstValueFrom(service.executeLifecycle(44, execute));
    await firstValueFrom(service.stopLifecycle(44));
    api.get.and.returnValue(of(preview as never));
    await firstValueFrom(service.getLifecycle(44));

    expect(api.post.calls.argsFor(0)).toEqual([
      '/me/data-lifecycle/preview',
      { action: 'PURGE_ACCOUNT_DATA', accountId: 5 },
    ]);
    expect(api.post.calls.argsFor(1)).toEqual([
      '/me/data-lifecycle/44/execute',
      execute,
    ]);
    expect(api.post.calls.argsFor(2)).toEqual(['/me/data-lifecycle/44/stop', {}]);
    expect(api.get).toHaveBeenCalledOnceWith('/me/data-lifecycle/44');
  });
});
