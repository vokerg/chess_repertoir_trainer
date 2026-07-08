import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type NavIconName =
  | 'study'
  | 'courses'
  | 'target'
  | 'games'
  | 'openings'
  | 'progress'
  | 'analysis'
  | 'lab'
  | 'account'
  | 'settings';

@Component({
  selector: 'app-nav-icon',
  standalone: true,
  template: `
    <svg
      class="nav-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      @switch (name()) {
        @case ('study') {
          <path d="M5 5h12a2 2 0 0 1 2 2v12H7a2 2 0 0 1-2-2V5Z" />
          <path d="M8 9h1.5" />
          <path d="m12 9 1.4 1.4L16.5 7" />
          <path d="M8 14h1.5" />
          <path d="M12 14h4" />
          <path d="M7 19v2" />
          <path d="M17 19v2" />
        }
        @case ('courses') {
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H7a3 3 0 0 0-3 3V5.5Z" />
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M8 7h8" />
          <path d="M8 11h6" />
        }
        @case ('target') {
          <circle cx="12" cy="12" r="7" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3" />
          <path d="M12 19v3" />
          <path d="M2 12h3" />
          <path d="M19 12h3" />
        }
        @case ('games') {
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M4 12h16" />
          <path d="M12 4v16" />
          <path d="M8 8h.01" />
          <path d="M16 16h.01" />
        }
        @case ('openings') {
          <path d="M5 5v14" />
          <path d="M5 7h5a4 4 0 0 1 4 4v8" />
          <path d="M19 7h-5a4 4 0 0 0-4 4v8" />
          <path d="M10 12h4" />
        }
        @case ('progress') {
          <path d="M4 19h16" />
          <path d="M6 15l4-4 3 3 5-7" />
          <path d="M18 7h-4" />
          <path d="M18 7v4" />
        }
        @case ('analysis') {
          <circle cx="11" cy="11" r="6" />
          <path d="m16 16 4 4" />
          <path d="M8.5 11h5" />
          <path d="M11 8.5v5" />
        }
        @case ('lab') {
          <path d="M9 3h6" />
          <path d="M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3" />
          <path d="M8 15h8" />
        }
        @case ('account') {
          <circle cx="12" cy="8" r="4" />
          <path d="M5 21a7 7 0 0 1 14 0" />
        }
        @case ('settings') {
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3" />
          <path d="M12 19v3" />
          <path d="m4.9 4.9 2.1 2.1" />
          <path d="m17 17 2.1 2.1" />
          <path d="M2 12h3" />
          <path d="M19 12h3" />
          <path d="m4.9 19.1 2.1-2.1" />
          <path d="m17 7 2.1-2.1" />
        }
      }
    </svg>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        width: 1.15rem;
        height: 1.15rem;
        flex: 0 0 auto;
      }

      .nav-icon {
        width: 100%;
        height: 100%;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavIconComponent {
  readonly name = input.required<NavIconName>();
}
