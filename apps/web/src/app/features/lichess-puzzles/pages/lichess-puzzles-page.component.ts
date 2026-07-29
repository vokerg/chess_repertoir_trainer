import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
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
export class LichessPuzzlesPageComponent {
  protected readonly store = inject(LichessPuzzlesStore);

  protected readonly difficulties: readonly Array<{
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

  protected setRatedFromEvent(event: Event): void {
    this.store.setRated((event.target as HTMLInputElement).checked);
  }

  protected setDifficultyFromEvent(event: Event): void {
    this.store.setDifficulty((event.target as HTMLSelectElement).value);
  }
}
