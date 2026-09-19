import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';
import type { LichessPuzzleDifficulty } from '@chess-trainer/contracts/lichess-puzzles';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import { LichessPuzzleTrainerComponent } from '../components/lichess-puzzle-trainer.component';
import { LichessPuzzlesApiService } from '../data-access/lichess-puzzles-api.service';
import { LichessPuzzlesStore } from '../state/lichess-puzzles.store';

@Component({
  standalone: true,
  imports: [RouterLink, PageHeaderComponent, PanelComponent, LichessPuzzleTrainerComponent],
  providers: [LichessPuzzlesApiService, LichessPuzzlesStore],
  templateUrl: './lichess-puzzles-page.component.html',
  styleUrl: './lichess-puzzles-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LichessPuzzlesPageComponent implements OnInit {
  protected readonly store = inject(LichessPuzzlesStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly difficulties: ReadonlyArray<{
    value: LichessPuzzleDifficulty;
    label: string;
  }> = [
    { value: 'easiest', label: 'Easiest' },
    { value: 'easier', label: 'Easier' },
    { value: 'normal', label: 'Normal' },
    { value: 'harder', label: 'Harder' },
    { value: 'hardest', label: 'Hardest' },
  ];

  protected readonly settingsLocked = computed(
    () => this.store.round()?.status === 'IN_PROGRESS' || this.store.busy(),
  );

  ngOnInit(): void {
    this.route.queryParamMap.pipe(
      map((params) => parseRoundId(params.get('roundId'))),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((roundId) => {
      if (!roundId || this.store.round()?.id === roundId) return;
      void this.store.loadRound(roundId);
    });
  }

  protected async startRound(): Promise<void> {
    const roundId = await this.store.startRound();
    if (!roundId) return;
    await this.router.navigate(['/puzzles'], {
      queryParams: { roundId },
      replaceUrl: true,
    });
  }

  protected setRatedFromEvent(event: Event): void {
    this.store.setRated((event.target as HTMLInputElement).checked);
  }

  protected setDifficultyFromEvent(event: Event): void {
    this.store.setDifficulty((event.target as HTMLSelectElement).value);
  }
}

function parseRoundId(value: string | null): number | null {
  if (!value) return null;
  const roundId = Number(value);
  return Number.isInteger(roundId) && roundId > 0 ? roundId : null;
}
