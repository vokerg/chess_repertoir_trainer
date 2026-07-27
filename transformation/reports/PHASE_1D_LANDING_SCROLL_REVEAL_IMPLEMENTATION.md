# Phase 1D Landing Scroll Reveal Implementation

Date: 2026-07-27

Branch: `visual-transformation/phase-1d-landing-scroll-reveal`

Target: `visual_transformation`

## Purpose

Add restrained one-time scroll-reveal motion to selected lower-page compositions on the public `/` landing page without changing first-screen content, product copy, layout, routing, dependencies, or signed-in application behavior.

The slice implements the follow-up recorded during Phase 1C browser review. It is deliberately limited to the public landing feature and does not establish a product-wide animation system.

## Work completed

- verified that the Phase 1C reconciliation was squash-merged through PR #118;
- verified successful PR #118 CI run #1008 and integration CI run #1018;
- created `visual-transformation/phase-1d-landing-scroll-reveal` from the updated `visual_transformation` branch;
- added a feature-local standalone `RevealOnScrollDirective`;
- used native `IntersectionObserver` with a 12% threshold and a small lower viewport margin;
- added one-time opacity and 18px vertical translation motion;
- used a 420ms restrained easing curve and capped stagger delays at 240ms;
- left content fully visible when `IntersectionObserver` is unavailable;
- left content fully visible when reduced motion is requested before initialization;
- added a media-query change listener so pending content becomes visible immediately without transition when reduced motion is enabled later;
- unobserved and disconnected each element after reveal;
- applied the directive only to approved lower-page landing compositions;
- added focused Jasmine tests for reveal, unsupported-observer fallback, initial reduced motion, and dynamic reduced motion;
- updated the transformation entry point, decision log, status, and working rules;
- kept `MASTER_PLAN.md` unchanged because program phases, architecture, scope, and target outcomes did not change.

## Design and implementation rationale

### Feature-local ownership

The repository contained no existing `IntersectionObserver` or reveal directive to reuse. The behavior belongs only to the public landing page at this checkpoint, so it is implemented under:

```text
apps/web/src/app/features/public/
```

It is not promoted to `shared`, injected through a global service, or exposed as a general motion framework. Reuse should be decided only after another real surface demonstrates the same contract.

### Visible-by-default progressive enhancement

The directive adds hidden motion styles only when all of these are true:

- execution is in a browser;
- `IntersectionObserver` exists;
- reduced motion is not requested.

Unsupported environments, server rendering, and reduced-motion users receive normal visible content with no dependency on JavaScript observation. The semantic DOM and layout are present from initial render in every path.

### Restrained motion contract

The reveal is intentionally limited to:

- opacity from `0` to `1`;
- translation from `18px` to `0`;
- 420ms duration;
- a restrained ease-out curve;
- stagger delays capped at 240ms;
- one reveal per element.

There is no scale, rotation, blur, parallax, looping, scroll-linked progress, or continuous animation.

### First-screen stability

The header, hero copy, hero actions, product-stage composition, and hero proof remain unchanged and unanimated. This avoids delayed first content, visual instability, or a marketing splash effect before users can understand the product.

### Selected composition boundaries

Reveal behavior is applied to:

- workflow introduction;
- five workflow steps with 50ms increments;
- capability section introduction;
- each capability copy block;
- each capability product demonstration with a 90ms paired delay;
- progress copy;
- progress dashboard with a 90ms paired delay;
- final call to action.

The footer remains static.

### Reduced-motion behavior

If reduced motion is active at initialization, the directive adds no hidden styles and creates no observer.

If reduced motion becomes active while an element is pending, the directive:

- disables transition;
- sets the element visible at its final position;
- disconnects its observer;
- removes the media-query listener.

## Files changed

Runtime and tests:

- `apps/web/src/app/features/public/landing-page.component.ts`
- `apps/web/src/app/features/public/reveal-on-scroll.directive.ts`
- `apps/web/src/app/features/public/reveal-on-scroll.directive.spec.ts`

Transformation records:

- `TRANSFORMATION.md`
- `transformation/DECISIONS.md`
- `transformation/STATUS.md`
- `transformation/WORKING_RULES.md`
- `transformation/reports/PHASE_1D_LANDING_SCROLL_REVEAL_IMPLEMENTATION.md`

No CSS, route, package, lockfile, API, contract, schema, database, job, mobile, or backend file is changed.

## Behavior deliberately preserved

- public route `/`;
- landing-page header and navigation anchors;
- all landing copy and calls to action;
- hero and first-screen product composition;
- page section order and layout;
- responsive breakpoints and CSS;
- authentication routes and return-URL behavior;
- signed-in shell and navigation rail;
- all feature workflows;
- APIs, contracts, schemas, database models, jobs, and dependencies.

## Explicit exclusions

This slice does not include:

- hero or header animation;
- footer animation;
- global route transitions;
- a shared or global animation service;
- Angular animation APIs;
- a third-party animation dependency;
- scroll-linked or continuous animation;
- global token or typography migration;
- landing copy or layout redesign;
- public metadata or social-preview work;
- bottom navigation;
- representative Games, Study, or Opening Analysis modernization;
- backend behavior.

## Validation performed

### Repository inspection

Performed through the GitHub connector:

