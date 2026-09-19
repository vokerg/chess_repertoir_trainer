# Visual Transformation Master Plan

Last updated: 2026-07-28

## 1. Purpose

The application is functionally strong, but its visual presentation still feels like an internal tool assembled from similar white cards, borders, shadows, and utility controls. This program will turn it into a coherent modern product without weakening the existing workflows or replacing working architecture unnecessarily.

The transformation is broader than a reskin. It covers:

- product identity;
- public presentation;
- authentication experience;
- signed-in entry point;
- navigation and application shell;
- shared visual primitives;
- representative workflow redesigns;
- responsive behavior;
- long-term visual consistency.

The target is a product that makes complex chess information clear enough to act on.

## 2. Product position

Working product promise:

> Turn your games into a repertoire you actually train.

The product loop should be visible throughout the public site and signed-in experience:

1. Import games.
2. Find recurring patterns, weaknesses, and missed opportunities.
3. Improve or extend a practical repertoire.
4. Train the positions that matter.
5. Measure progress and repeat.

The product is not merely a repertoire editor and not merely a game-analysis tool. Its identity should connect games, analysis, repertoire construction, targeted training, and progress.

## 3. Locked identity direction

### 3.1 Character

The chosen direction is **analytical**:

- precise;
- calm;
- intelligent;
- structured;
- product-led rather than decorative;
- serious without feeling like enterprise software.

### 3.2 Visual language

The intended composition is:

- dark graphite product chrome;
- clean, mostly light analytical workspaces;
- mint as the primary signal and action color;
- restrained borders and shadows;
- high-contrast typography;
- dense information presented with strong hierarchy;
- real boards, lines, charts, evaluations, and application data as the main visual material.

The system should not copy Maia's dark-red identity or Take Take Take's purple/playful identity. Those products are references for confidence, hierarchy, and storytelling, not templates to reproduce.

### 3.3 Symbol

The locked concept is the geometric **Node Branch** mark.

Meaning:

- the source node represents played games or a known position;
- the split represents repertoire continuations and candidate decisions;
- endpoint nodes represent selected insights or training targets;
- the geometry connects analysis, repertoire structure, and action.

The mark should remain simple enough for a 16px favicon and strong enough for a navigation rail, landing-page lockup, social preview, and monochrome use.

Avoid:

- a generic knight silhouette;
- crowns or generic chessboard logos;
- a mascot;
- detailed AI-generated raster logos;
- embedded text in the symbol;
- ornamental complexity that disappears at small sizes.

### 3.4 Name treatment

The public product name remains **Chess Repertoire Trainer** unless explicitly revisited.

Preferred visual hierarchy:

- primary wordmark: `Chess Repertoire`
- secondary descriptor: `TRAINER`

The wordmark should initially be live HTML text rather than text converted into SVG paths. This keeps it accessible, responsive, and easy to revise.

### 3.5 Production palette and token contract

VT-103 promotes the calibrated graphite/mint direction to a namespaced production contract. The canonical roles, values, loading order, compatibility boundary, and accessibility rules live in [`docs/frontend/design-tokens.md`](../docs/frontend/design-tokens.md).

Core production values:

- Graphite chrome: `#172321`
- Secondary graphite: `#22312E`
- Raised graphite: `#2A3D38`
- Signal mint: `#47B89C`
- Strong mint: `#1F7865`
- Mint subtle: `#DFF3ED`
- Workspace canvas: `#E7EEEA`
- Soft canvas: `#EEF4F1`
- Surface: `#FFFFFF`
- Muted surface: `#F2F6F4`
- Quiet surface: `#EAF1ED`
- Primary text: `#172321`
- Secondary text: `#63716D`
- Subtle border: `#C4D1CB`
- Strong border: `#AEBFB7`

The production system uses distinct semantic roles rather than overloading mint:

- success: `#256B45`;
- warning: `#8A4B0F`;
- danger: `#A7352A`;
- information: `#2B6480`.

`apps/web/src/design-system.css` owns the production `--ui-*` namespace and loads after `styles.css`. The existing short amber-era token names remain an explicit compatibility layer for unmigrated workflows; they must not be silently redefined or globally search-and-replaced. Games, Study, Opening Analysis, and later pages migrate deliberately in their owning tasks.

### 3.6 Typography

The production runtime uses the native UI stack:

- `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` for product and interface typography;
- `ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace` for engine evaluations, percentages, ratings, move counts, coordinates, hashes, PGN, and FEN;
- large, tight display headings on the public site;
- compact, readable typography in dense application workflows;
- limited use of uppercase eyebrow labels.

IBM Plex Sans remains the visual reference used by the transformation prototypes, not a runtime dependency. Do not bundle font files or introduce a remote font request. A future font-loading change requires a separate reviewed decision covering licensing, privacy, performance, offline behavior, and fallback behavior.

## 4. Three distinct product experiences

