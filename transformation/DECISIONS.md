# Visual Transformation Decisions

Last updated: 2026-07-28

This log records decisions that must survive across chats, tools, agents, and implementation sessions.

Statuses:

- **Locked** — proceed on this basis unless explicitly reopened.
- **Provisional** — current working direction; validate before broad rollout.
- **Rejected** — considered and intentionally not selected.
- **Open** — a decision is still required.

## Locked decisions

### D-001 — Long-running transformation branch

**Status:** Locked

Use `visual_transformation` as the long-running integration branch based on `main`. Work uses short-lived branches and reviewed squash-merge pull requests. Never commit transformation work directly to `main`.

### D-002 — Persistent transformation documentation

**Status:** Locked

Root `TRANSFORMATION.md` is the stable entry point. `transformation/` owns the master plan, decisions, integrated status, working rules, prototypes, migration records, and reports.

### D-003 — Overall identity direction

**Status:** Locked

Use an analytical, calm, precise, product-led identity: modern and structured without becoming cold enterprise software or a playful chess clone.

### D-004 — Core visual composition

**Status:** Locked

Use graphite product chrome, mostly light analytical workspaces, mint as the primary interaction and signal colour, restrained elevation, and real chess/application data as the principal visual material.

### D-005 — Symbol concept

**Status:** Locked

Use the geometric Node Branch symbol. It represents played games or a known position branching into repertoire continuations and selected training targets. Do not restart broad logo exploration.

### D-006 — Product name treatment

**Status:** Locked for current program scope

Keep Chess Repertoire Trainer. Use `Chess Repertoire` as the primary live-text wordmark and `TRAINER` as the secondary descriptor. Do not embed the name in SVG paths.

### D-007 — Three distinct experiences

**Status:** Locked

Maintain separate public, authentication, and signed-in experiences. Authentication must not render inside the full signed-in application shell.

### D-008 — Public root page

**Status:** Locked and integrated through PR #78

The root route `/` is a public product landing page that explains and demonstrates the game-to-training workflow.

### D-009 — Signed-in Home

**Status:** Locked and integrated through PR #87

Use `/home` as the signed-in product entry point. Study/library remains a focused training-selection workflow rather than the product-wide Home.

### D-010 — Desktop navigation direction

**Status:** Locked and integrated through PR #112

Use a compact collapsible left rail and reuse the existing grouped navigation model rather than creating another source of truth.

### D-011 — Identity asset method

**Status:** Locked and integrated through PR #88

Create the identity as controlled SVG geometry that works at favicon size, in the collapsed rail, in live-text lockups, and in standard, reversed, and transparent contexts.

### D-012 — Visual proof before broad implementation

**Status:** Locked

Validate identity, public, authentication, signed-in Home, tokens, typography, and shell direction before broad page-by-page modernization.

### D-013 — Representative Phase 2 workflows

**Status:** Locked

Modernize representative workflows in this order:

1. Games;
2. Study;
3. Opening Analysis.

These prove data exploration, training selection, and board/workbench UI before wider rollout.

### D-014 — Strong-mint text token

**Status:** Locked for the current visual direction

Use `#1F7865` for strong mint text and accessible mint emphasis on light surfaces. It does not replace semantic success, warning, danger, information, evaluation, or chart colours.

### D-015 — Initial signed-in Home implementation scope

**Status:** Locked and integrated through PR #87

The first Home uses the signed-in shell, preserves explicit `returnUrl`, uses existing typed services and deterministic actions, adds no aggregation endpoint or Lab dependency, and retains the named seven-day stale-sync threshold.

### D-016 — Production Node Branch geometry

**Status:** Locked and integrated through PR #88

Use one 64×64 source geometry for static assets and Angular rendering:

- path: `M18 49V18M18 29H34M34 29V15M34 29V44M34 44H50`;
- stroke width: `5`, round caps and joins;
- nodes: `(18,50)`, `(34,14)`, `(51,44)`, radius `5.5`;
- badge corner radius: `16`.

`BrandMarkComponent` owns inline variants and accessibility. `BrandLockupComponent` owns the live-text wordmark. Product surfaces must not redraw alternate topologies.

### D-017 — Angular Home disposition

**Status:** Locked and integrated through PR #87

Automated validation passed. Browser, responsive, Clerk, and request-timing review remain residual gaps.

### D-018 — Production brand disposition

**Status:** Locked and integrated through PR #88

