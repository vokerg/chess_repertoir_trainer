import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CopyableFenComponent } from '../../ui/copyable-fen/copyable-fen.component';

@Component({
  selector: 'app-board-action-toolbar',
  standalone: true,
  imports: [CopyableFenComponent],
  templateUrl: './board-action-toolbar.component.html',
  styleUrl: './board-action-toolbar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardActionToolbarComponent {
  readonly canGoBackward = input(false);
  readonly canGoForward = input(false);
  readonly canGoEnd = input<boolean | null>(null);
  readonly showStart = input(true);
  readonly showPrevious = input(true);
  readonly showNext = input(true);
  readonly showEnd = input(true);
  readonly startLabel = input('Start');
  readonly previousLabel = input('Previous');
  readonly nextLabel = input('Next');
  readonly endLabel = input('End');
  readonly keyboardHint = input<string | null>(null);
  readonly fen = input<string | null>(null);
  readonly showFlip = input(false);

  readonly goStart = output<void>();
  readonly goPrevious = output<void>();
  readonly goNext = output<void>();
  readonly goEnd = output<void>();
  readonly flip = output<void>();
}
