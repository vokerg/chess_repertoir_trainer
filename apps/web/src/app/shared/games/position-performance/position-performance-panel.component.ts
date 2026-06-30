import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { gameTagLabel, gameTagTone } from '../game-tag-display';
import { scoreLabel } from '../position-moves/position-game-moves.helpers';
import { OpeningPositionPerformance } from '../position-moves/position-game-moves.models';

@Component({
  selector: 'app-position-performance-panel',
  standalone: true,
  templateUrl: './position-performance-panel.component.html',
  styleUrl: './position-performance-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PositionPerformancePanelComponent {
  readonly performance = input<OpeningPositionPerformance | null>(null);
  readonly loading = input(false);
  readonly title = input('Performance in this position');
  readonly subtitle = input('Distinct imported games that reached this normalized position.');

  protected readonly scoreLabel = scoreLabel;
  protected readonly tagLabel = gameTagLabel;
  protected readonly tagTone = gameTagTone;
  protected readonly topTags = computed(() => this.performance()?.tags.slice(0, 6) ?? []);
  protected readonly buckets = computed(() => this.performance()?.buckets.filter((bucket) => bucket.tags.length > 0) ?? []);
  protected readonly unbucketedTags = computed(() => {
    const performance = this.performance();
    if (!performance) return [];
    const bucketedCodes = new Set(performance.buckets.flatMap((bucket) => bucket.tags.map((tag) => tag.code)));
    return performance.tags.filter((tag) => !bucketedCodes.has(tag.code)).slice(0, 6);
  });
}
