import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { AdminWarning } from '@chess-trainer/contracts/admin';

@Component({
  selector: 'app-admin-warning-list',
  standalone: true,
  templateUrl: './admin-warning-list.component.html',
  styleUrl: './admin-warning-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminWarningListComponent {
  readonly warnings = input.required<readonly AdminWarning[]>();
  readonly ariaLabel = input('Administrator warning evidence');
}
