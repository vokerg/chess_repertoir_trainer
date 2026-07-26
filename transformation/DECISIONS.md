# Visual Transformation Decisions

Last updated: 2026-07-26

This log records decisions that should survive across chats, tools, and implementation sessions.

Statuses:

- **Locked** — proceed on this basis unless the user explicitly reopens it.
- **Provisional** — current working direction; validate before production rollout.
- **Rejected** — considered and intentionally not selected.
- **Open** — a decision is still required.

## Locked decisions

### D-001 — Long-running transformation branch

**Status:** Locked

Use `visual_transformation` as the long-running integration branch based on `main`.

Transformation work must not be committed directly to `main`. Larger implementation slices may branch from `visual_transformation` and merge back into it.

### D-002 — Persistent transformation documentation

**Status:** Locked

The root `TRANSFORMATION.md` is the entry point for transformation sessions. The `transformation/` folder stores the master plan, decisions, status, and working rules.

Meaningful work must update these documents so context is not lost between ChatGPT, Copilot, Codex, or human sessions.

### D-003 — Overall identity direction

**Status:** Locked

Use an analytical, calm, precise, product-led identity.

The application should feel intelligently structured and modern without becoming cold enterprise software or a playful consumer chess clone.

### D-004 — Core visual composition

**Status:** Locked

Use:

- graphite application chrome;
- clean, mostly light analytical workspaces;
- mint as the main signal/accent color;
- restrained shadows and surfaces;
- real application UI and chess data as the principal visual material.

### D-005 — Symbol concept

**Status:** Locked

Use the geometric **Node Branch** symbol.

The symbol represents a known position or game source branching into candidate continuations and selected training targets.

No further broad logo-concept exploration is required. Future work should refine geometry and production behavior only.

### D-006 — Product name treatment

**Status:** Locked for current program scope

Keep the product name **Chess Repertoire Trainer**.

Preferred visual hierarchy:

- `Chess Repertoire` as the primary wordmark;
- `TRAINER` as the secondary descriptor.

Use live HTML text for the wordmark. Do not embed the product name into the SVG symbol.

### D-007 — Three distinct experiences

**Status:** Locked

The product requires separate visual and structural experiences for:

1. public website;
2. authentication;
3. signed-in application.

Authentication must not be displayed inside the full authenticated application shell.

### D-008 — Public root page

**Status:** Locked

The root route `/` should become a public product landing page rather than redirecting immediately to Study/library.

The page should explain and demonstrate the full game-to-training workflow.

### D-009 — Signed-in home

**Status:** Locked

Create a signed-in `/home` entry point.

Study/library remains a focused training workflow and should not serve as the product-wide home page.

The home page should answer what is happening and what the user should do next.

### D-010 — Desktop navigation direction

**Status:** Locked

Replace the crowded floating horizontal pill navigation with a compact, collapsible left navigation rail.

Reuse the existing navigation model and grouped destinations rather than creating a duplicate source of truth.

### D-011 — Identity asset method

**Status:** Locked

Create the logo as controlled SVG geometry, not as an AI-generated raster image.

The mark must work at favicon size, in a collapsed rail, in a full wordmark, and in monochrome/reversed contexts.

### D-012 — Visual proof before broad implementation

**Status:** Locked

Before implementing the full transformation, validate the selected identity through:

1. a production-oriented Node Branch proof;
2. a high-fidelity landing-page visualization;
3. final token and typography selection;
4. auth and signed-in home visualizations.

Do not start a broad page-by-page redesign without this proof.

### D-013 — Representative Phase 2 workflows

**Status:** Locked

After the shell and entry points, modernize these representative workflows first:

1. Games;
2. Study;
3. Opening Analysis.

They establish patterns for data exploration, training selection, and board/workbench UI.

### D-014 — Strong-mint text token

**Status:** Locked for the current visual direction

Use `#1F7865` for strong mint text and accessible mint emphasis on light workspace surfaces.

This replaces the earlier `#23836D` candidate for that role. It does not lock the complete production palette or permit mint to replace semantic success, warning, danger, information, evaluation, or chart colors.

### D-015 — Initial signed-in home implementation scope

**Status:** Locked for Phase 0D

The Phase 0C hierarchy and existing-data composition are approved for a narrow Angular implementation with these constraints:

- implement `/home` inside the current signed-in shell;
- make `/home` the normal sign-in and sign-up fallback while preserving every explicit `returnUrl`;
- add Home to the existing navigation data model without implementing the future left rail;
- use existing typed account, library catalog, game facet, recent-game, and performance services;
- do not add a home aggregation endpoint without measured request or UX evidence;
- do not use `/lab/*` endpoints as core home dependencies;
- defer the optional Recent signals block;
- retain the seven-day stale-sync threshold as a named provisional client constant;
- stop before production navigation, brand-asset, global-token, or authenticated-workflow redesign work.

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

The strong-mint text role is locked by D-014. Validate the remaining values and semantic color behavior in boards, charts, engine evaluations, tables, errors, warnings, success states, and representative authenticated workflows before locking the full palette.

### D-102 — Typography

**Status:** Provisional

Continue with IBM Plex Sans and use a compatible monospaced treatment for analytical numerics.

Validate display hierarchy and dense application readability before locking the complete type scale or adding a font-loading mechanism.

### D-103 — Dark mode scope

**Status:** Provisional

Graphite chrome is required. A complete dark analytical workspace may be implemented later if it does not fit cleanly into the initial shell work.

### D-104 — Initial home recommendations

**Status:** Provisional within the approved implementation

Use existing information and deterministic rules before adding new backend aggregation or recommendation infrastructure.

