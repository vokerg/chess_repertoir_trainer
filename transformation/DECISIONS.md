# Visual Transformation Decisions

Last updated: 2026-07-29

This log records decisions that must survive across chats, tools, agents, and implementation sessions.

Statuses:

- **Locked** — proceed on this basis unless explicitly reopened.
- **Provisional** — current working direction; validate before broad rollout.
- **Rejected** — considered and intentionally not selected.
- **Open** — a decision is still required.
- **Superseded** — retained as historical context; a later locked decision now governs.
- **Resolved** — the named open question has been answered by a locked decision.

## Locked decisions

### D-001 — Main-based transformation delivery

**Status:** Locked; supersedes the former long-running integration-branch model

Use short-lived task branches created from the current `main` head. Open reviewed pull requests against `main` and squash-merge into `main` only after explicit approval. Never commit transformation work directly to `main`.

The former `visual_transformation` branch is retired for new work after its accepted history was reintegrated into `main`. Historical reports and commit records may still name that branch because it was the delivery model at the time; they do not authorize new branches or pull requests against it.

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

`STATUS.md` must not duplicate a manually maintained live task queue. A new session selects work only from open `READY` issues, ordered by priority and then numeric order, after excluding unresolved dependencies and active claims. The issue must be claimed before implementation and closed only after approved squash merge into `main` and documentation reconciliation.

### D-023 — Production token namespace and migration boundary

**Status:** Locked for VT-103 review

`apps/web/src/design-system.css` owns namespaced production `--ui-*` tokens and is loaded immediately after `apps/web/src/styles.css`.

`styles.css` remains the explicit legacy compatibility layer while feature migrations are incomplete. Its short token names such as `--accent`, `--surface`, `--border`, and `--text` must not be silently redefined to the production system because Games, Study, Opening Analysis, workbench UI, and other unmigrated consumers still depend on their existing meanings.

Global canvas, typography, form controls, focus treatment, shared page headers, shared panels, and shared shell actions may consume the production layer now. Feature-local migration must occur only in the issue that owns that workflow. Do not perform a repository-wide token search-and-replace.

### D-024 — Production colour and semantic-token contract

**Status:** Locked for VT-103 review

Use the canonical roles and values documented in `docs/frontend/design-tokens.md`:

- canvas: `#E7EEEA`, with optional soft canvas `#EEF4F1`;
- strong surface: `#FFFFFF`;
- muted surface: `#F2F6F4`;
- quiet surface: `#EAF1ED`;
- standard border: `#C4D1CB`;
- strong border: `#AEBFB7`;
- primary graphite: `#172321`;
- raised graphite: `#22312E` and `#2A3D38`;
- signal mint: `#47B89C`;
- strong mint: `#1F7865`;
- mint subtle: `#DFF3ED`.

Semantic status colours remain distinct from mint:

- success: `#256B45`;
- warning: `#8A4B0F`;
- danger: `#A7352A`;
- information: `#2B6480`.

Use tonal separation and borders before elevation. Strong shadows belong primarily to overlays and dominant actions. Status and interaction meaning must never rely on colour alone.

### D-025 — Production typography and font-loading contract

**Status:** Locked for VT-103 review

Do not bundle font files and do not introduce a remote font request. The production UI stack is:

