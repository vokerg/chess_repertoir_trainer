import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ShellActionsComponent } from '../shell-actions/shell-actions.component';
import { type UiShellAction, type UiShellStat } from '../ui-shell.model';

@Component({
  selector: 'app-panel',
  standalone: true,
  imports: [ShellActionsComponent],
  templateUrl: './panel.component.html',
  styleUrl: './panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
  readonly stats = input<readonly UiShellStat[]>([]);
  readonly actions = input<readonly UiShellAction[]>([]);
}
