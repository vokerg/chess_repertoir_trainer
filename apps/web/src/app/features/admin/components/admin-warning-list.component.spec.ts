import { TestBed } from '@angular/core/testing';
import type { AdminWarning } from '@chess-trainer/contracts/admin';
import { AdminWarningListComponent } from './admin-warning-list.component';

describe('AdminWarningListComponent', () => {
  it('renders the exact warning code and measured evidence without timing promises', async () => {
    await TestBed.configureTestingModule({ imports: [AdminWarningListComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AdminWarningListComponent);
    const warning: AdminWarning = {
      code: 'DIRECT_USER_QUEUE_AGE_HIGH',
      policyVersion: 'ONB-007-2026-08-03-v1',
      evidence: {
        metric: 'queueAgeSeconds',
        observed: 18,
        threshold: 10,
        unit: 'SECONDS',
      },
    };
    fixture.componentRef.setInput('warnings', [warning]);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('DIRECT_USER_QUEUE_AGE_HIGH');
    expect(text).toContain('queueAgeSeconds: observed 18 SECONDS; threshold 10 SECONDS.');
    expect(text).toContain('ONB-007-2026-08-03-v1');
    expect(text.toLowerCase()).not.toContain('eta');
    expect(text.toLowerCase()).not.toContain('within');
  });
});
