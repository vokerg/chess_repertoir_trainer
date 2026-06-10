import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, input, output } from '@angular/core';

@Component({
  selector: 'app-board-action-toolbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './board-action-toolbar.component.html',
  styleUrl: './board-action-toolbar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardActionToolbarComponent implements OnDestroy {
  readonly canGoBackward = input(false);
  readonly canGoForward = input(false);
  readonly showStart = input(true);
  readonly showPrevious = input(true);
  readonly showNext = input(true);
  readonly showEnd = input(true);
  readonly keyboardHint = input<string | null>(null);
  readonly fen = input<string | null>(null);

  readonly goStart = output<void>();
  readonly goPrevious = output<void>();
  readonly goNext = output<void>();
  readonly goEnd = output<void>();

  copyState: 'idle' | 'copied' | 'error' = 'idle';

  private resetTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnDestroy() {
    if (this.resetTimer) clearTimeout(this.resetTimer);
  }

  async copyFen() {
    const fen = this.fen();
    if (!fen) return;
    try {
      await navigator.clipboard.writeText(fen);
      this.setCopyState('copied');
    } catch {
      this.setCopyState('error');
    }
  }

  copyButtonLabel() {
    if (this.copyState === 'copied') return 'Copied';
    if (this.copyState === 'error') return 'Copy failed';
    return 'Copy FEN';
  }

  private setCopyState(state: 'idle' | 'copied' | 'error') {
    this.copyState = state;
    if (this.resetTimer) clearTimeout(this.resetTimer);
    if (state !== 'idle') {
      this.resetTimer = setTimeout(() => {
        this.copyState = 'idle';
        this.resetTimer = null;
      }, 1800);
    }
  }
}
