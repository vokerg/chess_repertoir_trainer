import { TestBed } from '@angular/core/testing';
import type { AdminUserSummary } from '@chess-trainer/contracts/admin';
import { AdminUserListComponent } from './admin-user-list.component';

describe('AdminUserListComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AdminUserListComponent] }).compileComponents();
  });

  it('uses native keyboard actions and semantic table structure for user selection', () => {
    const fixture = TestBed.createComponent(AdminUserListComponent);
    fixture.componentRef.setInput('users', [user(11)]);
    fixture.componentRef.setInput('selectedUserId', 11);
    fixture.componentRef.setInput('pageNumber', 1);
    fixture.componentRef.setInput('hasNextPage', false);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const select = root.querySelector<HTMLButtonElement>('.admin-user-button');
    const rowHeader = root.querySelector<HTMLTableCellElement>('tbody th');
    const scroll = root.querySelector<HTMLElement>('.admin-table-scroll');
    const caption = root.querySelector('caption');
    const next = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.includes('Next page'),
    );

    expect(select?.tagName).toBe('BUTTON');
    expect(select?.getAttribute('aria-current')).toBe('true');
    expect(rowHeader?.getAttribute('scope')).toBe('row');
    expect(scroll?.getAttribute('tabindex')).toBe('0');
    expect(caption?.textContent).toContain('Administrator user summaries, page 1');
    expect(next?.disabled).toBeTrue();
  });
});

function user(id: number): AdminUserSummary {
  return {
    id,
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-02T10:00:00.000Z',
    accountCount: 1,
    activeAccountCount: 1,
    importedGameCount: 8,
    courseCount: 2,
    activeWorkCount: 1,
    warnings: [],
  };
}
