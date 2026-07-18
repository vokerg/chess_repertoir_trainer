import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';
import { PageHeaderAction, PageHeaderComponent, PageHeaderStat } from '../../../shared/ui/page-header/page-header.component';
import { GameFilterPanelComponent } from '../../../shared/games/filters/game-filter-panel.component';
import { gamesExplorerLinkQueryParams } from '../../../shared/games/navigation/games-explorer-link.helper';
import { GamesTableComponent } from '../components/games-table.component';
import {
  defaultGamesExplorerQuery,
  gamesExplorerRouteQueriesEqual,
  importedGameSearchCriteriaEqual,
  parseGamesExplorerRouteQuery,
} from '../helpers/games-explorer-route-query.helpers';
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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly headerStats = computed<readonly PageHeaderStat[]>(() => [
    { id: 'loaded', label: 'Loaded', value: this.store.filteredGames().length },
    { id: 'analysed', label: 'Analysed', value: this.store.analysedCount() },
    { id: 'ply-indexed', label: 'Indexed', value: this.store.plyIndexedCount() },
  ]);
  protected readonly headerActions = computed<readonly PageHeaderAction[]>(() => {
    const submitting = this.store.submittingKind() !== null;
    return [
      {
        id: 'index-all',
        label: `Index all: ${this.store.bulkIndexProgressLabel()}`,
        disabled: this.store.loading() || submitting || this.store.bulkIndexableGames().length === 0,
        run: () => this.store.indexAllVisibleGames(),
      },
      {
        id: 'batch-analyse',
        label: `Batch analyse: ${this.store.batchAnalysisProgressLabel()}`,
        disabled: this.store.loading() || submitting || this.store.bulkAnalyzableGames().length === 0,
        run: () => this.store.batchAnalyzeVisibleGames(),
      },
      {
        id: 'tags',
        label: `Refresh tags: ${this.store.bulkRefreshTagsProgressLabel()}`,
        disabled: this.store.loading() || submitting || this.store.filteredGames().length === 0,
        run: () => this.store.refreshTagsForVisibleGames(),
      },
    ];
  });

  ngOnInit(): void {
    this.store.loadFacets();
    this.route.queryParamMap.pipe(
      map((params) => parseGamesExplorerRouteQuery(params)),
      distinctUntilChanged(gamesExplorerRouteQueriesEqual),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((routeQuery) => this.store.applyRouteQuery(routeQuery.query));
  }

  protected applyFilters(): void {
    const draftQuery = this.store.draftQuery();
    const current = parseGamesExplorerRouteQuery(this.route.snapshot.queryParamMap);
    const currentKeys = new Set(this.route.snapshot.queryParamMap.keys);
    const targetParams = gamesExplorerLinkQueryParams(draftQuery);
    const targetKeys = Object.keys(targetParams);
    const isCanonicalUrl = currentKeys.size === targetKeys.length &&
      targetKeys.every((key) => this.route.snapshot.queryParamMap.get(key) === targetParams[key]);

    if (isCanonicalUrl && importedGameSearchCriteriaEqual(current.query, draftQuery)) {
      this.store.refresh();
      return;
    }

    void this.router.navigate(['/games'], { queryParams: targetParams });
  }

  protected resetFilters(): void {
    if (this.route.snapshot.queryParamMap.keys.length === 0) {
      this.store.applyRouteQuery(defaultGamesExplorerQuery());
      return;
    }
    void this.router.navigate(['/games']);
  }
}
