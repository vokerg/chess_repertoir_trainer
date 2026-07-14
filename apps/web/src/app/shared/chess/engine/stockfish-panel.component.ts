import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PanelComponent } from '../../ui/panel/panel.component';
import { uciMovesToSan } from '../notation/uci-to-san.helper';
import { EngineAnalysis, EngineLine } from './stockfish-analysis.service';

interface EngineLineViewModel {
  id: number;
  score: string;
  moves: string;
}

@Component({
  selector: 'app-stockfish-panel',
  standalone: true,
  imports: [PanelComponent],
  templateUrl: './stockfish-panel.component.html',
  styleUrl: './stockfish-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockfishPanelComponent {
  readonly analysis = input.required<EngineAnalysis>();
  readonly currentFen = input.required<string>();
  readonly warning = input<string | null>(null);
  protected readonly lineViewModels = computed<readonly EngineLineViewModel[]>(() => {
    if (!this.isCurrentFen()) return [];
    return this.analysis().lines.slice(0, 3).map((line) => ({
      id: line.multipv,
      score: this.lineScoreLabel(line),
      moves: this.sanLine(line.pv.slice(0, 8)),
    }));
  });
  protected readonly statusText = computed(() => {
    if (this.isCurrentFen() && this.analysis().error) return this.analysis().error;
    if (this.lineViewModels().length) return null;
    if (!this.isCurrentFen()) return 'Waiting for this position...';
    if (this.analysis().running) return 'Analysing position...';
    return 'No engine lines.';
  });

  protected isCurrentFen(): boolean {
    return this.analysis().fen === this.currentFen();
  }

  private lineScoreLabel(line: EngineLine): string {
    if (line.mate !== undefined) return `M${this.mateFromWhitePerspective(line.mate)}`;
    if (line.scoreCp === undefined) return '-';
    const whiteCp = this.scoreFromWhitePerspective(line.scoreCp);
    const pawns = whiteCp / 100;
    return `${pawns >= 0 ? '+' : ''}${pawns.toFixed(2)}`;
  }

  private sanLine(moves: readonly string[]): string {
    try {
      return uciMovesToSan(this.currentFen(), moves).join(' ');
    } catch {
      return 'Engine line unavailable';
    }
  }

  private scoreFromWhitePerspective(scoreCp: number): number {
    const turn = this.currentFen().split(' ')[1];
    return turn === 'b' ? -scoreCp : scoreCp;
  }

  private mateFromWhitePerspective(mate: number): number {
    const turn = this.currentFen().split(' ')[1];
    return turn === 'b' ? -mate : mate;
  }
}