### 4.1 Public website

The root route `/` should become a genuine public landing page rather than immediately redirecting into an authenticated workflow.

Purpose:

- explain the complete product loop;
- demonstrate the application through realistic UI compositions;
- create confidence and identity before authentication;
- lead clearly to sign-up or sign-in.

Hero direction:

- headline centered on turning real games into trainable repertoire;
- one concise supporting paragraph;
- primary CTA: start building/create account;
- secondary CTA: see the workflow/sign in;
- large product composition using realistic boards, opening insights, continuation gaps, training recommendations, and progress data.

Core sections:

1. **Understand your games** — review, engine data, tags, missed shots, blunders, performance.
2. **Build a practical repertoire** — courses, opening explorer, course review, common continuations, gaps.
3. **Train what matters** — weak lines, missed shots, safer decisions, targeted sessions, progress.

The landing page should demonstrate the product instead of relying on generic chess photography or large decorative illustrations.

### 4.2 Authentication

Login and sign-up must use a dedicated authentication layout rather than the normal application shell.

Direction:

- minimal wordmark;
- no authenticated navigation;
- two-column desktop composition;
- graphite product/story panel;
- focused authentication form panel;
- compact mobile composition;
- Clerk themed to match the application;
- user-facing copy that discusses access and progress, not the authentication vendor.

Avoid phrases such as “Use your Clerk session.”

Login and sign-up should share an authentication shell rather than duplicate the same page structure.

### 4.3 Signed-in application

The signed-in default should become `/home`.

The existing Study/library page remains a focused training-selection workflow; it is not the correct front door for the broader product.

The home page should answer:

> What is happening in my chess data, and what should I do next?

Initial home structure:

- **Continue** — one dominant recent or recommended workflow;
- **Recommended next** — a small set of deterministic actions based on existing concepts/data;
- **Workspace shortcuts** — Study, Games, Openings, Courses, Analysis, Progress;
- **Recent progress** — a restrained summary rather than a wall of charts.

The first implementation should reuse available information and simple deterministic conditions. Do not create a large recommendation engine or speculative aggregation API before the UI requirements are proven.

## 5. Application shell and navigation

### 5.1 Desktop

The current crowded floating horizontal pill navigation should be replaced by a compact, collapsible left navigation rail.

Desired structure:

- persistent left rail for primary product areas;
- expanded mode for labels and groups;
- collapsed mode for board-heavy or analysis-heavy pages;
- contextual top area for page-specific title, actions, filters, or state;
- wide content canvas;
- current grouped navigation model reused rather than duplicated.

Primary product areas remain aligned with the existing application concepts:

- Home;
- Study;
- Courses;
- Games;
- Openings;
- Progress;
- Tools;
- Settings.

### 5.2 Mobile

Direction:

- prioritize a small set of primary destinations;
- preserve access to all existing grouped navigation;
- use a mobile sheet or “More” destination for secondary areas;
- avoid squeezing desktop navigation into a small header;
- keep board and training workflows dominant on small screens.

The precise bottom-navigation structure remains open until representative mobile workflows are prototyped.

## 6. Surface and component principles

The current product relies heavily on translucent white panels, rounded cards, borders, and shadows. The transformation should establish a clearer hierarchy:

- **Canvas:** flat or restrained tonal page background.
- **Section:** often no visible container.
- **Panel:** strong or muted surface with a hairline border.
- **Interactive card:** clear affordance and hover/focus state.
- **Overlay:** the primary place for strong shadow, blur, or elevated treatment.

Rules:

- not every section should be a detachable card;
- reduce nested card-on-card compositions;
- use shadows selectively;
- use radius intentionally rather than uniformly;
- preserve accessibility focus states;
- use shared production tokens and primitives;
- avoid isolated feature-specific visual systems.

The repository's shared `app-page-header` and `app-panel` remain the starting primitives. VT-103 moves these proven primitives to the production token contract. Feature tasks must consume or evolve them rather than bypassing the shared system with ad hoc shells.

## 7. Route-layout architecture target

Target conceptual structure:

```text
AppComponent
└── RouterOutlet
    ├── PublicLayoutComponent
    │   └── LandingPageComponent
    ├── AuthLayoutComponent
    │   ├── LoginPageComponent
    │   └── SignupPageComponent
    └── AppLayoutComponent
        ├── HomePageComponent
        ├── LibraryBrowserPageComponent
        ├── GamesExplorerPageComponent
        └── existing authenticated routes
```

Responsibilities:

- `AppComponent` should become a minimal routing host plus truly global overlays.
- `AppLayoutComponent` should own authenticated navigation, authenticated content framing, and authenticated job/status UI.
- `PublicLayoutComponent` should own public header/footer and public content framing.
- `AuthLayoutComponent` should own the focused authentication composition.

Existing authenticated URLs and workflows must remain stable unless a change is explicitly approved.

