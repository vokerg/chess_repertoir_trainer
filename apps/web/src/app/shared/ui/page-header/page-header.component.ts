import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ShellActionsComponent } from '../shell-actions/shell-actions.component';
import { type UiShellAction, type UiShellStat } from '../ui-shell.model';

export type PageHeaderAction = UiShellAction;
export type PageHeaderStat = UiShellStat;
export type PageHeaderAppearance = 'flat' | 'raised';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [ShellActionsComponent],
  template: `
    <header class="page-header" [class.page-header-raised]="appearance() === 'raised'">
      <div class="page-header-copy">
        <h2 class="page-header-title">{{ title() }}</h2>
        @if (subtitle(); as subtitle) {
          @if (subtitleLink(); as link) {
            <a class="page-header-subtitle page-header-subtitle-link" [href]="link" target="_blank" rel="noopener noreferrer">
              {{ subtitle }}
            </a>
          } @else {
            <p class="page-header-subtitle">{{ subtitle }}</p>
          }
        }
      </div>

      <app-ui-shell-actions [stats]="stats()" [actions]="actions()" />
    </header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
  readonly subtitleLink = input<string | null>(null);
  readonly stats = input<readonly PageHeaderStat[]>([]);
  readonly actions = input<readonly PageHeaderAction[]>([]);
  readonly appearance = input<PageHeaderAppearance>('flat');
}
