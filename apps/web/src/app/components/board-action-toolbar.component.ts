import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CopyableTextComponent } from '../shared/ui/copyable-text/copyable-text.component';

@Component({
  selector: 'app-board-action-toolbar',
  standalone: true,
  imports: [CopyableTextComponent],
  templateUrl: './board-action-toolbar.component.html',
  styleUrl: './board-action-toolbar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardActionToolbarComponent {
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
}
