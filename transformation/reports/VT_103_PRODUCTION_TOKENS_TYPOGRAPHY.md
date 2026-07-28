# VT-103 Production Tokens and Typography

Date: 2026-07-28

Issue: #125

Branch: `visual-transformation/vt-103-production-tokens-typography`

Pull request: PR #158

Target: `main`

Disposition: browser evidence received; user approved completion and squash merge after final CI

## Purpose

Promote the accepted graphite/mint direction and VT-102 Home palette evidence into a stable production token and typography contract without silently redesigning every legacy route.

The task establishes the foundation required by Games, Study, Opening Analysis, and later rollout work. It deliberately separates the production system from the amber-era compatibility layer so those workflow migrations remain reviewable and behavior-preserving.

## Repository evidence before the change

The existing global layer in `apps/web/src/styles.css` provided short token names such as `--accent`, `--surface`, `--border`, and `--text`. The layer was still amber-first:

- `--accent` was `#B77927` and `--accent-strong` was `#8F4F0D`;
- global shell focus rings and input focus were amber;
- shell primary actions used an amber gradient;
- the body used a cool-grey gradient;
- shared page headers, cards, and panels used translucent white surfaces and relatively prominent shadows;
- the declared IBM Plex Sans family had no runtime font-loading mechanism.

Repository search also showed that Games, Study/library, workbench UI, and many other feature-local styles still consume the legacy short tokens. Reassigning those names globally would have transformed those workflows without their owning acceptance criteria or browser review.

VT-102 provided accepted route-local evidence for a green-grey canvas, strong/muted/quiet surfaces, graphite emphasis, mint interaction, borders, and restrained elevation.

## Implementation

### Production namespace and loading order

Added `apps/web/src/design-system.css` and loaded it in Angular build and test configurations immediately after `apps/web/src/styles.css`.

The production layer owns `--ui-*` roles for:

- typography;
- canvas and surfaces;
- graphite chrome and text;
- borders, radii, and elevation;
- mint interaction and focus;
- success, warning, danger, and information states.

`styles.css` remains the explicit legacy compatibility layer. Its short token names keep their current meanings until the corresponding feature task migrates every known consumer.

### Production values

The production contract promotes:

- canvas `#E7EEEA` and soft canvas `#EEF4F1`;
- strong surface `#FFFFFF`;
- muted surface `#F2F6F4`;
- quiet surface `#EAF1ED`;
- border `#C4D1CB` and strong border `#AEBFB7`;
- graphite `#172321`, `#22312E`, and `#2A3D38`;
- signal mint `#47B89C`;
- strong mint `#1F7865`;
- mint subtle `#DFF3ED`.

Semantic status values remain independent:

- success `#256B45`;
- warning `#8A4B0F`;
- danger `#A7352A`;
- information `#2B6480`.

### Typography

Production uses the native UI stack:

```text
system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
```

Analytical numerics and notation use:

```text
ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace
```

No font files, font package, or remote font request are added. IBM Plex Sans remains a prototype/design reference rather than an undeclared runtime dependency.

### Narrow production adoption

The production layer now owns:

- signed-in/global body canvas and default text;
- form controls and focus rings;
- shell primary, secondary, and destructive buttons;
- global page-header and common-card roles;
- compact actions, pills, common links, and common status/error roles;
- shared `app-panel` surfaces;
- shared shell stats, actions, and toggles;
- a 1920px signed-in shell cap and 1560px Home cap for wide displays, while preserving copy-level max widths and existing mobile behavior.

This is the smallest shared foundation that can be consumed by Phase 2 without implementing the Phase 2 page redesigns early.

### Documentation and architecture

Added `docs/frontend/design-tokens.md` as the canonical frontend contract and updated:

- Angular architecture guidance;
- Angular frontend agent skill;
- Angular migration ledger;
- transformation entry point;
- transformation master plan;
- transformation decision log;
- transformation status.

## Compatibility boundary

The following remain intentionally unmigrated until their owning issues:

- Games — issue #127 / VT-201;
- Study — issue #128 / VT-202;
- Opening Analysis — issue #129 / VT-203;
- proven shared extraction — issue #130 / VT-204;
- remaining pages and Labs — issue #132 / VT-301.

Existing feature-local amber styling is accepted migration debt, not an approved direction for new transformed UI.

## Behavior preserved

No changes are made to:

- routes or route ownership;
- authentication or return URLs;
- page/component templates or state;
- filters, pagination, selections, or job behavior;
- board, engine, analysis, training, or course behavior;
- HTTP contracts, APIs, schemas, database, migrations, or backend behavior;
- dependencies or font assets;
- dark-mode behavior.

## Automated validation

Implementation-head CI #1240 passed the complete repository workflow before the branch refresh.

The branch was refreshed onto the then-current `main` head, preserving independently integrated work. Selector-corrected CI #1245, documentation-head CI #1253, and subsequent branch-refresh CI #1257 passed:

- dependency installation;
- lint;
- the full repository build;
- opening classification audit;
- architecture guardrails;
- database migrations;
- imported-game opening classification audit;
- the complete test suite.

The wide-screen correction and final report update require one final CI pass before merge.

No local build was run because direct repository checkout from the execution environment could not resolve `github.com`; the GitHub connector remained available for repository inspection and changes.

Static contrast calculations for the principal text/background pairs produced:

- primary text on canvas: `13.72:1`;
- muted text on white: `5.11:1`;
- strong mint on white: `5.34:1`;
- action ink on signal mint: `7.54:1`;
- success on success-soft: `5.55:1`;
- warning on warning-soft: `5.74:1`;
- danger on danger-soft: `5.42:1`;
- information on information-soft: `5.50:1`.

These calculations support the selected pairs but do not replace direct browser, focus, zoom, and state review.

## Browser review

The user supplied a 2048×1151 Home screenshot and reviewed the implemented visual direction.

Observed evidence:

- the approved VT-102 palette is present and visually coherent;
- the Home-local canvas, white/muted/quiet surface hierarchy, graphite emphasis, and mint interaction match the accepted values;
- the application under-utilized the wide viewport because `.page-shell` remained capped at 1600px and `.home-page` at 1240px;
- the outer legacy body gutters confirmed that the screenshot was not yet showing the unmerged global token layer.

The branch now raises the signed-in shell cap to 1920px and Home cap to 1560px without widening constrained copy blocks or changing mobile breakpoints. The user instructed the task to make the necessary correction, merge the unmerged intended work, and proceed.

This is the explicit VT-103 review disposition and merge approval. It does not claim exhaustive validation of every legacy route or state. Issue #126 continues to own the comprehensive public, authentication, Home-state, brand, navigation, Clerk, responsive, keyboard, focus, zoom, and reduced-motion matrix.

## Residual risks

- global overrides may reveal feature-specific assumptions that only broader browser review can expose;
- some legacy components still use short amber tokens and hard-coded colours by design;
- the native system font will vary optically by operating system, although it avoids licensing, privacy, network, and offline risks;
- public and auth styles retain some feature-local copies of the accepted values and may be migrated to shared tokens later only where the ownership boundary remains clear;
- issue #126 still owns comprehensive responsive, Clerk, motion, rasterization, and shell validation.

## Completion conditions

VT-103 is complete after:

- final CI passes on the width-corrected documentation head;
- PR #158 is squash-merged into `main`;
- issue #125, issue #122, status, and dependent issue readiness are reconciled.