Source geometry and shared component contracts are accepted. Favicon, rasterization, contrast, proportions, and focus review remain residual gaps.

### D-019 — Phase 1B checkpoint boundary

**Status:** Locked and completed through PR #108

Phase 1B defined the desktop rail and interim mobile boundary without modifying Angular runtime files.

### D-020 — Phase 1C implementation boundary

**Status:** Locked and integrated through PR #112

The rail was implemented only in the existing signed-in shell and navigation component. Routes, active-prefix behavior, account behavior, root overlays, mobile access, APIs, schemas, database behavior, dependencies, and feature workflows were preserved.

### D-021 — Phase 1D public landing motion

**Status:** Locked and integrated through PR #120

Selected lower-page public landing compositions reveal once using a feature-local helper, native `IntersectionObserver`, opacity, an 18px vertical translation, and short capped delays. Content remains visible when observation or `matchMedia` is unavailable or reduced motion is requested. The header, hero, first-screen product composition, footer, copy, routes, layout, global tokens, and signed-in application remain unchanged.

PR #120 was squash-merged as `bf9308d65b61323d534f99eeda0c0223907c20bb`; integration CI #1051 passed. Direct browser motion review remains residual.

### D-022 — Hybrid documentation and GitHub Issue execution model

**Status:** Locked

Repository documents and GitHub Issues have separate ownership:

