# Phase 1A production brand assets and shared lockups

Date: 2026-07-26

## Goal

Create one production Node Branch source geometry, expose it through controlled static SVG assets and shared Angular components, and replace inconsistent brand renderings without changing routes, navigation behavior, APIs, or product workflows.

## Approved scope

The user asked to pick the next logical transformation task after the signed-in home stage. The selected Phase 1A slice is deliberately narrower than the future application-shell redesign:

- squash-merge the completed, green Phase 0D home PR;
- extract production Node Branch assets;
- add shared mark and live-text lockup components;
- replace duplicated landing, auth, and current-header brand renderings;
- add an SVG favicon and focused tests;
- stop before the production rail, final mobile navigation, global token migration, typography loading, social-preview composition, or workflow redesign.

## Repository evidence

Before implementation, the current repository showed three incompatible identity treatments:

1. the public landing header used an inline five-node SVG;
2. the authentication shell drew a different three-node diagonal mark with positioned CSS elements;
3. the signed-in header displayed product-name text without the selected mark.

The landing floating insight, final CTA, and footer also used `⌁` as a visual substitute. The Phase 0C prototype contained the controlled orthogonal three-node geometry now adopted as the production source.

## Production source geometry

All assets and `BrandMarkComponent` use:

- view box: `0 0 64 64`;
- path: `M18 49V18M18 29H34M34 29V15M34 29V44M34 44H50`;
- stroke width: `5`;
- round caps and joins;
- node centers: `(18,50)`, `(34,14)`, `(51,44)`;
- node radius: `5.5`;
- badge radius: `16`.

The source topology is now shared. Focused optical correction remains possible only when every static asset and the Angular component are updated together.

## Work completed

### Static assets

Added under `apps/web/src/assets/brand/`:

- `branch-mark.svg` — transparent mint geometry;
- `branch-badge.svg` — graphite badge with mint geometry;
- `branch-badge-reversed.svg` — mint badge with graphite geometry;
- `favicon.svg` — standard badge favicon;
- `brand-readme.md` — geometry, usage, accessibility, size, and deferred-work guidance.

`apps/web/src/index.html` now prefers the SVG favicon and keeps the existing ICO as a fallback.

### Shared Angular UI

Added under `apps/web/src/app/shared/ui/brand/`:

- `BrandMarkComponent` with `mark`, `badge`, and `reversed` variants;
- configurable numeric size;
- decorative-by-default accessibility behavior;
- optional accessible label for meaningful standalone use;
- `BrandLockupComponent` with default/inverse tone, mark variant, mark size, and optional mobile collapse;
- live HTML text for `Chess Repertoire` and `TRAINER`.

The components are standalone, OnPush, feature-agnostic, and own no HTTP or workflow behavior.

### Surface integration

The shared components now render in:

- public landing header;
- landing floating insight;
- landing final CTA;
- landing footer;
- authentication desktop story panel;
- authentication mobile workspace;
- current signed-in desktop header;
- current signed-in mobile navigation sheet.

Removed from those surfaces:

- the five-node landing SVG;
- the CSS-drawn auth geometry;
- `⌁` brand substitutes;
- duplicate wordmark markup.

Navigation data, dropdowns, mobile-menu interaction, routes, authentication contracts, and page compositions remain unchanged.

## Tests added

`brand-mark.component.spec.ts` verifies:

- decorative default behavior;
- accessible standalone labeling;
- plain and reversed variants;
- stable three-node geometry.

`brand-lockup.component.spec.ts` verifies:

- live product-name and descriptor text;
- inverse tone;
- selected mark variant propagation.

## Files changed

Runtime and test files:

- `apps/web/src/index.html`
- `apps/web/src/assets/brand/*`
- `apps/web/src/app/shared/ui/brand/*`
- `apps/web/src/app/features/public/landing-page.component.ts`
- `apps/web/src/app/features/public/landing-page.component.css`
- `apps/web/src/app/features/auth/auth-shell.component.ts`
- `apps/web/src/app/features/auth/auth-shell.component.css`
- `apps/web/src/app/core/layout/main-navigation/main-navigation.component.ts`
- `apps/web/src/app/core/layout/main-navigation/main-navigation.component.html`
- `apps/web/src/app/core/layout/main-navigation/main-navigation.component.css`

Transformation documentation:

- `TRANSFORMATION.md`
- `transformation/DECISIONS.md`
- `transformation/STATUS.md`
- `transformation/WORKING_RULES.md`
- `transformation/reports/PHASE_1A_BRAND_ASSETS_IMPLEMENTATION.md`

`transformation/MASTER_PLAN.md` is unchanged because the existing Phase 1 asset/component plan already describes this scope.

## Validation performed

### Repository inspection

Inspected directly from `visual_transformation` and the active branch:

- transformation entry point, master plan, decisions, status, and working rules;
- Angular frontend skill and architecture rules;
- landing brand markup and styles;
- authentication brand markup and styles;
- current signed-in navigation template, component, and styles;
- Phase 0C prototype badge geometry;
- shared-component and test patterns;
- Angular asset configuration and current index metadata.

### Automated validation

GitHub Actions CI run #894 completed successfully on PR #88:

```text
npm run lint
npm run build
npm run check:architecture
npm run db:migrate --workspace=apps/api
npm test
```

Confirmed results:

- dependency installation passed;
- lint passed;
- full monorepo build passed, including Angular template and type compilation;
- architecture guardrails passed;
- database migrations applied successfully to the CI database;
- complete monorepo tests passed, including the new brand component specs.

### Unsuccessful local command

A local read-only clone attempt was made for additional validation:

```text
git clone --branch visual-transformation/phase-1a-brand-assets --single-branch https://github.com/vokerg/chess_repertoir_trainer.git
```

It failed because the available container could not resolve `github.com`. No local repository change occurred. Repository inspection and writes continued through the GitHub connector, and validation was completed by GitHub Actions.

## Browser review required

Review:

- favicon rendering;
- landing header/footer at desktop and mobile widths;
- floating and final-CTA mark scale;
- authentication desktop and mobile lockups;
- signed-in header and mobile-menu lockups;
- standard and reversed contrast;
- transparent mark contrast;
- rasterization at 16px, 24px, 32px, 42px, and 48px;
- keyboard focus around links containing the lockup;
- wordmark wrapping and mobile-collapse behavior.

## Warnings and residual risks

- Browser rendering is not available through the GitHub connector.
- The source geometry is unified, but exact small-size optical acceptance remains open.
- Component colors currently use the approved working graphite/mint values directly; global production-token migration is a separate slice.
- The current signed-in header remains the legacy horizontal shell; this slice adds identity without implementing the future rail.
- The SVG favicon has not been visually checked across browser tab implementations.
- Existing authentication and home browser-validation gaps remain open.
- Social-preview composition is deliberately deferred.
- PR #77 from `visual_transformation` to `main` remains outside scope.

## Review instructions

Review in this order:

1. this report;
2. `apps/web/src/assets/brand/brand-readme.md`;
3. `BrandMarkComponent` and `BrandLockupComponent` plus tests;
4. the four integrated surfaces;
5. PR #88 CI;
6. browser rasterization and contrast at the listed sizes.

## Next gate

Approve, revise, or reject the Phase 1A production brand source and shared lockup implementation.

Do not merge PR #88 without explicit approval. If approved, squash merge into `visual_transformation`. The production navigation rail, final mobile navigation, global-token/typography work, public social-preview composition, and representative workflow redesigns remain separate future checkpoints.
