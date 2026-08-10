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

  it('presents one focused setup dialog without coverage or theory controls', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[role="dialog"]')).not.toBeNull();
    expect(root.textContent).toContain('Set up this repertoire draft');
    expect(root.querySelector('[formControlName="startingScope"]')).not.toBeNull();
    expect(root.querySelector('[formControlName="maximumTheoryBurden"]')).toBeNull();
    expect(root.querySelector('[formControlName="coveragePercent"]')).toBeNull();
    expect(root.querySelector('input[type="range"]')).toBeNull();
    expect(root.textContent).toContain('Practical peer-tested choices with sound validation.');
    expect(root.textContent).toContain('Uncommon viable choices that overperform in the selected population.');
    expect(root.textContent).toContain('Coverage is feedback from the replies you select');
  });

  it('changes scoped-start shortcuts with the selected repertoire side', () => {
    const root = fixture.nativeElement as HTMLElement;
    const scope = root.querySelector('[formControlName="startingScope"]') as HTMLSelectElement;
    expect(scope.textContent).toContain('Start with 1.e4');

    const black = root.querySelector('input[value="BLACK"]') as HTMLInputElement;
    black.click();
    fixture.detectChanges();

    expect(scope.textContent).toContain('Against 1.e4');
    expect(scope.textContent).toContain('All White first moves');
  });

  it('validates and emits an other/manual starting position', () => {
    const submissions: RepertoireBuilderSetup[] = [];
    fixture.componentInstance.submitted.subscribe((value) => submissions.push(value));
    const root = fixture.nativeElement as HTMLElement;
    const scope = root.querySelector('[formControlName="startingScope"]') as HTMLSelectElement;
    scope.value = 'CUSTOM';
    scope.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const manual = root.querySelector('[formControlName="customStartingPosition"]') as HTMLTextAreaElement;
    manual.value = '1. e4 c5';
    manual.dispatchEvent(new Event('input'));
    (root.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(submissions).toHaveSize(1);
    expect(submissions[0]).toEqual(jasmine.objectContaining({
      startingScope: 'CUSTOM',
      customStartingPosition: '1. e4 c5',
      maximumTheoryBurden: 'MEDIUM',
      coveragePercent: 80,
    }));
  });

  it('keeps an invalid manual start in the dialog', () => {
    const submissions: RepertoireBuilderSetup[] = [];
    fixture.componentInstance.submitted.subscribe((value) => submissions.push(value));
    const root = fixture.nativeElement as HTMLElement;
    const scope = root.querySelector('[formControlName="startingScope"]') as HTMLSelectElement;
    scope.value = 'CUSTOM';
    scope.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const manual = root.querySelector('[formControlName="customStartingPosition"]') as HTMLTextAreaElement;
    manual.value = 'not a chess position';
    manual.dispatchEvent(new Event('input'));
    (root.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(submissions).toEqual([]);
    expect(root.textContent).toContain('Could not read this as FEN, PGN, SAN, or UCI moves.');
  });

  it('keeps exact course launches fixed instead of asking for an irrelevant scope', () => {
    fixture.componentRef.setInput('fixedSide', 'WHITE');
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[formControlName="startingScope"]')).toBeNull();
    expect(root.textContent).toContain('Exact course position');
    expect(root.textContent).toContain('source link fixes the exact line position');
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
      startingScope: 'FULL',
      customStartingPosition: '',
      speedPreset: 'BLITZ_AND_SLOWER',
      ratingTarget: 'MY_PEERS',
      ratingGroup: null,
      persona: 'SOLID',
      maximumTheoryBurden: 'MEDIUM',
      coveragePercent: 80,
    },
  };
}
