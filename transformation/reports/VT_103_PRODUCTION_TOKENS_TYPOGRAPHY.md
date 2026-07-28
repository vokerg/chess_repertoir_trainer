# VT-103 Production Tokens and Typography

Date: 2026-07-28

Issue: #125

Branch: `visual-transformation/vt-103-production-tokens-typography`

Pull request: draft PR #158

Target: `main`

Disposition: implementation and review in progress

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
- shared shell stats, actions, and toggles.

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

GitHub Actions CI runs the complete repository workflow for the draft PR. The current documentation head is under CI review and the final result must be recorded before the PR is marked ready.

No local build was run because direct repository checkout from the execution environment could not resolve `github.com`; the GitHub connector remained available for repository inspection and changes.

## Browser review

Direct browser comparison has not been performed in this session. Before approval, review at least:

- signed-in Home with expanded and collapsed navigation;
- representative legacy Games, Study, and Opening Analysis routes to confirm the compatibility boundary;
- shared page headers, panels, actions, inputs, destructive controls, and visible keyboard focus;
- public and authentication pages for consistency;
- desktop and mobile widths;
- reduced-motion behavior.

Issue #126 continues to own the comprehensive Phase 0–1 browser matrix. VT-103 must not mark unavailable or unobserved states as complete.

## Residual risks

- global overrides may reveal feature-specific assumptions that only direct browser review can expose;
- some legacy components still use short amber tokens and hard-coded colours by design;
- the native system font will vary optically by operating system, although it avoids licensing, privacy, network, and offline risks;
- public and auth styles retain some feature-local copies of the accepted values and may be migrated to shared tokens later only where the ownership boundary remains clear;
- issue #126 still owns comprehensive responsive, Clerk, motion, rasterization, and shell validation.

## Completion conditions

VT-103 is complete only after:

- final CI succeeds;
- the branch is current with `main`;
- the PR diff and compatibility boundary are reviewed;
- browser evidence or explicit residual limitations are recorded;
- PR #158 receives explicit approval and is squash-merged into `main`;
- issue #125, issue #122, status, and dependent issue readiness are reconciled.