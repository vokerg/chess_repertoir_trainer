# Phase 1D Landing Scroll Reveal Implementation

Date: 2026-07-27

Branch: `visual-transformation/phase-1d-landing-scroll-reveal`

Target: `visual_transformation`

Pull request: #120

## Purpose

Add restrained one-time scroll-reveal motion to selected lower-page compositions on the public `/` landing page without changing first-screen content, product copy, layout, routing, dependencies, or signed-in application behavior.

This implements the follow-up recorded during Phase 1C browser review. The behavior remains feature-local and does not establish a product-wide animation system.

## Work completed

- verified and squash-merged the Phase 1C reconciliation through PR #118;
- created the Phase 1D branch from the updated `visual_transformation` head;
- added `landing-scroll-reveal.ts`, a small framework-independent helper owned by the public landing feature;
- initialized the helper from `LandingPageComponent` with `AfterViewInit` and cleaned it up with `OnDestroy`;
- used native `IntersectionObserver` with a 12% threshold and a small lower viewport margin;
- marked approved lower-page compositions with static `data-scroll-reveal` attributes;
- used optional `data-reveal-delay` attributes for short paired and workflow-step delays;
- added one-time opacity and 18px vertical translation motion with a 420ms restrained easing curve;
- capped delays at 240ms;
- kept content visible when `IntersectionObserver` or `matchMedia` is unavailable;
- kept content visible when reduced motion is requested before setup;
- revealed pending content immediately without transition when reduced motion becomes active later;
- disconnected observation and media listeners on completion or component destruction;
- added focused pure Jasmine tests;
- updated the transformation entry point, decision log, status, working rules, and PR description;
- kept `MASTER_PLAN.md` unchanged because program phases, architecture, and target outcomes did not change.

## Design and implementation rationale

### Landing-specific ownership

The repository contained no existing reveal or `IntersectionObserver` pattern. This behavior is proven only for the public landing page, so it remains under:

```text
apps/web/src/app/features/public/
```

It is not promoted to `shared`, injected through a service, or presented as a general motion API. A later surface must provide evidence before reuse is approved.

### Why the final implementation is a helper

The first branch version used a standalone attribute directive. PR CI runs #1028, #1030, and #1033 failed during Angular lint/type compilation before build or tests. The visual and accessibility contract was retained, but the Angular metadata/input surface was removed.

The final implementation uses the alternative explicitly allowed by the reviewed Phase 1C contract: an equally small landing-specific setup helper. `LandingPageComponent` owns setup and cleanup, while the helper contains pure DOM observation and transition behavior. CI run #1038 confirmed that this helper-based runtime head passes Angular lint/type compilation.

### Visible-by-default enhancement

Hidden motion styles are applied only when all of these are available:

- browser execution;
- `IntersectionObserver`;
- `matchMedia`;
- reduced motion is not requested.

All fallback paths leave content fully visible. Content remains in the DOM and retains layout space even while awaiting normal-motion reveal.

### Restrained motion contract

Motion is limited to:

- opacity `0` to `1`;
- translation `18px` to `0`;
- 420ms duration;
- a restrained ease-out curve;
- delay capped at 240ms;
- one reveal per element.

There is no scale, rotation, blur, parallax, looping, or scroll-linked progress.

### First-screen stability

The header, hero copy, hero actions, hero proof, and product-stage composition remain unchanged and unmarked. The footer also remains static.

### Selected composition boundaries

Markers are applied to:

- workflow introduction;
- five workflow steps with 50ms increments;
- capability introduction;
- each capability copy block;
- each capability demonstration with a 90ms paired delay;
- progress copy;
- progress dashboard with a 90ms paired delay;
- final call to action.

## Files changed

Runtime and tests:

- `apps/web/src/app/features/public/landing-page.component.ts`
- `apps/web/src/app/features/public/landing-scroll-reveal.ts`
- `apps/web/src/app/features/public/landing-scroll-reveal.spec.ts`

Transformation records:

- `TRANSFORMATION.md`
- `transformation/DECISIONS.md`
- `transformation/STATUS.md`
- `transformation/WORKING_RULES.md`
- `transformation/reports/PHASE_1D_LANDING_SCROLL_REVEAL_IMPLEMENTATION.md`

