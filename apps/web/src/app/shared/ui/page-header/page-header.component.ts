import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface PageHeaderStat {
  id: string;
  label: string;
  value: string | number;
}

interface PageHeaderActionBase {
  id: string;
  label: string;
  disabled?: boolean;
  active?: boolean;
}

export type PageHeaderAction = PageHeaderActionBase &
  (
    | { link: string | Array<string | number>; run?: never }
    | { link?: never; run: () => void }
  );

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [RouterLink],
  template: `
    <header class="page-header">
      <div class="page-header-copy">
        <h2 class="page-header-title">{{ title() }}</h2>
        @if (subtitle(); as subtitle) {
          <p class="page-header-subtitle">{{ subtitle }}</p>
        }
      </div>

      @if (stats().length || actions().length) {
        <div class="page-header-actions">
          @for (stat of stats(); track stat.id) {
            <div class="page-header-stat">
              <span class="page-header-stat-label">{{ stat.label }}</span>
              <span class="page-header-stat-value">{{ stat.value }}</span>
            </div>
          }

          @for (action of actions(); track action.id) {
            @if (action.link) {
              <a
                class="page-header-action"
                [class.active]="action.active"
                [class.disabled]="action.disabled"
                [attr.aria-disabled]="action.disabled || null"
                [routerLink]="action.disabled ? null : action.link"
              >
                {{ action.label }}
              </a>
            } @else {
              <button
                type="button"
                class="page-header-action"
                [class.active]="action.active"
                [disabled]="action.disabled"
                (click)="run(action)"
              >
                {{ action.label }}
              </button>
            }
          }
        </div>
      }
    </header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
  readonly stats = input<readonly PageHeaderStat[]>([]);
  readonly actions = input<readonly PageHeaderAction[]>([]);

  protected run(action: PageHeaderAction): void {
    if (!action.disabled) action.run?.();
  }
}
