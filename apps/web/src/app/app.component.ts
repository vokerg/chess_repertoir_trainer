import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule],
  template: `
    <div class="page-shell" style="padding:20px 0 28px;">
      <header class="glass-card" style="border-radius:32px;padding:24px 24px 22px;position:relative;overflow:hidden;">
        <div style="position:absolute;inset:auto -80px -80px auto;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle, rgba(183,121,39,0.38), transparent 68%);pointer-events:none;"></div>
        <div style="display:flex;flex-wrap:wrap;gap:20px;align-items:flex-end;justify-content:space-between;position:relative;">
          <div style="max-width:700px;">
            <span class="eyebrow">Opening Lab</span>
            <h1 class="page-heading">Chess Repertoire Trainer</h1>
            <p class="page-subtitle">
              Build polished opening trees, train the critical branches, and keep weak spots visible before they punish you over the board.
            </p>
          </div>
          <nav style="display:flex;gap:10px;flex-wrap:wrap;">
            <a routerLink="/courses" routerLinkActive="nav-pill-active" class="nav-pill">Courses</a>
            <a routerLink="/stats" routerLinkActive="nav-pill-active" class="nav-pill">Stats</a>
          </nav>
        </div>
      </header>

      <main style="padding:18px 0 40px;">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [
    `
    .nav-pill {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
      padding: 0.75rem 1rem;
      border-radius: 999px;
      text-decoration: none;
      color: rgba(255,255,255,0.82);
      background: rgba(28, 26, 24, 0.78);
      border: 1px solid rgba(255,255,255,0.08);
      font-weight: 800;
      transition: transform 140ms ease, background 140ms ease, color 140ms ease;
    }

    .nav-pill:hover {
      transform: translateY(-1px);
      color: white;
      background: rgba(28, 26, 24, 0.96);
    }

    .nav-pill-active {
      color: white;
      background: linear-gradient(135deg, #b77927 0%, #8f4f0d 100%);
      border-color: transparent;
      box-shadow: 0 12px 28px rgba(143, 79, 13, 0.28);
    }
    `
  ]
})
export class AppComponent {}
