# Visual Transformation Decisions

Last updated: 2026-07-25

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

## Provisional decisions

### D-101 — Palette values

**Status:** Provisional

Working values:

- Graphite: `#172321`
- Secondary graphite: `#22312E`
- Mint: `#47B89C`
- Strong mint: `#23836D`
- Mint subtle: `#DFF3ED`
- Workspace: `#EEF3F0`
- Surface: `#FFFFFF`
- Primary text: `#172321`
- Secondary text: `#63716D`
- Border: `#CBD7D2`

Validate contrast and behavior in the landing page, boards, charts, engine evaluations, tables, errors, warnings, and success states before locking.

### D-102 — Typography

**Status:** Provisional

Continue with IBM Plex Sans and use a compatible monospaced treatment for analytical numerics.

Validate display hierarchy and dense application readability before locking the complete type scale.

### D-103 — Dark mode scope

**Status:** Provisional

Graphite chrome is required. A complete dark analytical workspace may be implemented later if it does not fit cleanly into the initial shell work.

### D-104 — Initial home recommendations

**Status:** Provisional

Use existing information and deterministic rules before adding new backend aggregation or recommendation infrastructure.

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

## Open decisions

### D-301 — Final Node Branch geometry

**Status:** Open

Finalize stroke width, node diameter, spacing, badge radius, and optical balance after small-size testing.

### D-302 — Final production palette

**Status:** Open

Lock the exact colors only after the high-fidelity landing page and representative analytical UI tests.

### D-303 — Final landing-page copy and composition

**Status:** Open

The product promise and workflow are agreed; final wording, section order, and example insights still require visual review.

### D-304 — Exact mobile navigation structure

**Status:** Open

Determine the primary mobile destinations after prototyping Study, Games, and Opening Analysis on small screens.

### D-305 — First `/home` data composition

**Status:** Open

Inspect existing frontend services and APIs to determine which meaningful home metrics and actions can be implemented without backend changes.
