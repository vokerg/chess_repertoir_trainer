import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrandLockupComponent } from '../../shared/ui/brand/brand-lockup.component';
import { BrandMarkComponent } from '../../shared/ui/brand/brand-mark.component';
import { RevealOnScrollDirective } from './reveal-on-scroll.directive';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [RouterLink, BrandLockupComponent, BrandMarkComponent, RevealOnScrollDirective],
  template: `
    <a class="skip-link" href="#main-content">Skip to content</a>

    <header class="site-header">
      <a class="brand-link" href="#main-content" aria-label="Chess Repertoire Trainer home">
        <app-brand-lockup tone="inverse" markVariant="badge" [collapseAtMobile]="true" />
      </a>

      <nav class="site-nav" aria-label="Primary navigation">
        <a href="#workflow">Workflow</a>
        <a href="#capabilities">Product</a>
        <a href="#progress">Progress</a>
      </nav>

      <div class="header-actions">
        <a class="text-action" routerLink="/login">Sign in</a>
        <a class="button button-primary button-small" routerLink="/signup">Start building</a>
      </div>
    </header>

    <main id="main-content">
      <section class="hero section-shell">
        <div class="hero-copy">
          <p class="eyebrow">YOUR CHESS, CONNECTED</p>
          <h1>Turn your games into a repertoire you actually train.</h1>
          <p class="hero-lead">
            Import your games, uncover recurring weaknesses, strengthen your courses and practise the
            positions that matter in real play.
          </p>
          <div class="hero-actions">
            <a class="button button-primary" routerLink="/signup">Start building your repertoire</a>
            <a class="button button-secondary" href="#workflow">See the workflow</a>
          </div>
          <dl class="hero-proof" aria-label="Product highlights">
            <div><dt>One system</dt><dd>Games, openings and training</dd></div>
            <div><dt>Focused</dt><dd>Actions based on your own play</dd></div>
            <div><dt>Practical</dt><dd>Repertoire gaps you can fix</dd></div>
          </dl>
        </div>

        <div class="product-stage" aria-label="Example opening intelligence workspace">
          <div class="browser-frame">
            <div class="browser-bar" aria-hidden="true">
              <span></span><span></span><span></span><p>Opening intelligence</p>
            </div>
            <div class="workspace-bar">
              <div><p class="workspace-kicker">COURSE REVIEW</p><strong>Sicilian Defence</strong></div>
              <span class="status-chip">8 gaps found</span>
            </div>
            <div class="analysis-layout">
              <div class="board-wrap">
                <div class="chessboard" role="img" aria-label="Illustrative chess position">
                  <span class="piece dark" style="--file:1;--rank:1">♜</span>
                  <span class="piece dark" style="--file:7;--rank:1">♚</span>
                  <span class="piece dark" style="--file:3;--rank:3">♟</span>
                  <span class="piece dark" style="--file:6;--rank:2">♟</span>
                  <span class="piece dark" style="--file:5;--rank:3">♞</span>
                  <span class="piece light" style="--file:7;--rank:8">♔</span>
                  <span class="piece light" style="--file:1;--rank:8">♖</span>
                  <span class="piece light" style="--file:6;--rank:6">♘</span>
                  <span class="piece light" style="--file:4;--rank:5">♙</span>
                  <span class="piece light" style="--file:7;--rank:6">♙</span>
                  <span class="last-move" style="--file:5;--rank:3"></span>
                </div>
                <div class="board-meta"><span>White to move</span><code>+0.42</code></div>
              </div>
              <div class="insight-column">
                <article class="insight-card insight-card-primary">
                  <div class="insight-heading"><p class="workspace-kicker">COURSE GAP</p><code>14 games</code></div>
                  <h2>9...Be7 is common in your games, but the course stops here.</h2>
                  <p>Add the continuation before this position becomes another repeated surprise.</p>
                  <div class="frequency"><span></span></div>
                  <div class="move-line"><span>8. O-O</span><i>→</i><span>Be7</span><i>→</i><strong>9. Re1</strong></div>
                </article>
                <article class="insight-card next-action-card">
                  <div><p class="workspace-kicker">RECOMMENDED NEXT</p><h3>Add the continuation, then train both responses.</h3></div>
                  <span class="action-arrow" aria-hidden="true">→</span>
                </article>
                <div class="metric-grid">
                  <article><strong>184</strong><span>games reviewed</span></article>
                  <article><strong>12</strong><span>weak lines</span></article>
                  <article><strong>82%</strong><span>review accuracy</span></article>
                </div>
              </div>
            </div>
          </div>
          <aside class="floating-insight"><app-brand-mark class="mini-mark" variant="mark" [size]="34" /><div><small>Training ready</small><strong>8 positions selected</strong></div></aside>
        </div>
      </section>

      <section id="workflow" class="workflow section-shell" aria-labelledby="workflow-title">
        <div class="section-intro" appRevealOnScroll>
          <p class="eyebrow">ONE CONTINUOUS WORKFLOW</p>
          <h2 id="workflow-title">Every game should improve the next one.</h2>
          <p>The application connects data collection, understanding, repertoire work and training instead of leaving them as separate tools.</p>
        </div>
        <ol class="workflow-steps">
          <li appRevealOnScroll><span>01</span><strong>Import games</strong><p>Bring in recent play and keep analysis current.</p></li>
          <li appRevealOnScroll data-reveal-delay="50"><span>02</span><strong>Find patterns</strong><p>Expose recurring decisions, gaps and tactical misses.</p></li>
          <li appRevealOnScroll data-reveal-delay="100"><span>03</span><strong>Build repertoire</strong><p>Extend courses with continuations you actually meet.</p></li>
          <li appRevealOnScroll data-reveal-delay="150"><span>04</span><strong>Train positions</strong><p>Practise weak lines and high-value decisions.</p></li>
          <li appRevealOnScroll data-reveal-delay="200"><span>05</span><strong>Measure progress</strong><p>See what improved and where to focus next.</p></li>
        </ol>
      </section>

      <section id="capabilities" class="capabilities section-shell" aria-labelledby="capabilities-title">
        <div class="section-intro compact-intro" appRevealOnScroll>
          <p class="eyebrow">FROM DATA TO DECISIONS</p>
          <h2 id="capabilities-title">A practical chess system built around your play.</h2>
        </div>
        <article class="capability">
          <div class="capability-copy" appRevealOnScroll><span class="capability-number">01</span><p class="eyebrow">UNDERSTAND YOUR GAMES</p><h3>See the patterns behind individual results.</h3><p>Review engine analysis, tags, opening assignments, tactical detections and performance trends in one connected history.</p></div>
          <div class="capability-demo games-demo" appRevealOnScroll data-reveal-delay="90"><div class="demo-toolbar"><strong>Recent games</strong><span>Last 3 months</span></div><div class="game-row"><span class="result win">W</span><div><strong>vs. northstar_64</strong><small>Sicilian Defence · 31 moves</small></div><code>91%</code></div><div class="game-row"><span class="result loss">L</span><div><strong>vs. stonebishop</strong><small>French Defence · 42 moves</small></div><code>74%</code></div><div class="game-row"><span class="result draw">D</span><div><strong>vs. quietrook</strong><small>Queen's Gambit · 38 moves</small></div><code>83%</code></div></div>
        </article>
        <article class="capability reverse">
          <div class="capability-copy" appRevealOnScroll><span class="capability-number">02</span><p class="eyebrow">BUILD A PRACTICAL REPERTOIRE</p><h3>Grow courses from positions that occur in real games.</h3><p>Compare your repertoire with your game history, discover where lines end too early and add useful continuations without guessing.</p></div>
          <div class="capability-demo branch-demo" appRevealOnScroll data-reveal-delay="90"><div class="demo-toolbar"><strong>Sicilian · Classical</strong><span>Coverage 68%</span></div><div class="branch-row"><span>e4</span><i></i><span>c5</span><i></i><span>Nf3</span><i></i><strong>Be7<small>14 games</small></strong></div><div class="demo-footer"><span>Most useful next addition</span><strong>9...Be7 continuation</strong></div></div>
        </article>
        <article class="capability">
          <div class="capability-copy" appRevealOnScroll><span class="capability-number">03</span><p class="eyebrow">TRAIN WHAT MATTERS</p><h3>Turn weaknesses into small, deliberate sessions.</h3><p>Build training from weak lines, missed tactical shots and recent repertoire changes instead of reviewing everything equally.</p></div>
          <div class="capability-demo training-demo" appRevealOnScroll data-reveal-delay="90"><small>Focused session</small><h3>Weak Sicilian lines</h3><div class="session-progress"><span></span></div><div class="session-stats"><div><strong>5 / 8</strong><small>positions</small></div><div><strong>84%</strong><small>accuracy</small></div><div><strong>6m</strong><small>elapsed</small></div></div><a class="button button-primary full-width" routerLink="/signup">Start a session</a></div>
        </article>
      </section>

      <section id="progress" class="progress-section">
        <div class="section-shell progress-layout">
          <div class="progress-copy" appRevealOnScroll><p class="eyebrow">PROGRESS WITH CONTEXT</p><h2>Know what changed—and what deserves attention next.</h2><p>Progress is not a decorative dashboard. It connects recent training and game outcomes to the next useful decision.</p><a class="button button-reversed" routerLink="/signup">Explore your progress</a></div>
          <div class="progress-dashboard" appRevealOnScroll data-reveal-delay="90"><div class="progress-main"><small>Repertoire coverage</small><strong>68%</strong><div class="coverage-track"><span></span></div><p>+9 percentage points in 30 days</p></div><div class="progress-side"><article><small>Lines trained</small><strong>34</strong><span>this month</span></article><article><small>Review accuracy</small><strong>82%</strong><span>+6 points</span></article><article><small>Games analysed</small><strong>19</strong><span>5 need review</span></article></div></div>
        </div>
      </section>

      <section class="final-cta section-shell" appRevealOnScroll><app-brand-mark class="final-mark" variant="badge" [size]="72" /><div><p class="eyebrow">BUILD FROM YOUR OWN GAMES</p><h2>Make your repertoire respond to the chess you actually play.</h2></div><a class="button button-primary" routerLink="/signup">Start building</a></section>
    </main>

    <footer class="site-footer"><app-brand-lockup [markSize]="36" /><p>Games become insight. Insight becomes repertoire. Repertoire becomes training.</p><a routerLink="/login">Sign in</a></footer>
  `,
  styleUrl: './landing-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPageComponent {}
