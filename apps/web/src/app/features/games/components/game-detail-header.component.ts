import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ImportedGameDetail } from '../data-access/games.models';
import {
  gameDateLabel,
  providerLabel,
  timeControlLabel,
} from '../helpers/game-detail-labels';

@Component({
  selector: 'app-game-detail-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './game-detail-header.component.html',
  styleUrl: './game-detail-header.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameDetailHeaderComponent {
  readonly game = input<ImportedGameDetail | null>(null);
  readonly title = input.required<string>();
  readonly fullRefreshing = input(false);
  readonly aiReviewAvailable = input(false);
  readonly aiReviewGenerated = input(false);
  readonly aiReviewGenerating = input(false);
  readonly aiReviewDisabled = input(false);
  readonly fullRefresh = output<void>();
  readonly generateAiReview = output<void>();

  protected readonly fullRefreshAction = computed(() => ({
    disabled: !this.game() || this.fullRefreshing(),
    label: this.fullRefreshing() ? 'Game workflow in background...' : 'Full refresh',
  }));

  protected readonly aiReviewAction = computed(() => ({
    disabled: this.aiReviewDisabled() || this.aiReviewGenerating(),
    label: this.aiReviewGenerating()
      ? 'Generating AI overview...'
      : this.aiReviewGenerated() ? 'Regenerate AI overview' : 'Generate AI overview',
  }));

  protected readonly providerLabel = providerLabel;
  protected readonly gameDateLabel = gameDateLabel;
  protected readonly timeControlLabel = timeControlLabel;
}
