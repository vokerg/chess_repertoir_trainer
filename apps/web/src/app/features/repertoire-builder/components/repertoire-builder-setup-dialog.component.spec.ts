import { ComponentFixture, TestBed } from '@angular/core/testing';
import { defaultRepertoireBuilderSetup } from '../helpers/repertoire-builder-target';
import type {
  RepertoireBuilderProfileDefaults,
  RepertoireBuilderSetup,
} from '../state/repertoire-builder.models';
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
    expect(root.querySelector('[aria-label="Opponent-response coverage percent"]')).toBeNull();
    expect(root.textContent).toContain('playable minimum');
    expect(root.textContent).not.toContain('coverage default');
    expect(root.textContent).toContain('Coverage is feedback from the replies you actually select');
  });

  it('makes replacement explicit when setup is reopened from an active draft', () => {
    fixture.componentRef.setInput('replacingDraft', true);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Restart this draft with a new target');
    expect(root.textContent).toContain('replaces the current route-local draft');
    expect(root.querySelector('button[type="submit"]')?.textContent).toContain('Replace draft');
  });

  it('allows an initial setup to be cancelled from the backdrop or action button', () => {
    const cancelled = jasmine.createSpy('cancelled');
    fixture.componentInstance.cancelled.subscribe(cancelled);

    const root = fixture.nativeElement as HTMLElement;
    (root.querySelector('.setup-backdrop') as HTMLDivElement).click();
    fixture.detectChanges();
    (root.querySelector('.secondary-button') as HTMLButtonElement).click();

    expect(cancelled).toHaveBeenCalledTimes(2);
  });

  it('emits one explicit standard target setup without hidden provenance', () => {
    const submissions: RepertoireBuilderSetup[] = [];
    fixture.componentInstance.submitted.subscribe((value) => submissions.push(value));

    const submit = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    submit.click();
    fixture.detectChanges();

    expect(submissions).toEqual([defaultRepertoireBuilderSetup()]);
    expect(submissions[0].profileDefaults).toBeUndefined();
  });

  it('preserves immutable profile provenance while its side remains selected', () => {
    const profileDefaults = createProfileDefaults();
    fixture.componentRef.setInput('initialSetup', {
      ...profileDefaults.setup,
      profileDefaults,
    });
    fixture.componentRef.setInput('profileSuggestion', '16 profiled white games · Solid intent');
    fixture.detectChanges();

    const submissions: RepertoireBuilderSetup[] = [];
    fixture.componentInstance.submitted.subscribe((value) => submissions.push(value));
    (fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Suggested from Chess profile');
    expect(submissions[0].profileDefaults).toEqual(profileDefaults);
  });

  it('drops profile provenance when the user deliberately changes side', () => {
    const profileDefaults = createProfileDefaults();
    fixture.componentRef.setInput('initialSetup', {
      ...profileDefaults.setup,
      profileDefaults,
    });
    fixture.componentRef.setInput('profileSuggestion', '16 profiled white games · Solid intent');
    fixture.detectChanges();

    const black = fixture.nativeElement.querySelector('input[value="BLACK"]') as HTMLInputElement;
    black.click();
    fixture.detectChanges();

    const submissions: RepertoireBuilderSetup[] = [];
    fixture.componentInstance.submitted.subscribe((value) => submissions.push(value));
    (fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(submissions[0].side).toBe('BLACK');
    expect(submissions[0].profileDefaults).toBeUndefined();
  });
});

function createProfileDefaults(): RepertoireBuilderProfileDefaults {
  return {
    source: {
      kind: 'PLAYER_PROFILE',
      profileContractVersion: '2026-07-v1',
      profileGeneratedAt: '2026-07-30T18:00:00.000Z',
      classificationVersion: '2026-07-rules-v2',
    },
    setup: {
      side: 'WHITE',
      speedPreset: 'BLITZ_AND_SLOWER',
      ratingTarget: 'MY_PEERS',
      ratingGroup: null,
      persona: 'SOLID',
      maximumTheoryBurden: 'LOW',
      coveragePercent: 85,
    },
  };
}
