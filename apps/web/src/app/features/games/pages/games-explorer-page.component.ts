import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { PageHeaderAction, PageHeaderComponent, PageHeaderStat } from '../../../shared/ui/page-header/page-header.component';
import { GameFilterPanelComponent } from '../../../shared/games/filters/game-filter-panel.component';
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
    { id: 'ply-indexed', label: 'Ply indexed', value: this.store.plyIndexedCount() },
  ]);
  protected readonly headerActions = computed<readonly PageHeaderAction[]>(() => {
    const actions: PageHeaderAction[] = [
      {
        id: 'index-all',
        label: `Index all: ${this.store.bulkIndexProgressLabel()}`,
        disabled: this.store.loading() || this.store.bulkIndexing() || this.store.bulkIndexableGames().length === 0,
        run: () => this.store.indexAllVisibleGames(),
      },
    ];
    if (this.store.batchAnalysisEnabled()) {
      actions.push({
        id: 'batch-analyse',
        label: `Batch analyse: ${this.store.batchAnalysisProgressLabel()}`,
        disabled: this.store.loading() || this.store.batchAnalysisSubmitting() || this.store.filteredGames().length === 0,
        run: () => this.store.batchAnalyzeVisibleGames(),
      });
    }
    return actions;
  });

  ngOnInit(): void {
    this.store.loadBatchAnalysisConfig();
    this.store.loadFacets();
    this.store.refresh();
  }
}
