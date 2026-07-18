import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  type UiShellAction,
  type UiShellActionAppearance,
  type UiShellStat,
} from '../ui-shell.model';

@Component({
  selector: 'app-ui-shell-actions',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './shell-actions.component.html',
  styleUrl: './shell-actions.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellActionsComponent {
  readonly stats = input<readonly UiShellStat[]>([]);
  readonly actions = input<readonly UiShellAction[]>([]);

  protected run(action: UiShellAction): void {
    if (!action.disabled) action.run?.();
  }

  protected appearance(action: UiShellAction): UiShellActionAppearance {
    return action.kind === 'toggle' ? 'secondary' : (action.appearance ?? 'secondary');
  }
}
