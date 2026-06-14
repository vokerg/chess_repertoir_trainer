import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { PageHeaderComponent } from '../../../components/page-header.component';
import { GameFilterPanelComponent } from '../../../shared/game-filters/game-filter-panel.component';
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

  ngOnInit(): void {
    this.store.loadBatchAnalysisConfig();
    this.store.loadFacets();
    this.store.refresh();
  }
}
