import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';
import { EngineAnalysis, EngineLine } from './stockfish-analysis.service';

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
        position: relative;
        height: 100%;
        min-height: min(76vw, 520px);
        overflow: hidden;
        border: 1px solid var(--ui-border-strong);
        border-radius: 999px;
        background: var(--ui-surface);
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.45);
      }

      .eval-bar-fit-height {
        min-height: auto;
        min-width: 0;
      }

      .eval-black-modern {
        position: absolute;
        inset: 0 0 auto;
        background: var(--ui-chrome);
        transition: height 180ms ease;
      }

      .eval-bar-modern-flipped .eval-black-modern {
        inset: auto 0 0;
      }

      .eval-label-modern {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%) rotate(180deg);
        writing-mode: vertical-rl;
        padding: 0.35rem 0.12rem;
        border: 1px solid rgba(255, 255, 255, 0.22);
        border-radius: 999px;
        background: color-mix(in srgb, var(--ui-chrome) 82%, transparent);
        color: var(--ui-text-inverse);
        box-shadow: var(--ui-shadow-soft);
        font-family: var(--ui-font-family-mono);
        font-size: 0.7rem;
        font-weight: 800;
        font-variant-numeric: tabular-nums;
        letter-spacing: 0.02em;
        user-select: none;
      }

      @media (prefers-reduced-motion: reduce) {
        .eval-black-modern {
          transition: none;
        }
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
