import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { AdminApiService } from '../data-access/admin-api.service';
import { AdminDiagnosticsStore } from './admin-diagnostics.store';

describe('AdminDiagnosticsStore lifecycle preview safety', () => {
  let store: AdminDiagnosticsStore;
  let api: jasmine.SpyObj<AdminApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<AdminApiService>('AdminApiService', [
      'getMe',
      'listUsers',
      'getUserDetail',
      'getUserWork',
      'previewLifecycle',
      'executeLifecycle',
      'getLifecycle',
      'stopLifecycle',
    ]);
    TestBed.configureTestingModule({
      providers: [
        AdminDiagnosticsStore,
        { provide: AdminApiService, useValue: api },
      ],
    });
    store = TestBed.inject(AdminDiagnosticsStore);
    store.accessState.set('ready');
    store.selectedUserId.set(7);
  });

  it('invalidates an old destructive preview as soon as lifecycle inputs change', async () => {
    const preview = lifecyclePreview();
    store.lifecycleAccountId.set('5');
    api.previewLifecycle.and.returnValues(
      of(preview),
      throwError(() => ({ status: 409, error: { message: 'replacement preview failed' } })),
    );

    await store.previewLifecycle();
    store.lifecycleConfirmation.set(preview.confirmationPhrase);
    expect(store.lifecyclePreview()?.operationId).toBe(44);

    store.setLifecycleAccountId('6');

    expect(store.lifecyclePreview()).toBeNull();
    expect(store.lifecycleConfirmation()).toBe('');
    expect(store.lifecycleOperation()).toBeNull();

    await store.previewLifecycle();
    expect(store.lifecyclePreview()).toBeNull();
    expect(store.lifecycleError()).toBe('replacement preview failed');

    await store.executeLifecycle();
    expect(api.executeLifecycle).not.toHaveBeenCalled();
  });

  it('does not install a preview response after its lifecycle inputs changed in flight', async () => {
    const preview = lifecyclePreview();
    const response = new Subject<ReturnType<typeof lifecyclePreview>>();
    store.lifecycleAccountId.set('5');
    api.previewLifecycle.and.returnValue(response.asObservable());

    const previewRequest = store.previewLifecycle();
    await Promise.resolve();
    store.setLifecycleAccountId('6');
    response.next(preview);
    response.complete();
    await previewRequest;

    expect(store.lifecyclePreview()).toBeNull();
    expect(store.lifecycleOperation()).toBeNull();
    expect(store.lifecycleConfirmation()).toBe('');
  });

  it('does not submit an old preview when inputs change before execution', async () => {
    const preview = lifecyclePreview();
    store.lifecycleAccountId.set('5');
    api.previewLifecycle.and.returnValue(of(preview));
    await store.previewLifecycle();
    store.lifecycleConfirmation.set(preview.confirmationPhrase);

    store.lifecycleAccountId.set('6');
    await store.executeLifecycle();

    expect(api.executeLifecycle).not.toHaveBeenCalled();
    expect(store.lifecycleError()).toBe('Lifecycle inputs changed. Preview and confirm again.');
  });

  it('executes the administrator request with preview-bound confirmation only', async () => {
    const preview = lifecyclePreview();
    store.lifecycleAccountId.set('5');
    api.previewLifecycle.and.returnValue(of(preview));
    api.executeLifecycle.and.returnValue(of({ ...preview, status: 'FENCING' }));

    await store.previewLifecycle();
    store.lifecycleConfirmation.set(preview.confirmationPhrase);
    await store.executeLifecycle();

    expect(api.executeLifecycle).toHaveBeenCalledOnceWith(
      7,
      preview.operationId,
      jasmine.objectContaining({
        previewToken: preview.previewToken,
        confirmationPhrase: preview.confirmationPhrase,
      }),
    );
    expect(store.lifecycleOperation()?.status).toBe('FENCING');
  });
});

function lifecyclePreview() {
  return {
    operationId: 44,
    action: 'PURGE_ACCOUNT_DATA' as const,
    status: 'PREVIEWED' as const,
    scope: { resourceType: 'ACCOUNT' as const, userId: 7, accountId: 5 },
    previewCounts: {
      accounts: 1,
      games: 3,
      plies: 8,
      analysisRuns: 1,
      aiReviews: 0,
      tacticalDetections: 0,
      scenarioSessions: 0,
      importRuns: 1,
      jobRuns: 0,
      preparationRuns: 0,
    },
    previewExpiresAt: '2026-09-09T07:00:00.000Z',
    confirmationPhrase: 'PURGE ACCOUNT 5',
    warningCodes: [],
    stopRequest: 'NONE' as const,
    firstDestructiveCommitAt: null,
    checkpoint: null,
    verification: null,
    terminalResult: null,
    errorCode: null,
    startedAt: null,
    completedAt: null,
    createdAt: '2026-09-09T06:00:00.000Z',
    updatedAt: '2026-09-09T06:00:00.000Z',
    previewToken: 'preview-token-with-safe-length',
  };
}
