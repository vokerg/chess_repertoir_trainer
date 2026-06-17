import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CopyButtonComponent } from '../copy-button/copy-button.component';

@Component({
  selector: 'app-copyable-text',
  standalone: true,
  imports: [CopyButtonComponent],
  templateUrl: './copyable-text.component.html',
  styleUrl: './copyable-text.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CopyableTextComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly accessibleName = input<string | null>(null);
  readonly ariaLabel = input<string | null>(null);
}
