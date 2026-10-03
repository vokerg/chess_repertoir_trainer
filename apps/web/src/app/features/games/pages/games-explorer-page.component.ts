import type { GameLibrary } from '@chess-trainer/contracts/imported-games';
import { GameLibrariesPanelComponent } from '../components/game-libraries-panel.component';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  OnInit,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';
import {
  PageHeaderAction,
  PageHeaderComponent,
  PageHeaderStat,
} from '../../../shared/ui/page-header/page-header.component';
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
  imports: [GameFilterPanelComponent, GamesTableComponent, PageHeaderComponent, GameLibrariesPanelComponent],
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
  protected readonly librariesView = this.route.snapshot.data['gameCollection'] === 'libraries';
  protected readonly likedView = this.route.snapshot.data['gameCollection'] === 'liked';
  private readonly confirm = inject(ConfirmDialogService);
  private readonly libraryPanel = viewChild(GameLibrariesPanelComponent);
  protected readonly pageTitle = computed(() => {
    if (this.likedView) return 'Liked games';
    if (!this.librariesView) return 'Games';
    const id = this.store.appliedQuery().libraryId;
    return this.store.libraries().find((library) => library.id === id)?.name ?? 'Game libraries';
  });
  protected readonly showGames = computed(() => !this.librariesView || !!this.store.appliedQuery().libraryId);
  protected readonly headerStats = computed<readonly PageHeaderStat[]>(() => [
    { id: 'loaded', label: 'Loaded', value: this.store.filteredGames().length },
    { id: 'analysed', label: 'Analysed', value: this.store.analysedCount() },
    { id: 'ply-indexed', label: 'Indexed', value: this.store.plyIndexedCount() },
  ]);
  protected readonly headerActions = computed<readonly PageHeaderAction[]>(() => {
    if (!this.showGames()) return [];
    const submitting = this.store.submittingKind() !== null;
    return [
      {
        id: 'index-all',
        label: `Index all: ${this.store.bulkIndexProgressLabel()}`,
        disabled:
          this.store.loading() || submitting || this.store.bulkIndexableGames().length === 0,
        run: () => this.store.indexAllVisibleGames(),
      },
      {
        id: 'analyse',
        label: `Analyse: ${this.store.analysisProgressLabel()}`,
        disabled:
          this.store.loading() || submitting || this.store.bulkAnalyzableGames().length === 0,
        run: () => this.store.analyseVisibleGames(),
      },
    ];
  });

  ngOnInit(): void {
    this.store.loadFacets();
    void this.store.loadLibraries();
    this.route.queryParamMap
      .pipe(
        map((params) => {
          const collectionView = this.likedView || this.librariesView;
          const parsed = parseGamesExplorerRouteQuery(collectionView
            ? { ...params, get: (key: string) => key === 'filterMode' ? 'explicit' : params.get(key) }
            : params);
          return this.likedView ? { ...parsed, query: { ...parsed.query, liked: true } } : parsed;
        }),
        distinctUntilChanged(gamesExplorerRouteQueriesEqual),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((routeQuery) => this.store.applyRouteQuery(routeQuery.query, !this.librariesView || !!routeQuery.query.libraryId));
  }

  protected applyFilters(): void {
    const draftQuery = this.store.draftQuery();
    const current = parseGamesExplorerRouteQuery(this.route.snapshot.queryParamMap);
    const currentKeys = new Set(this.route.snapshot.queryParamMap.keys);
    const targetParams = gamesExplorerLinkQueryParams(draftQuery);
    const targetKeys = Object.keys(targetParams);
    const isCanonicalUrl =
      currentKeys.size === targetKeys.length &&
      targetKeys.every((key) => this.route.snapshot.queryParamMap.get(key) === targetParams[key]);

    if (isCanonicalUrl && importedGameSearchCriteriaEqual(current.query, draftQuery)) {
      this.store.refresh();
      return;
    }

    void this.router.navigate([], { relativeTo: this.route, queryParams: targetParams });
  }

  protected resetFilters(): void {
    if (this.likedView || this.librariesView) {
      void this.router.navigate([], { relativeTo: this.route, queryParams: {
        filterMode: 'explicit', libraryId: this.store.appliedQuery().libraryId,
      } });
      return;
    }
    if (this.route.snapshot.queryParamMap.keys.length === 0) {
      this.store.applyRouteQuery(defaultGamesExplorerQuery());
      return;
    }
    void this.router.navigate(['/games']);
  }

  protected async saveLibrary(event: { name: string; id?: number }): Promise<void> {
    if (await this.store.saveLibrary(event.name, event.id)) this.libraryPanel()?.resetForm();
  }

  protected async deleteLibrary(library: GameLibrary): Promise<void> {
    const confirmed = await this.confirm.confirm({
      title: `Delete ${library.name}?`,
      message: 'This removes the library. Its games and likes are kept.',
      confirmLabel: 'Delete library',
      tone: 'danger',
    });
    if (!confirmed || !await this.store.deleteLibrary(library.id)) return;
    this.libraryPanel()?.resetForm();
    if (this.store.appliedQuery().libraryId === library.id) {
      void this.router.navigate(['/games/libraries']);
    }
  }
}