## 8. Identity asset plan

The identity should be created as controlled vector geometry, not generated raster artwork.

Expected asset area:

```text
apps/web/src/assets/brand/
  branch-mark.svg
  branch-badge.svg
  branch-badge-reversed.svg
  social-preview.svg or social-preview.png
  brand-readme.md
```

Expected shared UI:

```text
apps/web/src/app/shared/ui/brand/
  brand-mark.component.*
  brand-lockup.component.*
```

Requirements:

- SVG symbol with a simple view box and no embedded fonts;
- clear at 16px, 24px, 32px, and 48px;
- normal, reversed, and monochrome use;
- `currentColor` where practical;
- live HTML wordmark text;
- accessible decorative/meaningful usage;
- no new asset pipeline or design dependency.

## 9. Delivery phases

### Phase 0 — identity and visual proof

Goal: prove the selected direction before broad implementation.

Deliverables:

- finalized Node Branch geometry proof;
- small-size and light/dark tests;
- high-fidelity landing-page visualization;
- final provisional-to-production token selection;
- approved typography and wordmark proportions;
- initial responsive behavior.

Exit condition:

- the identity and one complete page feel coherent enough to become production source material.

### Phase 1 — product shell and entry points

Deliverables:

- public `/` landing page;
- public, auth, and authenticated route layouts;
- dedicated auth shell;
- signed-in `/home` page;
- post-login default to `/home` while preserving explicit return URLs;
- production global tokens and typography contract;
- desktop navigation rail;
- shared brand components and assets;
- favicon and public metadata;
- evolved shared page header/panel/button treatments.

Exit condition:

- the product has a coherent public face, authentication experience, signed-in home, application shell, and stable production token foundation.

### Phase 2 — representative workflow modernization

Migrate representative pages first:

1. Games — filters, tables, lists, detail/review affordances.
2. Study — selection hierarchy, training basket, responsive launcher.
3. Opening Analysis — board/workbench, data widgets, toggles, analysis density.

These pages establish reusable patterns for most remaining workflows and deliberately migrate feature-local legacy tokens to the production `--ui-*` contract.

Exit condition:

- the visual system has proven itself across data exploration, training selection, and board analysis.

### Phase 3 — systematic rollout and polish

Potential work:

- remaining pages and labs;
- empty states;
- onboarding;
- richer home recommendations;
- appearance preferences;
- dark/light workspace refinement;
- social previews and marketing screenshots;
- motion and transitions;
- optional achievements or branded progress elements;
- mobile navigation refinement.

Phase 3 must build on the validated system rather than introduce a new identity.

## 10. Process

Use this sequence:

```text
A. Final Node Branch SVG proof
                ↓
B. High-fidelity landing page
                ↓
C. Final colors, typography, and tokens
                ↓
D. Auth page and signed-in home prototypes
                ↓
E. Angular implementation in reviewed slices
                ↓
F. Validation, screenshots, documentation, and PR review
```

For each meaningful slice:

1. Inspect the owning implementation and closest existing patterns.
2. Confirm the relevant decision in `DECISIONS.md`.
3. Keep the change narrow enough to review.
4. Update `STATUS.md` and any changed plan sections.
5. Run the narrowest relevant validation.
6. Record warnings, skipped checks, and residual risks.

## 11. Non-goals and constraints

Do not introduce without explicit justification:

- a UI framework replacement;
- a global state library;
- a custom icon library;
- a custom typeface, shared font files, or remote font loading;
- a CMS for static landing content;
- a large recommendation engine;
- new backend APIs before proven UI requirements;
- a mascot;
- 3D chess illustration systems;
- page-by-page one-off redesigns;
- broad dependency additions;
- duplicated navigation models;
- direct transformation commits to `main`.

## 12. Success criteria

The program is successful when:

- the application is recognizable from its symbol, wordmark, palette, and interface behavior;
- public, auth, and signed-in experiences are clearly distinct but related;
- users can understand the game-to-training product loop quickly;
- the home page provides a meaningful next action;
- dense chess data remains readable and efficient;
- board-heavy screens gain space rather than losing it to chrome;
- shared primitives make later pages faster to modernize;
- mobile workflows remain usable;
- accessibility and existing behavior are preserved;
- the result feels like one product rather than a collection of capable tools.

## 13. Open questions

These remain intentionally unresolved:

- exact Node Branch optical proportions after direct small-size browser review;
- final wordmark spacing and casing;
- exact public navigation labels;
- exact mobile primary navigation destinations;
- whether a full dark application workspace is included later or deferred;
- final landing-page copy and screenshot composition;
- final residual browser-validation disposition for public, auth, Home, brand, navigation, Clerk, motion, job-panel, and representative responsive states.

The production palette and typography questions are resolved by D-024, D-025, and `docs/frontend/design-tokens.md`. Do not treat the remaining questions as locked until recorded in `DECISIONS.md`.