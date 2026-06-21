import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { PanelComponent } from '../../ui/panel/panel.component';
import { type UiShellAction, type UiShellStat } from '../../ui/ui-shell.model';
import { EngineAnalysis, EngineLine } from './stockfish-analysis.service';

@Component({
  selector: 'app-stockfish-panel',
  standalone: true,
  imports: [PanelComponent],
  templateUrl: './stockfish-panel.component.html',
  styleUrl: './stockfish-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockfishPanelComponent {
  protected readonly lineSlots = [0, 1, 2];

  readonly analysis = input.required<EngineAnalysis>();
  readonly currentFen = input.required<string>();
  readonly warning = input<string | null>(null);
  readonly analyze = output<void>();
  protected readonly stockfishStats = computed<readonly UiShellStat[]>(() => {
    const stats: UiShellStat[] = [];
    if (this.isCurrentFen() && this.analysis().running) {
      stats.push({ id: 'depth', label: 'Depth', value: this.topDepth() || '...' });
    }

    const bestMove = this.bestMoveLabel();
    if (bestMove) {
      stats.push({ id: 'best', label: 'Best', value: bestMove });
    }

    return stats;
  });
  protected readonly stockfishActions = computed<readonly UiShellAction[]>(() => [
    {
      id: 'analyze',
      label: 'Analyze',
      disabled: this.analysis().running,
      run: () => this.analyze.emit(),
    },
  ]);

  visibleLines(): EngineLine[] {
    if (!this.isCurrentFen()) return [];
    return this.analysis().lines.slice(0, 3);
  }

  bestMoveLabel(): string | null {
    if (!this.isCurrentFen()) return null;
    const analysis = this.analysis();
    const move = analysis.bestMove || analysis.lines[0]?.pv?.[0] || null;
    return move && move !== '(none)' ? move : null;
  }

  isCurrentFen(): boolean {
    return this.analysis().fen === this.currentFen();
  }

  topDepth(): number {
    return Math.max(0, ...this.visibleLines().map((line) => line.depth));
  }

  placeholderScoreLabel(index: number): string {
    return `#${index + 1}`;
  }

  placeholderLineLabel(index: number): string {
    if (!this.isCurrentFen()) return index === 0 ? 'Waiting for this position...' : ' ';
    if (this.analysis().running) return index === 0 ? 'Analysing position...' : ' ';
    if (this.analysis().error) return ' ';
    return index === 0 ? 'No engine lines.' : ' ';
  }

  lineScoreLabel(line: EngineLine): string {
    if (line.mate !== undefined) return `M${this.mateFromWhitePerspective(line.mate)}`;
    if (line.scoreCp === undefined) return '-';
    const whiteCp = this.scoreFromWhitePerspective(line.scoreCp);
    const pawns = whiteCp / 100;
    return `${pawns >= 0 ? '+' : ''}${pawns.toFixed(2)}`;
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