The first rule set prioritizes setup blockers, analysis backlog, weak/untrained repertoire work, the latest completed analysis, stale account sync, and existing progress destinations. Show at most three recommendations and do not duplicate the dominant Continue action. Tune exact ranking only after representative browser review and real data use.

### D-105 — Initial home action hierarchy

**Status:** Locked for the first implementation

The signed-in home is action-led in this order:

1. one dominant **Continue** action;
2. at most three explained **Recommended next** actions;
3. direct workspace shortcuts;
4. a restrained recent-progress summary.

The optional Recent signals block is deferred from Phase 0D. The page must not open with a large metric grid or generic dashboard cards.

### D-301 — Final Node Branch geometry

**Status:** Provisional

Node Branch geometry v1 is approved as the working geometry used by the Phase 0A proof, the public landing implementation, and the Phase 0B authentication composition.

Production SVG extraction must still verify stroke width, node diameter, spacing, badge radius, monochrome/reversed behavior, and optical balance at 16px, 24px, 32px, and 48px. Focused optical corrections are allowed during that extraction without reopening the symbol concept.

### D-303 — Landing-page copy and composition

**Status:** Provisional

The Phase 0A structure and the Angular landing page merged through PR #78 are the working public-page baseline.

Final wording, example insights, and lower-page composition may be refined after direct browser and product review. Do not restart from a different marketing concept without explicitly revising this decision.

### D-305 — First `/home` data composition

**Status:** Locked for the first implementation

The first `/home` uses existing stable APIs without a new aggregation endpoint:

- `GET /me/accounts` for account presence, default/active selection, and sync state;
- `GET /library/catalog` for course, line, weak, untrained, and attempt statistics;
- `GET /imported-games/facets` for imported-game and analysis-backlog counts;
- `GET /imported-games?sort=endedAtDesc&limit=...` for latest games;
- `GET /me/accounts/:accountId/performance-stats` for period W/D/L, game count, and score context.

Reuse the existing Progress account-selection rule: default progress account, then active account, then first account.

Do not use `/lab/*` endpoints as first-home dependencies. Do not add a home aggregation API unless implementation measures unacceptable request or loading behavior.

The Continue priority is:

1. course with weak sublines;
2. course with untrained active sublines;
3. latest completed analysed game;
4. Study/library fallback.

For weak/untrained courses, rank by the relevant count descending, failed attempts descending, then stable course id. A sync recommendation may appear when `lastSyncAt` is absent or older than seven days; the threshold remains provisional and must stay a named, reviewable client constant.

## Rejected directions

### D-201 — Generic chess-piece logo

**Status:** Rejected

Do not use a generic knight, king, crown, or chessboard as the core brand mark.

### D-202 — Decorative AI-generated logo as final asset

**Status:** Rejected

AI image generation may support mood exploration, but the final mark must be controlled vector geometry.

### D-203 — Train/Study as the signed-in home

**Status:** Rejected

The product now spans games, courses, openings, analysis, training, and progress. Study is too narrow to be the main entry point.

### D-204 — Keep the current horizontal pill navigation

**Status:** Rejected

The number and grouping of destinations no longer fit comfortably in the current desktop navigation pattern.

### D-205 — Page-by-page independent reskin

**Status:** Rejected

Do not redesign every page independently before establishing identity, layouts, tokens, and shared primitives.

### D-206 — Generic marketing imagery as the primary landing visual

**Status:** Rejected

The landing page should use realistic application UI, chess positions, insights, and training recommendations rather than relying on stock chess imagery.

### D-207 — User-facing authentication-vendor language

**Status:** Rejected

Do not expose phrases such as “Use your Clerk session” in normal product copy.

### D-208 — Large early branding scope

**Status:** Rejected

Do not begin with a mascot, custom typeface, bespoke icon set, 3D chess assets, or a large generated illustration library.

### D-209 — Lab endpoints as first-home core dependencies

**Status:** Rejected for the first `/home` slice

Do not depend on training-log, tactical-detection, or other `/lab/*` endpoints for the first signed-in home. Promote a Lab capability deliberately before presenting it as stable core product data.

### D-210 — New home aggregation API before implementation evidence

**Status:** Rejected for the first implementation

Do not add a dashboard/home aggregation endpoint during Phase 0D. The implementation must use existing typed data sources and measure request/loading behavior before introducing a new backend boundary.

## Open decisions

### D-302 — Final production palette

**Status:** Open

Lock the remaining exact colors only after the landing page and representative analytical UI tests. D-014 already locks `#1F7865` for strong mint text on light surfaces.

### D-304 — Exact mobile navigation structure

**Status:** Open

Determine the primary mobile destinations after prototyping Study, Games, and Opening Analysis on small screens. The Phase 0D home implementation intentionally retains the current mobile navigation behavior.

### D-306 — Phase 0B browser-validation disposition

**Status:** Open

PR #79 is integrated and its CI passed, but the repository does not record direct browser validation of `/login` and `/signup` at desktop and mobile widths or interaction validation in configured-Clerk and local-development-auth modes.

Record those checks when performed and decide whether Phase 0B is accepted without revision or requires a focused correction slice. Do not represent this validation as complete merely because the implementation was merged.

### D-308 — Phase 0D Angular home disposition

**Status:** Open

Review the Angular `/home` implementation with empty, partial, and populated data, the deterministic rules, current-shell navigation, default post-auth fallback, explicit `returnUrl`, responsive behavior, keyboard focus, partial-request failure handling, unit tests, and CI.

Decide whether to approve the slice for squash merge into `visual_transformation`, require focused corrections, or revise one of the provisional recommendation rules. Do not begin the production navigation rail or representative workflow redesigns until this disposition is explicit.
