import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  computed,
  inject,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';
import { PageHeaderAction, PageHeaderComponent } from '../../../components/page-header.component';
import { AnalysisWorkbenchComponent } from '../../../shared/analysis-workbench/analysis-workbench.component';
import { GameFilterPanelComponent } from '../../../shared/game-filters/game-filter-panel.component';
import { PositionTopGamesComponent } from '../../../shared/position-game-moves/position-top-games.component';
import { FreeAnalysisApiService } from '../data-access/free-analysis-api.service';
import { FreeAnalysisStore } from '../state/free-analysis.store';
import { AnalysisReintegrationDialogComponent } from '../components/analysis-reintegration-dialog.component';
import { AnalysisReintegrationApiService } from '../data-access/analysis-reintegration-api.service';
import { AnalysisReintegrationStore } from '../state/analysis-reintegration.store';
import { buildAnalysisReintegrationLinePayload } from '../helpers/analysis-reintegration-payload.helpers';

@Component({
  selector: 'app-free-analysis-page',
  standalone: true,
  imports: [
    PageHeaderComponent,
    AnalysisWorkbenchComponent,
    AnalysisReintegrationDialogComponent,
    GameFilterPanelComponent,
    PositionTopGamesComponent,
  ],
  providers: [FreeAnalysisStore, FreeAnalysisApiService, AnalysisReintegrationStore, AnalysisReintegrationApiService],
  templateUrl: './free-analysis-page.component.html',
  styleUrl: './free-analysis-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FreeAnalysisPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly store = inject(FreeAnalysisStore);
  protected readonly reintegrationStore = inject(AnalysisReintegrationStore);
  protected readonly headerActions = computed<readonly PageHeaderAction[]>(() => [
    {
      id: 'my-games',
      label: this.store.myGamesOpen() ? 'Hide my games' : 'My games',
      run: () => this.store.toggleMyGames(),
    },
    {
      id: 'reintegrate',
      label: 'Reintegrate into course',
      disabled: !this.store.tree(),
      run: () => this.openReintegrationDialog(),
    },
  ]);

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(
        map((query) => ({
          fen: query.get('fen'),
          gameId: parsePositiveNumber(query.get('gameId')),
          ply: parsePositiveNumber(query.get('ply')),
        })),
        distinctUntilChanged(
          (previous, current) =>
            previous.fen === current.fen &&
            previous.gameId === current.gameId &&
            previous.ply === current.ply,
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((input) => this.store.initialize(input));
  }

  @HostListener('window:keydown', ['$event'])
  protected onKeyDown(event: KeyboardEvent): void {
    this.store.handleKeyboard(event);
  }

  protected confirmDeleteSelectedSubtree(): void {
    const message = this.store.deleteConfirmationText();
    if (!message || !window.confirm(message)) return;
    this.store.deleteSelectedSubtree();
  }

  protected openReintegrationDialog(): void {
    const tree = this.store.tree();
    if (tree) {
      void this.reintegrationStore.openForTree(
        buildAnalysisReintegrationLinePayload(tree, this.store.selectedNodeId()),
      );
    }
  }
}

function parsePositiveNumber(value: string | null): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
