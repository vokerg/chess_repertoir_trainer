import { TestBed } from '@angular/core/testing';
import type { AdminUserDetailResponse, AdminUserWorkResponse } from '@chess-trainer/contracts/admin';
import { AdminUserDiagnosticsComponent } from './admin-user-diagnostics.component';

describe('AdminUserDiagnosticsComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AdminUserDiagnosticsComponent] }).compileComponents();
  });

  it('renders unavailable sections explicitly instead of inventing zero values', () => {
    const fixture = TestBed.createComponent(AdminUserDiagnosticsComponent);
    fixture.componentRef.setInput('selectedUserId', 5);
    fixture.componentRef.setInput('detailState', 'ready');
    fixture.componentRef.setInput('detail', unavailableDetail(5));
    fixture.componentRef.setInput('workState', 'ready');
    fixture.componentRef.setInput('work', unavailableWork(5));
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Unavailable: QUERY_FAILED');
    expect(text).toContain('Unavailable: MODEL_NOT_AVAILABLE');
    expect(text).not.toContain('Imported games 0');
  });

  it('keeps partial top-level API failure visible while the other diagnostic surface renders', () => {
    const fixture = TestBed.createComponent(AdminUserDiagnosticsComponent);
    fixture.componentRef.setInput('selectedUserId', 5);
    fixture.componentRef.setInput('detailState', 'error');
    fixture.componentRef.setInput('detailError', 'User diagnostics are unavailable.');
    fixture.componentRef.setInput('workState', 'ready');
    fixture.componentRef.setInput('work', availableWork(5));
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('User diagnostics are unavailable.');
    expect(text).toContain('No recent jobs in the bounded result.');
  });
});

function unavailableDetail(userId: number): AdminUserDetailResponse {
  return {
    user: {
      id: userId,
      createdAt: '2026-08-01T10:00:00.000Z',
      updatedAt: '2026-08-02T10:00:00.000Z',
    },
    sections: {
      accounts: { available: false, reason: 'QUERY_FAILED' },
      games: { available: false, reason: 'QUERY_FAILED' },
      courses: { available: false, reason: 'QUERY_FAILED' },
      training: { available: false, reason: 'QUERY_FAILED' },
      preparation: { available: false, reason: 'QUERY_FAILED' },
      footprint: { available: false, reason: 'QUERY_FAILED' },
      lifecycle: { available: false, reason: 'MODEL_NOT_AVAILABLE' },
    },
  };
}

function unavailableWork(userId: number): AdminUserWorkResponse {
  return {
    userId,
    sections: {
      jobs: { available: false, reason: 'QUERY_FAILED' },
      imports: { available: false, reason: 'QUERY_FAILED' },
      preparation: { available: false, reason: 'QUERY_FAILED' },
      lifecycle: { available: false, reason: 'MODEL_NOT_AVAILABLE' },
    },
  };
}

function availableWork(userId: number): AdminUserWorkResponse {
  return {
    userId,
    sections: {
      jobs: { available: true, items: [] },
      imports: { available: true, queuedCount: 0, items: [], warnings: [] },
      preparation: { available: true, items: [] },
      lifecycle: { available: false, reason: 'MODEL_NOT_AVAILABLE' },
    },
  };
}
