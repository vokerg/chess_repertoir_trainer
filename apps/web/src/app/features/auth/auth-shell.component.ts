import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-auth-shell',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="auth-shell">
      <section class="auth-story" aria-labelledby="auth-story-title">
        <a routerLink="/" class="brand-lockup" aria-label="Chess Repertoire Trainer home">
          <span class="brand-mark" aria-hidden="true">
            <i class="node source"></i><i class="branch branch-a"></i><i class="branch branch-b"></i>
            <i class="node target target-a"></i><i class="node target target-b"></i>
          </span>
          <span class="brand-copy"><strong>Chess Repertoire</strong><small>TRAINER</small></span>
        </a>

        <div class="story-copy">
          <p class="eyebrow">YOUR CHESS, CONNECTED</p>
          <h1 id="auth-story-title">Build from the positions you actually play.</h1>
          <p>
            Turn imported games into practical repertoire work, targeted training, and progress you can act on.
          </p>
        </div>

        <ol class="product-loop" aria-label="Product workflow">
          <li><span>01</span><strong>Import games</strong></li>
          <li><span>02</span><strong>Find recurring gaps</strong></li>
          <li><span>03</span><strong>Train useful positions</strong></li>
        </ol>
      </section>

      <section class="auth-workspace" [attr.aria-labelledby]="headingId()">
        <a routerLink="/" class="mobile-brand">Chess Repertoire <small>TRAINER</small></a>
        <div class="auth-card">
          <div class="auth-heading">
            <p class="eyebrow">{{ eyebrow() }}</p>
            <h2 [id]="headingId()">{{ heading() }}</h2>
            <p>{{ description() }}</p>
          </div>
          <ng-content />
        </div>
        <p class="auth-footnote">Your repertoire and game data remain tied to your account.</p>
      </section>
    </main>
  `,
  styleUrl: './auth-shell.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthShellComponent {
  readonly eyebrow = input.required<string>();
  readonly heading = input.required<string>();
  readonly headingId = input.required<string>();
  readonly description = input.required<string>();
}
