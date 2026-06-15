import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BoardActionToolbarComponent } from '../../../components/board-action-toolbar.component';
import { ChessgroundBoardComponent } from '../../../components/chessground-board.component';
import { EngineEvalBarComponent } from '../../../components/engine-eval-bar.component';
import { PageHeaderComponent, PageHeaderStat } from '../../../components/page-header.component';
import { StockfishPanelComponent } from '../../../components/stockfish-panel.component';
import { PositionGameMovesPanelComponent } from '../../../shared/position-game-moves/position-game-moves-panel.component';
import { scoreLabel } from '../../../shared/position-game-moves/position-game-moves.helpers';
import { OpeningAnalysisStore } from '../state/opening-analysis.store';

@Component({
  selector: 'app-opening-analysis-page',
  standalone: true,
  imports: [
    PositionGameMovesPanelComponent,
    ChessgroundBoardComponent,
    EngineEvalBarComponent,
    StockfishPanelComponent,
    BoardActionToolbarComponent,
    PageHeaderComponent,
    RouterLink,
  ],
  providers: [OpeningAnalysisStore],
  templateUrl: './opening-analysis-page.component.html',
  styleUrl: './opening-analysis-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpeningAnalysisPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private copyResetTimer: ReturnType<typeof setTimeout> | null = null;
  protected readonly store = inject(OpeningAnalysisStore);
  protected readonly scoreLabel = scoreLabel;
  protected readonly copyState = signal<'idle' | 'copied' | 'error'>('idle');
  protected readonly analysisQueryParams = computed(() => ({
    moves: this.store.history().map((move) => move.uci).join(','),
  }));
  protected readonly headerStats = computed<readonly PageHeaderStat[]>(() => [
    { id: 'games', label: 'Games', value: this.store.wdl().total },
    { id: 'score', label: 'Score', value: this.scoreLabel(this.store.wdl()) },
    { id: 'next-moves', label: 'Next moves', value: this.store.analysis()?.nextMoves?.length || 0 },
  ]);

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => {
      if (this.copyResetTimer) clearTimeout(this.copyResetTimer);
    });
    this.store.initialize();
  }

  protected async copyCurrentLine(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.store.lineLabel());
      this.setCopyState('copied');
    } catch {
      this.setCopyState('error');
    }
  }

  protected copyButtonLabel(): string {
    if (this.copyState() === 'copied') return 'Copied';
    if (this.copyState() === 'error') return 'Copy failed';
    return 'Copy';
  }

  @HostListener('window:keydown', ['$event'])
  protected onKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) return;

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.store.goBack();
    } else if (event.key === 'Home') {
      event.preventDefault();
      this.store.resetBoard();
    }
  }

  private setCopyState(state: 'copied' | 'error'): void {
    this.copyState.set(state);
    if (this.copyResetTimer) clearTimeout(this.copyResetTimer);
    this.copyResetTimer = setTimeout(() => {
      this.copyState.set('idle');
      this.copyResetTimer = null;
    }, 1800);
  }
}
