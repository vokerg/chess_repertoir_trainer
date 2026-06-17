import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CopyableTextComponent } from '../copyable-text/copyable-text.component';

@Component({
  selector: 'app-copyable-fen',
  standalone: true,
  imports: [CopyableTextComponent],
  template: `
    <app-copyable-text
      [label]="label()"
      [value]="fen()"
      [accessibleName]="accessibleName() || label()"
      [ariaLabel]="accessibleName() ? 'Copy ' + accessibleName() : 'Copy ' + label()"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CopyableFenComponent {
  readonly fen = input.required<string>();
  readonly label = input('FEN');
  readonly accessibleName = input<string | null>(null);
}
