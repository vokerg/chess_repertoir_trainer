import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BoardActionToolbarComponent } from '../../../components/board-action-toolbar.component';
import { ChessgroundBoardComponent } from '../../../components/chessground-board.component';
import { EngineEvalBarComponent } from '../../../components/engine-eval-bar.component';
import { PageHeaderComponent } from '../../../components/page-header.component';
import { StockfishPanelComponent } from '../../../components/stockfish-panel.component';
import { GameFilterPanelComponent } from '../../../shared/game-filters/game-filter-panel.component';
import { OpeningAnalysisApiService } from '../data-access/opening-analysis-api.service';
import {
  gameDateLabel,
  gameMetaLabel,
  playerPairLabel,
  providerClass,
  providerLabel,
  resultClass,
  resultLabel,
  scoreLabel,
  wdlLabel,
} from '../helpers/opening-analysis.helpers';
import { OpeningAnalysisStore } from '../state/opening-analysis.store';

@Component({
  selector: 'app-opening-analysis-page',
  standalone: true,
  imports: [
    NgClass,
    RouterLink,
    GameFilterPanelComponent,
    ChessgroundBoardComponent,
    EngineEvalBarComponent,
    StockfishPanelComponent,
    BoardActionToolbarComponent,
    PageHeaderComponent,
  ],
  providers: [OpeningAnalysisApiService, OpeningAnalysisStore],
  templateUrl: './opening-analysis-page.component.html',
  styleUrl: './opening-analysis-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpeningAnalysisPageComponent implements OnInit {
  protected readonly store = inject(OpeningAnalysisStore);
  protected readonly loadingMoveRows = [0, 1, 2];
  protected readonly providerLabel = providerLabel;
  protected readonly providerClass = providerClass;
  protected readonly resultLabel = resultLabel;
  protected readonly resultClass = resultClass;
  protected readonly playerPairLabel = playerPairLabel;
  protected readonly gameDateLabel = gameDateLabel;
  protected readonly gameMetaLabel = gameMetaLabel;
  protected readonly wdlLabel = wdlLabel;
  protected readonly scoreLabel = scoreLabel;

  ngOnInit(): void {
    this.store.initialize();
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
}
