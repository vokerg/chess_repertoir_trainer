import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CopyableLineComponent } from '../../../../shared/ui/copyable-line/copyable-line.component';
import { AvailableSubline } from '../../data-access/sublines/sublines.models';

@Component({
  selector: 'app-sublines-list',
  standalone: true,
  imports: [CopyableLineComponent],
  templateUrl: './sublines-list.component.html',
  styleUrl: './sublines-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SublinesListComponent {
  readonly items = input.required<AvailableSubline[]>();
  readonly loading = input.required<boolean>();
  readonly error = input.required<string | null>();
  readonly title = input('Available sublines');
}
