import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CopyButtonComponent } from '../copy-button/copy-button.component';

@Component({
  selector: 'app-copyable-line',
  standalone: true,
  imports: [RouterLink, CopyButtonComponent],
  templateUrl: './copyable-line.component.html',
  styleUrl: './copyable-line.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CopyableLineComponent {
  readonly line = input.required<string>();
  readonly name = input<string | null>(null);
  readonly label = input('Copy line');
  readonly ariaLabel = input<string | null>(null);
  readonly link = input<any[] | null>(null);
  readonly queryParams = input<any | null>(null);
  readonly buttonOnly = input(false);
  readonly buttonClass = input('secondary');
}