No CSS, route, package, lockfile, API, contract, schema, database, job, mobile, or backend file is changed.

## Validation performed

### Repository inspection

- read the transformation entry point and all governing transformation records;
- read repository Angular instructions, architecture, patterns, migration ledger, and responsive rules;
- inspected the Phase 1C browser-feedback contract;
- inspected the current landing component and styles;
- inspected web scripts and Jasmine test conventions;
- searched for an existing reveal implementation and found none;
- verified PR #118 merge and CI state;
- reviewed PR #120 changed-file scope and successive CI heads.

### Focused tests added

`landing-scroll-reveal.spec.ts` covers:

- observation options and normal reveal;
- delay application;
- one-time unobserve/disconnect cleanup;
- missing `IntersectionObserver` fallback;
- missing `matchMedia` fallback;
- initial reduced-motion fallback;
- dynamic reduced-motion transition-free reveal;
- idempotent cleanup.

### Automated validation history

- PR #120 run #1028: failed at Angular lint/type compilation on the first directive implementation;
- run #1030: failed at the same gate after browser-API mock cleanup;
- run #1033: failed at the same gate after removing the transformed directive input;
- run #1038: helper-based runtime head passed lint and advanced to the full build before later documentation updates changed the branch head.

The final reviewed branch head must pass the complete GitHub Actions workflow before automated validation is considered complete.

### Local checks

A direct clone failed because this environment could not resolve `github.com`. Therefore repository build, test, lint, and architecture commands were not available locally.

The plain TypeScript helper was compiled independently with strict DOM settings, including `strict`, `noImplicitReturns`, and `noPropertyAccessFromIndexSignature`; that focused check passed.

Commands skipped locally:

```text
npm run build:web
npm run test --workspace=apps/web
npm run lint
npm run check:architecture
```

## Warnings and residual risks

- direct browser review is required to judge the 420ms duration and 18px translation;
- the five-step stagger may need a smaller optical delay after review;
- stacked mobile steps may reveal individually as they enter the viewport;
- focus navigation into pending below-fold links should be checked in a real browser;
- unsupported-observer fallback is unit-tested but may be difficult to reproduce manually;
- dynamic reduced-motion switching still requires browser review;
- the helper must not be promoted to shared infrastructure without another proven consumer;
- prior authentication, home, brand, navigation, Clerk, and responsive residual checks remain open.

## Open decisions

- whether Phase 1D is accepted after final-head CI and browser review;
- whether duration, translation, threshold, root margin, or stagger needs adjustment;
- whether later surfaces should reuse this helper or remain feature-local;
- whether broader motion belongs in Phase 3;
- existing palette, typography, mobile-navigation, rail, and public-metadata decisions remain unresolved.

## Review instructions

1. Confirm runtime scope is limited to the landing component and feature-local helper/spec.
2. Confirm the hero, header, product-stage composition, and footer have no reveal marker.
3. Review workflow timing at desktop and mobile widths.
4. Review capability copy/demonstration pairing.
5. Review progress and final-call-to-action timing.
6. Enable reduced motion before load and confirm immediate visibility.
7. Toggle reduced motion while lower content is pending and confirm transition-free visibility.
8. Confirm no layout shift or delayed semantic content.
9. Confirm final-head lint, build, architecture, migrations, and tests pass.
10. Confirm transformation records match the helper architecture and retain residual risks.

## Reproduction instructions

From the repository root:

```text
npm install
npm run dev --workspace=apps/web
```

Open `/` and review normal scrolling at desktop, single-column, and compact widths. Repeat with browser reduced-motion emulation enabled before reload and changed while an unrevealed section remains below the viewport.

Focused validation:

```text
npm run test --workspace=apps/web
npm run build:web
npm run lint
npm run check:architecture
```

## Stop condition

Do not merge PR #120 without explicit approval. When approved, squash merge it into `visual_transformation`.

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
- `apps/web/tsconfig.json`
- `apps/web/tsconfig.app.json`
- `tsconfig.base.json`
- `apps/web/src/app/features/public/landing-page.component.ts`
- `apps/web/src/app/features/public/landing-page.component.css`
- `apps/web/src/app/shared/ui/brand/brand-mark.component.spec.ts`
- PR #118 merge and workflow state
- PR #120 changed files, patches, and workflow runs
