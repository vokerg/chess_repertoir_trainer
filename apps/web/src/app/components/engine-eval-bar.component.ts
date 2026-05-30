import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';
import { EngineAnalysis, EngineLine } from '../services/stockfish-analysis.service';

type DisplayedEval =
  | { kind: 'engine'; line: EngineLine; fen: string }
  | { kind: 'saved'; scoreCpWhite: number };

@Component({
  selector: 'app-engine-eval-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="eval-bar-modern"
      [class.eval-bar-modern-flipped]="flipped"
      [class.eval-bar-fit-height]="fitHeight"
      [title]="title"
    >
      <div class="eval-black-modern" [style.height.%]="100 - evalWhitePercent()"></div>
      <div class="eval-label-modern">{{ evalLabel() }}</div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
        height: 100%;
      }

      .eval-bar-modern {
        height: 100%;
      }

      .eval-bar-fit-height {
        min-height: auto;
        min-width: 0;
      }
    `,
  ],
})
export class EngineEvalBarComponent implements OnChanges {
  @Input({ required: true }) analysis!: EngineAnalysis;
  @Input({ required: true }) currentFen!: string;
  @Input() flipped = false;
  @Input() fitHeight = false;
  @Input() holdPrevious = true;
  @Input() savedScoreCpWhite: number | null | undefined = null;
  @Input() title = 'Stockfish evaluation';

  private displayedEval: DisplayedEval | null = null;

  ngOnChanges(): void {
    const currentLine = this.currentEngineLine();
    if (currentLine) {
      this.displayedEval = { kind: 'engine', line: currentLine, fen: this.currentFen };
      return;
    }

    if (typeof this.savedScoreCpWhite === 'number') {
      this.displayedEval = { kind: 'saved', scoreCpWhite: this.savedScoreCpWhite };
      return;
    }

    if (!this.holdPrevious) {
      this.displayedEval = null;
    }
  }

  protected evalLabel(): string {
    if (!this.displayedEval) return '—';
    if (this.displayedEval.kind === 'saved') return this.cpLabel(this.displayedEval.scoreCpWhite);
    return this.lineScoreLabel(this.displayedEval.line, this.displayedEval.fen);
  }

  protected evalWhitePercent(): number {
    if (!this.displayedEval) return 50;
    if (this.displayedEval.kind === 'saved') return this.cpPercent(this.displayedEval.scoreCpWhite);

    const { line, fen } = this.displayedEval;
    if (line.mate !== undefined) return this.mateFromWhitePerspective(line.mate, fen) > 0 ? 100 : 0;
    return this.cpPercent(this.scoreFromWhitePerspective(line.scoreCp ?? 0, fen));
  }

  private currentEngineLine(): EngineLine | null {
    if (!this.analysis || this.analysis.fen !== this.currentFen) return null;
    return this.analysis.lines[0] ?? null;
  }

  private lineScoreLabel(line: EngineLine, fen: string): string {
    if (line.mate !== undefined) return `M${this.mateFromWhitePerspective(line.mate, fen)}`;
    if (line.scoreCp === undefined) return '—';
    return this.cpLabel(this.scoreFromWhitePerspective(line.scoreCp, fen));
  }

  private cpLabel(whiteCp: number): string {
    const pawns = whiteCp / 100;
    return `${pawns >= 0 ? '+' : ''}${pawns.toFixed(2)}`;
  }

  private cpPercent(whiteCp: number): number {
    const clamped = Math.max(-800, Math.min(800, whiteCp));
    return 50 + (clamped / 800) * 50;
  }

  private scoreFromWhitePerspective(scoreCp: number, fen: string): number {
    const turn = fen.split(' ')[1];
    return turn === 'b' ? -scoreCp : scoreCp;
  }

  private mateFromWhitePerspective(mate: number, fen: string): number {
    const turn = fen.split(' ')[1];
    return turn === 'b' ? -mate : mate;
  }
}