- repository documents own visual direction, architecture, phase outcomes, decisions, detailed acceptance criteria, integrated status, migration records, and reports;
- [Visual Transformation Program issue #122](https://github.com/vokerg/chess_repertoir_trainer/issues/122) and its child issues own the live queue, priority, order, readiness, dependencies, blockers, claim, implementation branch, pull request, and completion state.

`STATUS.md` must not duplicate a manually maintained live task queue. A new session selects work only from open `READY` issues, ordered by priority and then numeric order, after excluding unresolved dependencies and active claims. The issue must be claimed before implementation and closed only after squash merge and documentation reconciliation.

## Locked navigation decisions

### D-310 — Initial desktop rail geometry

**Status:** Locked for the integrated baseline; optical validation remains open

Use a 240px expanded rail and a 74px collapsed rail initially. Focused optical adjustment may remain within 236–244px and 72–76px after real-icon, long-label, account, and representative-page review.

### D-311 — Initial collapse behavior

**Status:** Locked for the integrated baseline

Provide an explicit expanded/collapsed control. Keep state local and session-only. Do not add route-specific auto-collapse or persisted preference without a later approved issue.

### D-312 — Parent and child navigation interaction

**Status:** Locked and integrated through PR #137

Expanded desktop child navigation uses inline disclosure groups in normal rail flow so lower destinations move down when a parent opens. Only one parent is open at a time. Expanded-mode child links use ordinary navigation/disclosure semantics rather than popup-menu roles.

Collapsed desktop child navigation retains the anchored popup-menu flyout and transparent backdrop. In this mode only, the disclosure exposes popup-menu semantics and child links retain menu-item roles.

The existing navigation model, parent routes, active prefixes, single-open transient state, Escape cleanup, route cleanup, mobile sheet, account placement, and session-only collapse behavior remain unchanged. Motion is native CSS only, restrained, and removed under `prefers-reduced-motion`. Expanded-rail vertical scrolling handles shorter desktop heights.

PR #137 was squash-merged into `visual_transformation` as `033d05ededc03e114a4b02655de91a6313c4d902`. Runtime/test CI #1112 and final documentation-head CI #1118 passed the complete repository workflow before merge. Direct browser evidence remains owned by issue #126 after issue #124 is integrated.

### D-313 — Interim mobile navigation

**Status:** Locked for the current baseline

Below the shared 760px breakpoint, render a compact branded header and complete grouped modal sheet from the existing navigation model. Do not finalize bottom navigation before representative workflow evidence; issue #131 owns that later decision.

## Provisional decisions

### D-101 — Palette values

**Status:** Provisional

Working values:

- Graphite: `#172321`
- Secondary graphite: `#22312E`
- Signal mint: `#47B89C`
- Strong mint text: `#1F7865`
- Mint subtle: `#DFF3ED`
- Workspace: `#EEF3F0`
- Surface: `#FFFFFF`
- Primary text: `#172321`
- Secondary text: `#63716D`
- Border: `#CBD7D2`

Only the strong-mint text role is locked. Issue #124 calibrates Home canvas/surface balance; issue #125 owns production tokens and semantic colours.

### D-102 — Typography

**Status:** Provisional

Continue with IBM Plex Sans as the preferred UI stack and a compatible monospaced treatment for analytical numerics. Do not add or distribute font files. Issue #125 owns the loading/fallback and production-token decision.

### D-103 — Dark mode scope

**Status:** Provisional

Graphite chrome is required. A complete dark analytical workspace may be deferred.

### D-104 — Initial Home recommendations

**Status:** Provisional within the integrated implementation

Prioritize setup blockers, analysis backlog, weak/untrained repertoire work, the latest completed analysis, stale sync, and Progress. Show at most three recommendations and do not duplicate Continue.

### D-105 — Initial Home action hierarchy

**Status:** Locked for the first implementation

Use one dominant Continue action, at most three explained recommendations, workspace shortcuts, and restrained recent progress. Recent signals remains deferred.

### D-301 — Production Node Branch optical validation

**Status:** Locked for topology and coordinates; optical validation remains open

D-016 is the single source. Browser rasterization must still be reviewed at 16px, 24px, 32px, 42px, and 48px. Any correction must update assets and `BrandMarkComponent` together.

### D-303 — Landing-page copy and composition

**Status:** Provisional

The landing page merged through PR #78 remains the baseline. Copy and lower-page composition may be refined after direct review, but the marketing concept must not be restarted silently.

### D-305 — First Home data composition

**Status:** Locked for the first implementation

Use existing account, library, imported-game, and performance APIs. Select default progress account, then active account, then first account. Continue priority is weak course, untrained course, latest analysed game, then Study. Do not add a Home aggregation endpoint without measured evidence.

## Rejected directions

### D-201 — Generic chess-piece logo

**Status:** Rejected

Do not use a generic knight, king, crown, or chessboard as the core mark.

### D-202 — Decorative generated raster logo as final asset

**Status:** Rejected

Generated raster artwork may support exploration but is not a production identity asset.

### D-203 — Study as the signed-in Home

**Status:** Rejected

Study is too narrow to represent the complete product.

### D-204 — Keep the horizontal pill navigation

**Status:** Rejected

The destination count and grouping do not fit that desktop pattern.

### D-205 — Page-by-page independent reskin

**Status:** Rejected

Do not redesign pages independently before identity, layouts, tokens, and representative patterns are established.

### D-206 — Generic marketing imagery as the primary landing visual

**Status:** Rejected

Use realistic application UI and chess data rather than stock chess imagery.

### D-207 — User-facing authentication-vendor language

**Status:** Rejected

Do not expose authentication-vendor implementation language in normal product copy.

### D-208 — Large early branding scope

**Status:** Rejected

Do not add a mascot, custom typeface, bespoke icon set, 3D chess system, or large illustration library.

### D-209 — Lab endpoints as first-Home core dependencies

**Status:** Rejected for the first Home

Promote experimental capabilities deliberately before using them as stable Home data.

### D-210 — New Home aggregation API before evidence

**Status:** Rejected for the first implementation

Use existing typed data sources and measure request/loading behavior first.

### D-211 — Surface-specific Node Branch redraws

**Status:** Rejected

Do not maintain separate landing, authentication, signed-in, or decorative branch geometries.

### D-212 — Duplicate navigation source

**Status:** Rejected

Continue using `MainNavigationComponent.mainNavItems` and its child definitions, links, icons, quiet state, and active prefixes.

### D-213 — Premature bottom navigation

**Status:** Rejected before representative workflow evidence

Do not select permanent bottom-navigation destinations before Games, Study, and Opening Analysis provide evidence. Issue #131 owns the final decision.

### D-214 — Persisted or route-driven rail collapse in the first rail

**Status:** Rejected for the current baseline

Do not use local storage, account settings, query parameters, or route heuristics without a later approved issue.

## Open decisions

### D-302 — Final production palette

**Status:** Open

Issue #124 calibrates Home; issue #125 locks production tokens after that evidence.

### D-304 — Exact mobile navigation structure

**Status:** Open

Issue #131 decides the structure after Games, Study, and Opening Analysis modernization.

### D-306 — Authentication and shell browser-validation disposition

**Status:** Open

Issue #126 owns the residual public, authentication, Home, brand, navigation, Clerk, motion, job-panel, and representative responsive validation matrix.
