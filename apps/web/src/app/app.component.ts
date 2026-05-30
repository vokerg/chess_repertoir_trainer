import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule],
  template: `
    <div class="page-shell app-shell">
      <header class="app-header">
        <div class="app-header-inner">
          <div class="app-header-copy">
            <h1 class="app-title">Chess Repertoire Trainer</h1>
          </div>
          <nav class="app-nav" aria-label="Main navigation">
            <a routerLink="/library" routerLinkActive="nav-pill-active" class="nav-pill">Study</a>
            <a routerLink="/accounts" routerLinkActive="nav-pill-active" class="nav-pill">Accounts</a>
            <a routerLink="/games" routerLinkActive="nav-pill-active" class="nav-pill">Games</a>
            <a routerLink="/opening-analysis" routerLinkActive="nav-pill-active" class="nav-pill">Opening analysis</a>
            <a routerLink="/stats" routerLinkActive="nav-pill-active" class="nav-pill">Review</a>
            <a routerLink="/courses" routerLinkActive="nav-pill-active" class="nav-pill">Courses</a>
          </nav>
        </div>
      </header>

      <main class="app-main">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [
    `
    .app-shell {
      padding: 14px 0 28px;
    }

    .app-header {
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 0.65rem;
      background: rgba(255, 250, 241, 0.88);
      box-shadow: var(--shadow-soft);
      backdrop-filter: blur(16px);
    }

    .app-header-inner {
      display: flex;
      flex-wrap: wrap;
      gap: 0.65rem;
      align-items: center;
      justify-content: space-between;
    }

    .app-header-copy {
      flex: 1 1 260px;
      min-width: 0;
    }

    .app-title {
      margin: 0;
      color: var(--text);
      font-size: clamp(1.05rem, 1.8vw, 1.35rem);
      font-weight: 900;
      line-height: 1.15;
    }

    .app-nav {
      display: flex;
      gap: 0.35rem;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .app-main {
      padding: 14px 0 40px;
    }

    .nav-pill {
      display: inline-flex;
      align-items: center;
      min-height: 34px;
      padding: 0.45rem 0.7rem;
      border-radius: 12px;
      text-decoration: none;
      color: var(--muted-strong);
      background: transparent;
      border: 1px solid transparent;
      font-size: 0.86rem;
      font-weight: 800;
      transition: background 140ms ease, color 140ms ease, border-color 140ms ease;
    }

    .nav-pill:hover {
      color: var(--text);
      background: rgba(35, 27, 21, 0.06);
    }

    .nav-pill-active {
      color: var(--accent-strong);
      background: var(--accent-soft);
      border-color: rgba(183, 121, 39, 0.18);
    }

    @media (max-width: 760px) {
      .app-header-inner {
        align-items: stretch;
      }

      .app-nav {
        justify-content: flex-start;
      }
    }
    `
  ]
})
export class AppComponent {}
