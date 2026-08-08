import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { AdminUserSummary } from '@chess-trainer/contracts/admin';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import { AdminWarningListComponent } from './admin-warning-list.component';

@Component({
  selector: 'app-admin-user-list',
  standalone: true,
  imports: [AdminWarningListComponent, DatePipe, PanelComponent],
  templateUrl: './admin-user-list.component.html',
  styleUrl: './admin-user-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUserListComponent {
  readonly users = input.required<readonly AdminUserSummary[]>();
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly selectedUserId = input<number | null>(null);
  readonly pageNumber = input(1);
  readonly hasNextPage = input(false);

  readonly selectUser = output<number>();
  readonly nextPage = output<void>();
  readonly retry = output<void>();
}
