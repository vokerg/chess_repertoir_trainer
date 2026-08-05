import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import type {
  LichessGamesRatingGroup,
  LichessGamesRatingTarget,
} from '@chess-trainer/contracts/opening-explorer';
import { repertoireBuilderPersonaPresets } from '../helpers/repertoire-builder-target';
import type { RepertoireBuilderSetup } from '../state/repertoire-builder.models';

interface RatingOption {
  value: string;
  label: string;
  target: LichessGamesRatingTarget;
  ratingGroup: LichessGamesRatingGroup | null;
}

const SPEED_OPTIONS = [
  { value: 'ALL', label: 'All speeds' },
  { value: 'BLITZ_AND_SLOWER', label: 'Blitz and slower' },
  { value: 'BLITZ', label: 'Blitz' },
  { value: 'BULLET', label: 'Bullet' },
] as const;

const RATING_OPTIONS: readonly RatingOption[] = [
  { value: 'ALL', label: 'All players', target: 'ALL', ratingGroup: null },
  { value: 'MY_PEERS', label: 'My peers', target: 'MY_PEERS', ratingGroup: null },
  {
    value: 'MY_PEERS_PLUS_ONE',
    label: 'My peers and one group higher',
    target: 'MY_PEERS_PLUS_ONE',
    ratingGroup: null,
  },
  { value: 'GROUP:0', label: '< 1000', target: 'GROUP', ratingGroup: 0 },
  { value: 'GROUP:1000', label: '1000–1199', target: 'GROUP', ratingGroup: 1000 },
  { value: 'GROUP:1200', label: '1200–1399', target: 'GROUP', ratingGroup: 1200 },
  { value: 'GROUP:1400', label: '1400–1599', target: 'GROUP', ratingGroup: 1400 },
  { value: 'GROUP:1600', label: '1600–1799', target: 'GROUP', ratingGroup: 1600 },
  { value: 'GROUP:1800', label: '1800–1999', target: 'GROUP', ratingGroup: 1800 },
  { value: 'GROUP:2000', label: '2000–2199', target: 'GROUP', ratingGroup: 2000 },
  { value: 'GROUP:2200', label: '2200–2499', target: 'GROUP', ratingGroup: 2200 },
  { value: 'GROUP:2500', label: '2500+', target: 'GROUP', ratingGroup: 2500 },
];

@Component({
  selector: 'app-repertoire-builder-setup-dialog',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './repertoire-builder-setup-dialog.component.html',
  styleUrl: './repertoire-builder-setup-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RepertoireBuilderSetupDialogComponent {
  private readonly destroyRef = inject(DestroyRef);

  readonly initialSetup = input.required<RepertoireBuilderSetup>();
  readonly fixedSide = input<'WHITE' | 'BLACK' | null>(null);
  readonly profileSuggestion = input<string | null>(null);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly replacingDraft = input(false);

  readonly submitted = output<RepertoireBuilderSetup>();
  readonly cancelled = output<void>();

  protected readonly speedOptions = SPEED_OPTIONS;
  protected readonly ratingOptions = RATING_OPTIONS;
  protected readonly personaPresets = repertoireBuilderPersonaPresets;
  protected readonly theoryOptions = ['LOW', 'MEDIUM', 'HIGH'] as const;

  protected readonly form = new FormGroup({
    side: new FormControl<'WHITE' | 'BLACK'>('WHITE', { nonNullable: true }),
    speedPreset: new FormControl<RepertoireBuilderSetup['speedPreset']>('BLITZ_AND_SLOWER', {
      nonNullable: true,
    }),
    ratingSelection: new FormControl('MY_PEERS_PLUS_ONE', { nonNullable: true }),
    persona: new FormControl<RepertoireBuilderSetup['persona']>('BALANCED', { nonNullable: true }),
    maximumTheoryBurden: new FormControl<RepertoireBuilderSetup['maximumTheoryBurden']>('MEDIUM', {
      nonNullable: true,
    }),
    coveragePercent: new FormControl(80, {
      nonNullable: true,
      validators: [Validators.min(50), Validators.max(100)],
    }),
  });

  constructor() {
    effect(() => {
      this.patchFromSetup(this.initialSetup());
      const fixedSide = this.fixedSide();
      if (fixedSide) {
        this.form.controls.side.setValue(fixedSide, { emitEvent: false });
        this.form.controls.side.disable({ emitEvent: false });
      } else if (this.form.controls.side.disabled) {
        this.form.controls.side.enable({ emitEvent: false });
      }
    });
    this.form.controls.persona.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((persona) => {
        const preset = this.personaPresets.find((entry) => entry.id === persona);
        if (!preset) return;
        this.form.patchValue({
          maximumTheoryBurden: preset.defaultTheoryBurden,
          coveragePercent: preset.defaultCoveragePercent,
        });
      });
  }

  protected submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const rating = this.ratingOptions.find((option) => option.value === value.ratingSelection);
    if (!rating) return;
    const profileDefaults = this.initialSetup().profileDefaults;
    this.submitted.emit({
      side: value.side,
      speedPreset: value.speedPreset,
      ratingTarget: rating.target,
      ratingGroup: rating.ratingGroup,
      persona: value.persona,
      maximumTheoryBurden: value.maximumTheoryBurden,
      coveragePercent: value.coveragePercent,
      ...(profileDefaults?.setup.side === value.side ? { profileDefaults } : {}),
    });
  }

  protected cancel(): void {
    if (!this.loading()) this.cancelled.emit();
  }

  private patchFromSetup(setup: RepertoireBuilderSetup): void {
    const ratingSelection = setup.ratingTarget === 'GROUP' && setup.ratingGroup !== null
      ? `GROUP:${setup.ratingGroup}`
      : setup.ratingTarget;
    this.form.setValue({
      side: setup.side,
      speedPreset: setup.speedPreset,
      ratingSelection,
      persona: setup.persona,
      maximumTheoryBurden: setup.maximumTheoryBurden,
      coveragePercent: setup.coveragePercent,
    }, { emitEvent: false });
  }
}
