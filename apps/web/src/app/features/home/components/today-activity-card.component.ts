import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { HomeTodayActivity } from '../home-today-activity.models';

@Component({
  selector: 'app-today-activity-card',
  standalone: true,
  templateUrl: './today-activity-card.component.html',
  styleUrl: './today-activity-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodayActivityCardComponent {
  readonly activity = input<HomeTodayActivity | null>(null);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly notice = input<string | null>(null);
  readonly retry = output<void>();
}
