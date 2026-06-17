import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { EngineAnalysis, EngineLine } from './stockfish-analysis.service';

@Component({
  selector: 'app-stockfish-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="stockfish-panel">
      <div class="stockfish-panel-header">
        <h3 class="workbench-panel-title">Stockfish</h3>
        <div class="stockfish-panel-actions">
          <span *ngIf="isCurrentFen() && analysis.running" class="stockfish-depth">depth {{ topDepth() || '...' }}</span>
          <span *ngIf="bestMoveLabel()" class="stockfish-best">Best <code>{{ bestMoveLabel() }}</code></span>
          <button type="button" class="secondary stockfish-analyze" (click)="analyze.emit()" [disabled]="analysis.running">Analyze</button>
        </div>
      </div>

      <p *ngIf="isCurrentFen() && analysis.error" class="status-error">{{ analysis.error }}</p>
      <div *ngIf="warning" class="engine-warning-modern">{{ warning }}</div>

      <div class="stockfish-lines">
        <div *ngFor="let slot of lineSlots; let i = index" class="engine-line-modern stockfish-line-slot" [class.stockfish-line-empty]="!visibleLines()[i]">
          <ng-container *ngIf="visibleLines()[i] as engineLine; else linePlaceholder">
            <span class="engine-score-modern">{{ lineScoreLabel(engineLine) }}</span>
            <code>{{ engineLine.pv.slice(0, 8).join(' ') }}</code>
          </ng-container>
          <ng-template #linePlaceholder>
            <span class="engine-score-modern stockfish-placeholder-score">{{ placeholderScoreLabel(i) }}</span>
            <span class="stockfish-placeholder-text">{{ placeholderLineLabel(i) }}</span>
          </ng-template>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .stockfish-panel {
        display: grid;
        gap: 0.65rem;
      }

      .stockfish-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
      }

      .stockfish-panel-actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: flex-end;
        gap: 0.45rem;
      }

      .stockfish-best,
      .stockfish-depth {
        display: inline-flex;
        align-items: center;
        min-height: 30px;
        border-radius: 999px;
        padding: 0.28rem 0.55rem;
        background: rgba(35, 27, 21, 0.07);
        color: var(--muted-strong);
        font-size: 0.78rem;
        font-weight: 900;
      }

      .stockfish-best code {
        margin-left: 0.3rem;
      }

      .stockfish-analyze {
        min-height: 32px;
        padding: 0.42rem 0.75rem;
        font-size: 0.82rem;
      }

      .stockfish-lines {
        display: grid;
        gap: 0.55rem;
      }

      .stockfish-line-slot {
        min-height: 45px;
      }

      .stockfish-line-empty {
        color: var(--muted);
      }

      .stockfish-placeholder-score {
        color: var(--muted);
      }

      .stockfish-placeholder-text {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        color: var(--muted);
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        font-size: 0.88rem;
      }

      @media (max-width: 560px) {
        .stockfish-panel-header {
          display: grid;
        }

        .stockfish-panel-actions {
          justify-content: flex-start;
        }
      }
    `,
  ],
})
export class StockfishPanelComponent {
  protected readonly lineSlots = [0, 1, 2];

  @Input({ required: true }) analysis!: EngineAnalysis;
  @Input({ required: true }) currentFen!: string;
  @Input() warning: string | null = null;
  @Output() analyze = new EventEmitter<void>();

  visibleLines(): EngineLine[] {
    if (!this.isCurrentFen()) return [];
    return this.analysis.lines.slice(0, 3);
  }

  bestMoveLabel(): string | null {
    if (!this.isCurrentFen()) return null;
    const move = this.analysis.bestMove || this.analysis.lines[0]?.pv?.[0] || null;
    return move && move !== '(none)' ? move : null;
  }

  isCurrentFen(): boolean {
    return this.analysis.fen === this.currentFen;
  }

  topDepth(): number {
    return Math.max(0, ...this.visibleLines().map((line) => line.depth));
  }

  placeholderScoreLabel(index: number): string {
    return `#${index + 1}`;
  }

  placeholderLineLabel(index: number): string {
    if (!this.isCurrentFen()) return index === 0 ? 'Waiting for this position...' : ' ';
    if (this.analysis.running) return index === 0 ? 'Analysing position...' : ' ';
    if (this.analysis.error) return ' ';
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
    const turn = this.currentFen.split(' ')[1];
    return turn === 'b' ? -scoreCp : scoreCp;
  }

  private mateFromWhitePerspective(mate: number): number {
    const turn = this.currentFen.split(' ')[1];
    return turn === 'b' ? -mate : mate;
  }
}
