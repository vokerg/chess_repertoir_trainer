import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { GameFilterPanelComponent } from '../../../shared/games/filters/game-filter-panel.component';
import {
  PageHeaderAction,
  PageHeaderComponent,
  PageHeaderStat,
} from '../../../shared/ui/page-header/page-header.component';
import { GamesTableComponent } from '../components/games-table.component';
import { GamesExplorerStore } from '../state/games-explorer.store';

@Component({
  selector: 'app-games-explorer-page',
  standalone: true,
  imports: [GameFilterPanelComponent, GamesTableComponent, PageHeaderComponent],
  providers: [GamesExplorerStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './games-explorer-page.component.html',
  styleUrl: './games-explorer-page.component.scss',
})
export class GamesExplorerPageComponent implements OnInit {
  protected readonly store = inject(GamesExplorerStore);
  protected readonly headerStats = computed<readonly PageHeaderStat[]>(() => [
    { id: 'loaded', label: 'Loaded', value: this.store.filteredGames().length },
    { id: 'analysed', label: 'Analysed', value: this.store.analysedCount() },
    { id: 'ply-indexed', label: 'Indexed', value: this.store.plyIndexedCount() },
  ]);
  protected readonly headerActions = computed<readonly PageHeaderAction[]>(() => {
    const submitting = this.store.submittingKind() !== null;
    const availableTagGames = this.store.filteredGames().filter(
      (game) => !this.store['jobs'].isGameActive(game.id),
    ).length;
    return [
      {
        id: 'index-all',
        label: `Index all: ${this.store.bulkIndexProgressLabel()}`,
        disabled:
          this.store.loading()
          || submitting
          || this.store.bulkIndexableGames().length === 0,
        run: () => this.store.indexAllVisibleGames(),
      },
      {
        id: 'batch-analyse',
        label: `Batch analyse: ${this.store.batchAnalysisProgressLabel()}`,
        disabled:
          this.store.loading()
          || submitting
          || this.store.bulkAnalyzableGames().length === 0,
        run: () => this.store.batchAnalyzeVisibleGames(),
      },
      {
        id: 'tags',
        label: `Refresh tags: ${this.store.bulkRefreshTagsProgressLabel()}`,
        disabled: this.store.loading() || submitting || availableTagGames === 0,
        run: () => this.store.refreshTagsForVisibleGames(),
      },
    ];
  });

  ngOnInit(): void {
    this.store.loadFacets();
    this.store.refresh();
  }
}
