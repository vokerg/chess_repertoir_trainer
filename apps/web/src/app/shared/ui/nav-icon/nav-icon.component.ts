import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type NavIconName =
  | 'home'
  | 'study'
  | 'library'
  | 'puzzle'
  | 'missed'
  | 'shield'
  | 'courses'
  | 'target'
  | 'games'
  | 'openings'
  | 'opening-analysis'
  | 'opening-struggles'
  | 'builder'
  | 'progress'
  | 'performance'
  | 'profile'
  | 'analysis'
  | 'lab'
  | 'import'
  | 'link'
  | 'appearance'
  | 'account'
  | 'settings'
  | 'more';

@Component({
  selector: 'app-nav-icon',
  standalone: true,
  template: `
    <svg
      class="nav-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      @switch (name()) {
        @case ('home') {
          <path d="M4 11.2 12 4l8 7.2v7.3a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5Z" />
          <path d="M9 20v-6h6v6" />
          <circle class="nav-icon-signal" cx="12" cy="4" r="1.35" />
        }
        @case ('study') {
          <path d="M4 5.5c2.8-.7 5.5-.2 8 1.5v12c-2.5-1.7-5.2-2.2-8-1.5Z" />
          <path d="M20 5.5c-2.8-.7-5.5-.2-8 1.5v12c2.5-1.7 5.2-2.2 8-1.5Z" />
          <circle class="nav-icon-signal" cx="12" cy="7" r="1.25" />
        }
        @case ('library') {
          <rect x="5" y="4" width="14" height="16" rx="2.5" />
          <path d="M9 4v16M12 8h4M12 12h4M12 16h2" />
          <circle class="nav-icon-signal" cx="16" cy="8" r="1.2" />
        }
        @case ('puzzle') {
          <path
            d="M5 5h5a2.5 2.5 0 1 1 4 0h5v5a2.5 2.5 0 1 1 0 4v5h-5a2.5 2.5 0 1 0-4 0H5v-5a2.5 2.5 0 1 1 0-4Z"
          />
          <circle class="nav-icon-signal" cx="19" cy="5" r="1.25" />
        }
        @case ('missed') {
          <circle cx="11" cy="13" r="7" />
          <circle cx="11" cy="13" r="3" />
          <path d="m15.5 8.5 5-5M17 3.5h3.5V7" />
          <circle class="nav-icon-signal" cx="11" cy="13" r="1.25" />
        }
        @case ('shield') {
          <path d="M12 3 20 6v5.5c0 4.5-3 7.7-8 9.5-5-1.8-8-5-8-9.5V6Z" />
          <path d="m8.5 12 2.2 2.2 4.8-5" />
          <circle class="nav-icon-signal" cx="12" cy="3" r="1.25" />
        }
        @case ('courses') {
          <path d="m5 7 7-3 7 3-7 3Z" />
          <path d="m5 12 7 3 7-3M5 17l7 3 7-3" />
          <circle class="nav-icon-signal" cx="19" cy="7" r="1.25" />
        }
        @case ('target') {
          <circle cx="12" cy="12" r="7" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          <circle class="nav-icon-signal" cx="12" cy="12" r="1.25" />
        }
        @case ('games') {
          <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
          <path d="M9.2 3.5v17M14.8 3.5v17M3.5 9.2h17M3.5 14.8h17" />
          <circle class="nav-icon-signal" cx="17.7" cy="6.3" r="1.35" />
        }
        @case ('openings') {
          <path d="M12 20V9M12 13c0-3.5-2.4-5.5-6-5.5M12 16c0-4.8 2.7-7.5 6.5-7.5" />
          <circle cx="6" cy="7.5" r="2" />
          <circle cx="18.5" cy="8.5" r="2" />
          <circle class="nav-icon-signal" cx="12" cy="20" r="1.4" />
        }
        @case ('opening-analysis') {
          <path d="M5 19V8m0 2h4a4 4 0 0 1 4 4" />
          <circle cx="5" cy="7" r="2" />
          <circle cx="15.5" cy="15.5" r="4" />
          <path d="m18.5 18.5 2.5 2.5" />
          <circle class="nav-icon-signal" cx="5" cy="7" r="1.2" />
        }
        @case ('opening-struggles') {
          <path d="M4 5v14h16M7 9l4 3 3-2 4 6M18 13v3h-3" />
          <circle class="nav-icon-signal" cx="11" cy="12" r="1.25" />
        }
        @case ('builder') {
          <circle cx="6" cy="7" r="2" />
          <circle cx="6" cy="17" r="2" />
          <circle cx="17" cy="12" r="2" />
          <path d="M8 7h2a3 3 0 0 1 3 3v2M8 17h2a3 3 0 0 0 3-3v-2M17 7v10M14.5 9.5h5" />
          <circle class="nav-icon-signal" cx="17" cy="12" r="1.25" />
        }
        @case ('progress') {
          <path d="M4 19.5h16M6 16v-3M11 16V9M16 16V5M5 9l5-3 4 2 5-5" />
          <circle class="nav-icon-signal" cx="19" cy="3" r="1.35" />
        }
        @case ('performance') {
          <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
          <path d="M6.5 14h2.3l2-5 2.7 7 1.8-4h2.2" />
          <circle class="nav-icon-signal" cx="10.8" cy="9" r="1.2" />
        }
        @case ('profile') {
          <path
            d="M9 8.5C9 6.6 10.3 5 12 5s3 1.6 3 3.5c0 1.4-.7 2.6-1.7 3.2l3.2 3.8H7.5l3.2-3.8A3.8 3.8 0 0 1 9 8.5Z"
          />
          <path d="M6 19h12M7.5 15.5 6 19M16.5 15.5 18 19" />
          <circle class="nav-icon-signal" cx="12" cy="5" r="1.25" />
        }
        @case ('analysis') {
          <rect x="3.5" y="3.5" width="13" height="13" rx="2.5" />
          <path d="M10 3.5v13M3.5 10h13m-.7 5.8L21 21" />
          <circle class="nav-icon-signal" cx="10" cy="10" r="1.35" />
        }
        @case ('lab') {
          <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3M7.2 16h9.6" />
          <circle class="nav-icon-signal" cx="10" cy="16" r="1.25" />
        }
        @case ('import') {
          <circle cx="9" cy="7" r="3" />
          <path d="M3.5 19a5.5 5.5 0 0 1 11 0M18 6v9m-3-3 3 3 3-3" />
          <circle class="nav-icon-signal" cx="18" cy="15" r="1.2" />
        }
        @case ('link') {
          <path
            d="m9.5 14.5-1.4 1.4a3.5 3.5 0 0 1-5-5l3-3a3.5 3.5 0 0 1 5 0m3.4 1.4 1-1a3.5 3.5 0 0 1 5 5l-3 3a3.5 3.5 0 0 1-5 0m-4.4-1.4 7-7"
          />
          <circle class="nav-icon-signal" cx="12" cy="12" r="1.3" />
        }
        @case ('appearance') {
          <circle cx="12" cy="12" r="4" />
          <path
            d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4M12 8v8a4 4 0 0 0 0-8Z"
          />
          <circle class="nav-icon-signal" cx="12" cy="12" r="1.15" />
        }
        @case ('account') {
          <circle cx="12" cy="8" r="4" />
          <path d="M5 21a7 7 0 0 1 14 0" />
          <circle class="nav-icon-signal" cx="12" cy="8" r="1.25" />
        }
        @case ('settings') {
          <path d="M4 6h16M4 12h16M4 18h16" />
          <circle cx="9" cy="6" r="2" />
          <circle cx="16" cy="12" r="2" />
          <circle cx="7" cy="18" r="2" />
          <circle class="nav-icon-signal" cx="16" cy="12" r="1.15" />
        }
        @case ('more') {
          <circle cx="5" cy="12" r="1.25" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none" />
          <circle cx="19" cy="12" r="1.25" fill="currentColor" stroke="none" />
        }
      }
    </svg>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        width: 1.2rem;
        height: 1.2rem;
        flex: 0 0 auto;
      }

      .nav-icon {
        width: 100%;
        height: 100%;
        overflow: visible;
      }

      .nav-icon-signal {
        fill: var(--nav-icon-signal, currentColor);
        stroke: none;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavIconComponent {
  readonly name = input.required<NavIconName>();
}