- read the updated transformation entry point and governing records;
- read `AGENTS.md`, Angular frontend skill, Angular architecture, patterns, migration ledger, and web instructions;
- inspected the Phase 1C browser-feedback report;
- inspected the complete current landing component and styles;
- inspected the web package scripts and Angular/Jasmine test conventions;
- searched for an existing `IntersectionObserver` or reveal implementation and found none;
- verified the preceding reconciliation merge and CI state;
- inspected the final branch diff and changed-file scope before opening the pull request.

### Focused test coverage added

`reveal-on-scroll.directive.spec.ts` covers:

- pending styles and observation setup;
- configured threshold and viewport margin;
- reveal after an intersecting entry;
- one-time unobserve and disconnect cleanup;
- visible fallback when `IntersectionObserver` is unavailable;
- visible fallback when reduced motion is active initially;
- immediate transition-free reveal when reduced motion becomes active while pending.

### Automated validation

Pull-request CI is the authoritative executable validation for this branch. Expected checks:

```text
npm run lint
npm run build
npm run check:architecture
npm test
```

The repository CI also applies database migrations as part of the complete workflow.

Do not represent automated validation as complete until the final reviewed branch head passes.

## Commands skipped and why

A local clone was attempted:

```text
git clone --branch visual-transformation/phase-1d-landing-scroll-reveal --single-branch https://github.com/vokerg/chess_repertoir_trainer.git
```

It failed with:

```text
fatal: unable to access 'https://github.com/vokerg/chess_repertoir_trainer.git/': Could not resolve host: github.com
```

The following commands therefore could not be run locally:

```text
npm run build:web
npm run test --workspace=apps/web
npm run lint
npm run check:architecture
```

The GitHub connector remained available for branch, file, commit, comparison, pull-request, and workflow operations.

## Warnings and residual risks

- direct browser review is still required to judge whether the 420ms duration and 18px translation feel restrained;
- the five-step desktop stagger may require a smaller optical delay after real review;
- stacked mobile workflow steps may enter individually as the user scrolls rather than as one group;
- inline transition styles are owned by the feature-local directive and should not be reused globally without a separate architecture decision;
- focus navigation into a pending below-fold link should be checked in a real browser, although the element remains in layout and observation should reveal it when scrolled into view;
- unsupported-observer fallback is covered by unit tests but may be difficult to reproduce manually in a normal current browser;
- direct browser testing of dynamic reduced-motion preference changes remains required;
- all previously recorded authentication, home, brand, navigation, Clerk, and responsive residual checks remain open.

## Open decisions

- whether Phase 1D is accepted after automated and direct browser review;
- whether duration, translation, threshold, root margin, or stagger needs a focused optical adjustment;
- whether later surfaces should reuse this directive or define their own feature-local motion;
- whether broader motion belongs in Phase 3 after representative workflows are modernized;
- all existing palette, typography, mobile-navigation, rail optical, and public-metadata decisions remain unresolved.

## Review instructions

1. Confirm the changed runtime scope is limited to the public landing component and feature-local directive/spec.
2. Confirm the hero, header, product-stage composition, and footer have no reveal binding.
3. Review workflow introduction and step stagger at desktop and mobile widths.
4. Review each capability pair and confirm copy/demo timing feels related but not theatrical.
5. Review progress and final-call-to-action timing.
6. Enable `prefers-reduced-motion: reduce` before load and confirm all content is immediately visible.
7. Toggle reduced motion while lower content is pending and confirm it becomes visible without animation.
8. Confirm no layout shift or delayed semantic content.
9. Confirm pull-request lint, build, architecture, migrations, and tests pass.
10. Confirm transformation records match the implemented boundary and retain residual risks.

## Reproduction instructions

From the repository root on the branch:

```text
npm install
npm run dev --workspace=apps/web
```

Open `/` and review:

- normal motion while scrolling from the hero through the final call to action;
- desktop width above 980px;
- single-column layout below 980px;
- compact width below 640px;
- browser reduced-motion emulation before reload;
- reduced-motion setting changed while an unrevealed lower section remains below the viewport.

For focused automated validation:

```text
npm run test --workspace=apps/web -- --include='**/reveal-on-scroll.directive.spec.ts'
npm run build:web
npm run lint
npm run check:architecture
```

If the test runner does not accept the focused `--include` forwarding in the local environment, run the complete web test command instead and record that difference.

## Stop condition

Do not merge the Phase 1D pull request without explicit approval. When approved, squash merge it into `visual_transformation`.

Do not add hero motion, a global animation system, dependencies, tokens, typography, bottom navigation, route-page redesign, representative workflow modernization, or backend changes to this branch.

## Files inspected

- `TRANSFORMATION.md`
- `AGENTS.md`
- `.agents/skills/angular-frontend/SKILL.md`
- `.github/instructions/web.instructions.md`
- `docs/frontend/angular-architecture.md`
- `docs/frontend/angular-patterns.md`
- `docs/frontend/angular-migration.md`
- `docs/frontend/responsive-layout.md`
- `docs/skills/frontend-feature-module.md`
- `transformation/MASTER_PLAN.md`
- `transformation/DECISIONS.md`
- `transformation/STATUS.md`
- `transformation/WORKING_RULES.md`
- `transformation/reports/PHASE_1C_BROWSER_REVIEW_FEEDBACK.md`
- `transformation/reports/PHASE_1C_INTEGRATION_RECONCILIATION.md`
- `apps/web/package.json`
- `apps/web/src/app/features/public/landing-page.component.ts`
- `apps/web/src/app/features/public/landing-page.component.css`
- `apps/web/src/app/shared/ui/brand/brand-mark.component.spec.ts`
- PR #118 merge and workflow state
