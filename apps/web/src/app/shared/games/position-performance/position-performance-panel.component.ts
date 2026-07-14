import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { gameTagBucket, gameTagBucketLabel, gameTagBucketOrder, gameTagLabel, gameTagTone } from '../game-tag-display';
import { scoreLabel } from '../position-moves/position-game-moves.helpers';
import { OpeningPositionPerformance, OpeningPositionPerformanceBucket } from '../position-moves/position-game-moves.models';

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
  readonly selectableTags = input(false);
  readonly selectedTagCodes = input<readonly number[]>([]);
  readonly tagSelected = output<number>();

  protected readonly scoreLabel = scoreLabel;
  protected readonly tagLabel = gameTagLabel;
  protected readonly tagTone = gameTagTone;
  protected readonly bucketLabel = gameTagBucketLabel;
  protected readonly topTags = computed(() => this.performance()?.tags.slice(0, 6) ?? []);
  protected readonly buckets = computed(() => this.performance()?.buckets.filter((bucket) => bucket.tags.length > 0).sort(compareBuckets) ?? []);
  protected readonly unbucketedTags = computed(() => {
    const performance = this.performance();
    if (!performance) return [];
    return performance.tags.filter((tag) => !gameTagBucket(tag)).slice(0, 6);
  });

  protected isTagSelected(code: number): boolean {
    return this.selectedTagCodes().includes(code);
  }
}

function compareBuckets(left: OpeningPositionPerformanceBucket, right: OpeningPositionPerformanceBucket): number {
  return gameTagBucketOrder(left.key) - gameTagBucketOrder(right.key) || left.label.localeCompare(right.label);
}
