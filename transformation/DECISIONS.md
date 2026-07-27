# Visual Transformation Decisions

Last updated: 2026-07-27

This log records decisions that should survive across chats, tools, and implementation sessions.

Statuses:

- **Locked** — proceed on this basis unless the user explicitly reopens it.
- **Provisional** — current working direction; validate before production rollout.
- **Rejected** — considered and intentionally not selected.
- **Open** — a decision is still required.

## Locked decisions

### D-001 — Long-running transformation branch

**Status:** Locked

Use `visual_transformation` as the long-running integration branch based on `main`. Transformation work must not be committed directly to `main`; reviewed slices merge back through squash merge.

### D-002 — Persistent transformation documentation

**Status:** Locked

The root `TRANSFORMATION.md` is the entry point. `transformation/` stores the master plan, decisions, status, working rules, prototypes, and implementation reports.

### D-003 — Overall identity direction

**Status:** Locked

Use an analytical, calm, precise, product-led identity: modern and structured without becoming cold enterprise software or a playful chess clone.

### D-004 — Core visual composition

**Status:** Locked

Use graphite product chrome, mostly light analytical workspaces, mint as the primary signal color, restrained elevation, and real application/chess data as the principal visual material.

### D-005 — Symbol concept

**Status:** Locked

Use the geometric **Node Branch** symbol. It represents played games or a known position branching into repertoire continuations and selected training targets. Do not restart broad logo exploration.

### D-006 — Product name treatment

**Status:** Locked for current program scope

Keep **Chess Repertoire Trainer**. Use `Chess Repertoire` as the primary live-text wordmark and `TRAINER` as the secondary descriptor. Do not embed the name in SVG paths.

### D-007 — Three distinct experiences

**Status:** Locked

Maintain separate public, authentication, and signed-in experiences. Authentication must not render inside the full signed-in application shell.

### D-008 — Public root page

**Status:** Locked

The root route `/` is a public product landing page that explains and demonstrates the game-to-training workflow.

### D-009 — Signed-in home

**Status:** Locked

Use `/home` as the signed-in product entry point. Study/library remains a focused training-selection workflow rather than the product-wide home.

### D-010 — Desktop navigation direction

**Status:** Locked and implemented on the Phase 1C review branch

Replace the crowded floating horizontal navigation with a compact collapsible left rail. Reuse the existing grouped navigation model rather than creating another source of truth.

### D-011 — Identity asset method

**Status:** Locked

Create the identity as controlled SVG geometry. It must work at favicon size, in a collapsed rail, in a live-text lockup, and in standard, reversed, and transparent contexts.

### D-012 — Visual proof before broad implementation

**Status:** Locked

Validate identity, landing, authentication, signed-in home, tokens, typography, and shell direction before broad page-by-page modernization.

### D-013 — Representative Phase 2 workflows

**Status:** Locked

Modernize representative workflows in this order:

1. Games;
2. Study;
3. Opening Analysis.

These prove data exploration, training selection, and board/workbench UI before wider rollout.

### D-014 — Strong-mint text token

**Status:** Locked for the current visual direction

Use `#1F7865` for strong mint text and accessible mint emphasis on light surfaces. It does not replace semantic success, warning, danger, information, evaluation, or chart colors.

### D-015 — Initial signed-in home implementation scope

**Status:** Locked and integrated through PR #87

The first `/home` renders in the signed-in shell, preserves explicit `returnUrl`, uses existing typed services, uses deterministic actions, adds no aggregation endpoint or Lab dependency, and retains the named seven-day stale-sync threshold.

### D-016 — Production brand asset and component contract

**Status:** Locked and integrated through PR #88

Use one 64×64 Node Branch source geometry for static assets and Angular rendering:

- path: `M18 49V18M18 29H34M34 29V15M34 29V44M34 44H50`;
- stroke width: `5`, with round caps and joins;
- nodes: `(18,50)`, `(34,14)`, `(51,44)`, radius `5.5`;
- badge corner radius: `16`.

Provide standard, reversed, transparent-mark, and favicon assets. `BrandMarkComponent` owns inline variants and accessibility. `BrandLockupComponent` owns the live-text wordmark and descriptor. Product surfaces must not redraw alternate topologies.

### D-017 — Phase 0D Angular home disposition

**Status:** Locked and integrated

PR #87 was squash-merged into `visual_transformation` after successful automated validation. Browser, responsive, Clerk, and request-timing review remain residual gaps.

### D-018 — Phase 1A production brand disposition

**Status:** Locked and integrated

PR #88 was squash-merged after final-head CI passed. The source geometry and shared component contract are accepted. Favicon, rasterization, contrast, proportions, and focus review remain residual gaps.

### D-019 — Phase 1B checkpoint boundary

**Status:** Locked and completed through PR #108

Phase 1B was discovery and static visualization only. It defined the desktop rail and interim mobile boundary without modifying Angular runtime files.

### D-020 — Phase 1C implementation boundary

**Status:** Locked for PR #112

Implement the approved rail only in the existing signed-in shell and navigation component. Preserve routes, active-prefix behavior, account behavior, root overlays, mobile access, APIs, schemas, database behavior, dependencies, and feature workflows. Do not combine token, typography, page-header, bottom-navigation, or representative-workflow changes into this slice.

### D-314 — Phase 1B navigation discovery disposition

**Status:** Locked and approved

The expanded rail, collapsed rail, account placement, anchored child-navigation direction, workspace pressure, and retained mobile sheet were reviewed and explicitly approved. Proceed with the narrow Phase 1C Angular implementation.

## Locked first-implementation navigation decisions

### D-310 — Initial desktop rail geometry

**Status:** Locked for Phase 1C browser validation

