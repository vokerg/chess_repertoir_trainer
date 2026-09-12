import { TestBed } from '@angular/core/testing';
import type { DataLifecyclePreviewResponse } from '@chess-trainer/contracts/data-lifecycle';
import { DataLifecycleSafetyComponent } from './data-lifecycle-safety.component';

describe('DataLifecycleSafetyComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataLifecycleSafetyComponent],
    }).compileComponents();
  });

  it('shows every exact preview counter and keeps execution gated by the phrase', () => {
    const fixture = TestBed.createComponent(DataLifecycleSafetyComponent);
    const preview = lifecyclePreview();
    fixture.componentRef.setInput('preview', preview);
    fixture.componentRef.setInput('operation', preview);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('External accounts');
    expect(root.textContent).toContain('Tactical detections');
    expect(root.textContent).toContain('Preparation runs');
    expect(root.textContent).toContain('No data is changed by this preview.');
    expect(root.querySelector('button.danger')?.hasAttribute('disabled')).toBeTrue();

    fixture.componentRef.setInput('confirmation', preview.confirmationPhrase);
    fixture.detectChanges();

    expect(root.querySelector('button.danger')?.hasAttribute('disabled')).toBeFalse();
  });
});

function lifecyclePreview(): DataLifecyclePreviewResponse {
  return {
    operationId: 44,
    action: 'PURGE_ACCOUNT_DATA',
    status: 'PREVIEWED',
    scope: { resourceType: 'ACCOUNT', userId: 1, accountId: 5 },
    previewCounts: {
      accounts: 1,
      games: 3,
      plies: 8,
      analysisRuns: 1,
      aiReviews: 2,
      tacticalDetections: 3,
      scenarioSessions: 4,
      importRuns: 5,
      jobRuns: 6,
      preparationRuns: 7,
    },
    previewExpiresAt: '2026-09-12T12:00:00.000Z',
    confirmationPhrase: 'PURGE ACCOUNT 5',
    warningCodes: ['DESTRUCTIVE_OPERATION'],
    stopRequest: 'NONE',
    firstDestructiveCommitAt: null,
    checkpoint: null,
    verification: null,
    terminalResult: null,
    errorCode: null,
    startedAt: null,
    completedAt: null,
    createdAt: '2026-09-12T11:50:00.000Z',
    updatedAt: '2026-09-12T11:50:00.000Z',
    previewToken: 'preview-token-with-safe-length',
  };
}
