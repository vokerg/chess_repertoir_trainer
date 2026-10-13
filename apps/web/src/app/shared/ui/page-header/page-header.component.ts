import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { WidgetMenuComponent, type WidgetToggle } from '../widget-menu/widget-menu.component';
import { ShellActionsComponent } from '../shell-actions/shell-actions.component';
import { type UiShellAction, type UiShellStat } from '../ui-shell.model';

export type PageHeaderAction = UiShellAction;
export type PageHeaderStat = UiShellStat;

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [ShellActionsComponent, WidgetMenuComponent],
  template: `
    <header class="page-header">
      <div class="page-header-copy">
        <h2 class="page-header-title">{{ title() }}</h2>
        @if (subtitle(); as subtitle) {
          @if (subtitleLink(); as link) {
            <a
              class="page-header-subtitle page-header-subtitle-link"
              [href]="link"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ subtitle }}
            </a>
          } @else {
            <p class="page-header-subtitle">{{ subtitle }}</p>
          }
        }
      </div>

      <div class="page-header-controls">
        <app-ui-shell-actions [stats]="stats()" [actions]="actions()" />
        @if (widgets().length) {
          <app-widget-menu [widgets]="widgets()" />
        }
      </div>
    </header>
  `,
  styles: [
    `
      .page-header-controls {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        flex-wrap: wrap;
        gap: 0.5rem;
        min-width: 0;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
  readonly subtitleLink = input<string | null>(null);
  readonly stats = input<readonly PageHeaderStat[]>([]);
  readonly widgets = input<readonly WidgetToggle[]>([]);
  readonly actions = input<readonly PageHeaderAction[]>([]);
}