Use a 240px expanded rail and a 74px collapsed rail initially. Focused optical adjustment may remain within the approved 236–244px and 72–76px ranges after real-icon, long-label, account, and representative-page review.

### D-311 — Initial collapse behavior

**Status:** Locked for the first production slice

Provide an explicit expanded/collapsed control. Keep state local and session-only. Do not add route-specific auto-collapse or persisted preference in Phase 1C.

### D-312 — Parent and child navigation interaction

**Status:** Locked for Phase 1C

Keep parent anchors pointing to their current default routes and use a distinct keyboard-operable disclosure control for child destinations. Use anchored flyouts in both expanded and collapsed desktop modes. Child access must not depend on hover. Escape, backdrop interaction, and route navigation close transient flyouts.

### D-313 — Interim mobile navigation

**Status:** Locked for the first rail implementation

Below the shared 760px breakpoint, do not render the desktop rail. Retain a compact branded header and the complete grouped modal sheet generated from the existing navigation item model. Do not finalize bottom navigation.

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

Only the strong-mint text role is locked. Validate remaining values and semantic colors in representative analytical workflows.

### D-102 — Typography

**Status:** Provisional

Continue with IBM Plex Sans as the preferred UI stack and a compatible monospaced treatment for analytical numerics. Do not add font files or a loading mechanism until the strategy is approved.

### D-103 — Dark mode scope

**Status:** Provisional

Graphite chrome is required. A complete dark analytical workspace may be deferred if it does not fit cleanly into the initial shell work.

### D-104 — Initial home recommendations

**Status:** Provisional within the integrated implementation

Prioritize setup blockers, analysis backlog, weak/untrained repertoire work, the latest completed analysis, stale sync, and Progress. Show at most three recommendations and do not duplicate Continue.

### D-105 — Initial home action hierarchy

**Status:** Locked for the first implementation

Use one dominant Continue action, at most three explained recommendations, workspace shortcuts, and restrained recent progress. Recent signals is deferred.

### D-301 — Production Node Branch geometry

**Status:** Locked for source topology and coordinates; optical validation remains open

D-016 is the single source. Browser rasterization must still be reviewed at 16px, 24px, 32px, 42px, and 48px. Any optical correction must update assets and `BrandMarkComponent` together without topology divergence.

### D-303 — Landing-page copy and composition

**Status:** Provisional

The landing page merged through PR #78 remains the working baseline. Copy and lower-page composition may be refined after direct review, but the marketing concept must not be restarted silently.

### D-305 — First `/home` data composition

**Status:** Locked for the first implementation

Use existing account, library, imported-game, and performance APIs. Select default progress account, then active account, then first account. Continue priority is weak course, untrained course, latest analysed game, then Study. Do not add a home aggregation endpoint without measured evidence.

## Rejected directions

### D-201 — Generic chess-piece logo

**Status:** Rejected

Do not use a generic knight, king, crown, or chessboard as the core mark.

### D-202 — Decorative AI-generated logo as final asset

**Status:** Rejected

Generated raster artwork may support exploration but is not a production identity asset.

### D-203 — Train/Study as the signed-in home

**Status:** Rejected

Study is too narrow to represent the full product.

### D-204 — Keep the current horizontal pill navigation

**Status:** Rejected

The destination count and grouping no longer fit the desktop pattern.

### D-205 — Page-by-page independent reskin

**Status:** Rejected

Do not redesign pages independently before identity, layouts, tokens, and representative patterns are established.

### D-206 — Generic marketing imagery as primary landing visual

**Status:** Rejected

Use realistic application UI and chess data rather than stock chess imagery.

### D-207 — User-facing authentication-vendor language

**Status:** Rejected

Do not expose authentication-vendor implementation language in normal product copy.

### D-208 — Large early branding scope

**Status:** Rejected

Do not add a mascot, custom typeface, bespoke icon set, 3D chess system, or large illustration library.

### D-209 — Lab endpoints as first-home core dependencies

**Status:** Rejected for the first `/home`

Promote experimental capabilities deliberately before using them as stable home data.

### D-210 — New home aggregation API before evidence

**Status:** Rejected for the first implementation

Use existing typed data sources and measure request/loading behavior first.

### D-211 — Surface-specific Node Branch redraws

**Status:** Rejected

Do not maintain separate landing, authentication, signed-in, or decorative branch geometries or glyph substitutes.

### D-212 — Duplicate navigation source

**Status:** Rejected

Do not introduce a second hard-coded rail or mobile navigation definition. Continue using `MainNavigationComponent.mainNavItems` and its child definitions, links, icons, quiet state, and active prefixes.

### D-213 — Premature bottom navigation

**Status:** Rejected for Phase 1C

Do not select or implement permanent bottom-navigation destinations before Games, Study, and Opening Analysis provide representative mobile evidence.

### D-214 — Persisted or route-driven collapse in the first rail

**Status:** Rejected for Phase 1C

Do not use local storage, account settings, query parameters, or route heuristics for rail collapse in the first implementation.

## Open decisions

### D-302 — Final production palette

**Status:** Open

Lock remaining exact colors only after representative analytical UI and semantic-color testing.

### D-304 — Exact mobile navigation structure

**Status:** Open

Determine primary mobile destinations after modernizing Games, Study, and Opening Analysis. Phase 1C retains the complete grouped mobile sheet.

### D-306 — Authentication browser-validation disposition

**Status:** Open

Directly review `/login` and `/signup` at desktop/mobile widths and in configured-Clerk and local-development-auth modes.

### D-315 — Phase 1C production rail disposition

**Status:** Open

Review final-head CI, expanded/collapsed rail behavior, flyout placement, active states, keyboard interaction, account controls, representative page widths, mobile sheet behavior, and overlay coexistence. Decide whether to approve PR #112, require focused corrections, or reopen a specific interaction detail.