`system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.

IBM Plex Sans remains the visual reference used by transformation prototypes, not a runtime dependency. A future font-loading change requires a separately approved decision covering licensing, privacy, performance, offline behavior, and fallbacks.

Use the production monospaced stack only for analytical numerics and notation such as evaluations, ratings, percentages, move counts, coordinates, hashes, PGN, and FEN.

### D-026 — Evidence-based shared presentation boundary

**Status:** Locked for VT-204 review

Promote a feature presentation pattern to `shared/ui` only when at least two implemented consumers demonstrate a compatible, feature-agnostic contract.

VT-204 promotes exactly two contracts:

- `app-context-strip` renders typed, read-only label/value context with optional step markers and mono values. Study and Opening Analysis compute their own items from existing feature state.
- `app-fact-grid` renders typed semantic label/value facts with configurable column presentation. Games responsive cards and Study line health compute their own facts and retain all domain formatting and behavior.

Both components remain OnPush, semantic, router-free, store-free, HTTP-free, and dependent only on production `--ui-*` roles. They must not gain feature-specific inputs or workflow commands.

The following remain feature-owned because the comparison did not prove a common contract: Games filter presentation and responsive evidence cards; Study numbered section headers, training-plan composition, scope-versus-mode controls, and mobile launcher; Opening Analysis workbench slots, evidence-stack hierarchy, header toggle ownership, and feature-scoped legacy-role bridge. Future consumers may reuse the shared primitives, but they must not broaden these contracts speculatively.

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

The existing navigation model, parent routes, active prefixes, single-open transient state, Escape cleanup, route cleanup, account placement, and session-only collapse behavior remain unchanged. Motion is native CSS only, restrained, and removed under `prefers-reduced-motion`. Expanded-rail vertical scrolling handles shorter desktop heights.

PR #137 was originally squash-merged under the former integration model as `033d05ededc03e114a4b02655de91a6313c4d902` and is now integrated into `main` through the visual-transformation reintegration. Runtime/test CI #1112 and final documentation-head CI #1118 passed the complete repository workflow before merge. Direct browser evidence remains owned by issue #126.

### D-313 — Interim mobile navigation

**Status:** Superseded by D-314

The interim baseline used a compact branded header and complete grouped modal sheet below the shared 760px breakpoint. It intentionally deferred permanent primary destinations until Games, Study, and Opening Analysis supplied representative evidence.

### D-314 — Final mobile-primary navigation

**Status:** Locked for VT-205 review

Below the shared 760px breakpoint, use a persistent five-slot mobile-primary navigation:

1. Home;
2. Study;
3. Games;
4. Openings;
5. More.

Home is the signed-in default. Study, Games, and Openings are the three representative workflows and the first three Home workspace shortcuts. `More` retains complete access to Courses, Builder, Progress, Tools, Settings, account controls, and all child destinations.

The persistent destinations must be derived by stable id from `MainNavigationComponent.mainNavItems`; do not introduce a duplicate mobile route source. The complete `More` dialog also renders the same hierarchical model, including icons, descriptions, quiet state, links, and active prefixes.

Primary routes mark their persistent destination active. Any active secondary top-level destination marks More active. Child routes continue to inherit parent activity through the established active-prefix rules.

Use native modal-dialog behavior for complete destination access, Escape handling, and focus containment. Restore focus to More after user-initiated closure, but do not restore focus after route navigation. Reserve safe-area-aware application and imported-game job-panel clearance above the fixed navigation.

Preserve desktop rail behavior, route taxonomy, account ownership, feature-owned mobile launchers, board/training workflows, APIs, stores, schemas, database behavior, and dependencies.

## Provisional decisions

### D-101 — Palette values

**Status:** Superseded by D-024

The original graphite/mint palette was provisional evidence. VT-102 calibrated the Home values and D-024 now defines the production colour and semantic-token contract.

### D-102 — Typography

**Status:** Superseded by D-025

IBM Plex Sans remains a visual reference only. D-025 defines the production system-font and monospaced stacks without bundled or remote font loading.

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

**Status:** Rejected before representative workflow evidence; prerequisite satisfied by D-314

Do not select permanent bottom-navigation destinations before Games, Study, and Opening Analysis provide evidence. VT-205 applied that evidence and D-314 now governs the final mobile-primary model.

### D-214 — Persisted or route-driven rail collapse in the first rail

**Status:** Rejected for the current baseline

Do not use local storage, account settings, query parameters, or route heuristics without a later approved issue.

## Open decisions

### D-302 — Final production palette

**Status:** Resolved by D-024

VT-102 supplied calibrated Home evidence. D-024 and `docs/frontend/design-tokens.md` define the production token contract; workflow migration remains sequenced through issues #127–#133.

### D-304 — Exact mobile navigation structure

**Status:** Resolved by D-314

VT-205 selected Home, Study, Games, Openings, and More after representative workflow evidence. D-314 defines route-source ownership, overflow coverage, active state, modal behavior, safe-area clearance, and preserved boundaries.

### D-306 — Authentication and shell browser-validation disposition

**Status:** Open

Issue #126 owns the residual public, authentication, Home, brand, navigation, Clerk, motion, job-panel, and representative responsive validation matrix.
