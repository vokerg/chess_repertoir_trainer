import { ComponentFixture, TestBed } from '@angular/core/testing';
import { defaultRepertoireBuilderSetup } from '../helpers/repertoire-builder-target';
import type { RepertoireBuilderSetup } from '../state/repertoire-builder.models';
import { RepertoireBuilderSetupDialogComponent } from './repertoire-builder-setup-dialog.component';

describe('RepertoireBuilderSetupDialogComponent', () => {
  let fixture: ComponentFixture<RepertoireBuilderSetupDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RepertoireBuilderSetupDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RepertoireBuilderSetupDialogComponent);
    fixture.componentRef.setInput('initialSetup', defaultRepertoireBuilderSetup());
    fixture.detectChanges();
  });

  it('presents the bounded setup and non-persistence boundary accessibly', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[role="dialog"]')).not.toBeNull();
    expect(root.textContent).toContain('Choose the target for this draft');
    expect(root.textContent).toContain('Refreshing the page starts a new draft');
    expect(root.querySelector('[aria-label="Opponent-response coverage percent"]')).not.toBeNull();
  });

  it('makes replacement explicit when setup is reopened from an active draft', () => {
    fixture.componentRef.setInput('cancelAllowed', true);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Restart this draft with a new target');
    expect(root.textContent).toContain('replaces the current route-local draft');
    expect(root.querySelector('button[type="submit"]')?.textContent).toContain('Replace draft');
  });

  it('emits one explicit target setup', () => {
    const submissions: RepertoireBuilderSetup[] = [];
    fixture.componentInstance.submitted.subscribe((value) => submissions.push(value));

    const submit = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    submit.click();
    fixture.detectChanges();

    expect(submissions).toEqual([defaultRepertoireBuilderSetup()]);
  });
});
