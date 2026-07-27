# Visual Transformation Status

Last updated: 2026-07-27

## Current state

**Program state:** Phase 1D restrained public landing-page scroll reveal is implemented on its review branch; automated and direct browser validation remain review gates

**Integration branch:** `visual_transformation`

**Active implementation branch:** `visual-transformation/phase-1d-landing-scroll-reveal`

The public landing page, authentication shell, Phase 0B closure, signed-in home discovery, Angular `/home`, Phase 1A production brand assets, Phase 1B navigation discovery, Phase 1C production navigation rail, and Phase 1C integration reconciliation are squash-merged into `visual_transformation`.

PR #118 reconciled the persistent transformation state and was squash-merged on 2026-07-27. Its PR CI run #1008 and integration CI run #1018 completed successfully. The current slice adds motion only to selected lower-page public landing compositions and does not modify the hero, routes, signed-in shell, APIs, schemas, database behavior, dependencies, or feature workflows.

## Completed

- [x] Established the analytical graphite/mint identity and Node Branch concept.
- [x] Implemented and merged the public landing page through PR #78.
- [x] Implemented and merged the shared authentication shell through PR #79.
- [x] Reconciled and merged the Phase 0B checkpoint through PR #85.
- [x] Defined and merged signed-in home discovery through PR #86.
- [x] Implemented and merged the signed-in Angular home through PR #87.
- [x] Made `/home` the normal post-auth fallback while preserving explicit `returnUrl`.
- [x] Implemented and merged production Node Branch assets, favicon, and shared brand components through PR #88.
- [x] Defined, visualized, reviewed, and merged the desktop rail and interim mobile navigation contract through PR #108.
- [x] Implemented and squash-merged the Phase 1C production rail through PR #112.
- [x] Preserved the sole navigation model, local collapse state, keyboard-operable flyouts, complete mobile sheet, account behavior, and root overlays.
- [x] Reconciled the post-merge Phase 1C documentation through PR #118.
- [x] Created `visual-transformation/phase-1d-landing-scroll-reveal` from the updated integration branch.
- [x] Added a feature-local standalone `RevealOnScrollDirective` using native `IntersectionObserver`.
- [x] Kept content visible when `IntersectionObserver` is unavailable or reduced motion is requested.
- [x] Added dynamic reduced-motion cleanup for elements waiting to reveal.
- [x] Limited motion to one-time opacity and 18px vertical translation with short capped delays.
- [x] Left the header, hero, first-screen product composition, footer, copy, routes, and page layout unchanged.
- [x] Applied reveal behavior to the workflow introduction and steps, capability introduction/copy/demonstrations, progress composition, and final call to action.
- [x] Added focused Jasmine tests for normal reveal, unsupported-browser fallback, initial reduced motion, and a reduced-motion preference change.
- [x] Locked the Phase 1D implementation boundary in D-021.
- [x] Added a dedicated Phase 1D implementation report.

## Current checkpoint

Review the Phase 1D production slice in this order:

1. `transformation/reports/PHASE_1D_LANDING_SCROLL_REVEAL_IMPLEMENTATION.md`;
2. `apps/web/src/app/features/public/reveal-on-scroll.directive.ts`;
3. `apps/web/src/app/features/public/reveal-on-scroll.directive.spec.ts`;
4. reveal bindings in `apps/web/src/app/features/public/landing-page.component.ts`;
5. the public `/` page with normal motion and reduced motion;
6. desktop, tablet, compact, and narrow-phone widths;
7. pull-request automated validation and final review state.

Review focus:

- first-screen header, hero, product composition, and semantics are unchanged;
- selected lower-page content is visible in the DOM before motion and reveals only once;
- the transition is restrained rather than decorative or continuous;
- workflow step delays remain capped and do not feel sequentially slow;
- capability copy and demonstrations enter as paired compositions;
- unsupported `IntersectionObserver` leaves content fully visible;
- initial and dynamically enabled reduced motion remove pending animation;
- no dependency, global animation service, route change, global token migration, or signed-in behavior change is included.

Do not merge the Phase 1D pull request without explicit approval. When approved, squash merge it into `visual_transformation`.

## Validation status

### Confirmed by repository inspection

- `LandingPageComponent` remains a standalone OnPush public-route component.
- The hero and critical first-screen content have no reveal directive.
- `RevealOnScrollDirective` is feature-local under `features/public`.
- The directive uses the host document window rather than a global service or dependency.
- Unsupported observation and initial reduced-motion paths add no hidden styles.
- Pending elements remain semantically present and retain their layout space.
- Intersecting elements reveal once, unobserve, and disconnect.
- A reduced-motion preference change reveals pending content immediately with transitions disabled.
- Stagger delay is capped at 240ms.
- No landing-page CSS, copy, route, API, contract, schema, database, dependency, or signed-in workflow behavior changed.

### Automated validation

The preceding Phase 1C reconciliation passed complete CI on PR run #1008 and integration run #1018.

Phase 1D pull-request CI is the authoritative executable validation for this runtime slice. It must cover:

- dependency installation;
- lint and Angular type checking;
- full monorepo build and Angular template compilation;
- architecture guardrails;
- database migrations;
- complete tests, including the new directive specs.

Do not represent Phase 1D automated validation as complete until the pull-request checks pass at the reviewed head.

### Local executable validation

A direct local checkout remains unavailable in the execution environment.

Attempted again on 2026-07-27:

```text
git clone --branch visual-transformation/phase-1d-landing-scroll-reveal --single-branch https://github.com/vokerg/chess_repertoir_trainer.git
```

Result:

```text
fatal: unable to access 'https://github.com/vokerg/chess_repertoir_trainer.git/': Could not resolve host: github.com
```

The GitHub connector was used for branch creation, repository inspection, file updates, comparison, pull-request operations, and CI inspection.

These local commands were therefore not run:

```text
npm run build:web
npm run test --workspace=apps/web
npm run lint
npm run check:architecture
```

### Outstanding browser validation

Phase 1D:

- normal-motion reveal timing and visual restraint;
- reduced motion before page load and when changed while content is pending;
- unsupported-observer fallback where practical;
- workflow-step stagger on desktop and stacked mobile layouts;
- capability pairing at desktop and single-column widths;
- progress and final-call-to-action reveal timing;
- absence of first-screen flash, layout shift, or hidden focus targets.

Prior residual checks:

- long navigation labels and long user names;
- child flyout placement near viewport edges;
- mobile grouped navigation at boundary widths;
- Clerk account interaction;
- imported-game job panel spacing;
- representative signed-in page widths;
- authentication, home, favicon, and brand-rasterization checks.

## Open decisions

- Whether Phase 1D motion is accepted after automated and direct browser review.
- Whether the 420ms duration, 18px translation, or capped stagger needs a focused optical adjustment.
- Whether later product motion should reuse this directive or remain surface-specific; no global abstraction is approved now.
- Whether real-icon and long-label review requires a small rail-width adjustment within the approved ranges.
- Whether child flyouts require viewport-edge repositioning.
- Whether collapse persistence becomes useful after real use.
- Exact mobile-primary navigation after Games, Study, and Opening Analysis modernization.
- IBM Plex Sans loading strategy.
- Final production palette beyond the locked strong-mint text role.
- Final public metadata and social-preview composition.

## Program backlog

### Phase 0 — identity and visual proof

- [x] Produce identity and landing proof.
- [x] Implement and merge the landing page.
- [x] Implement and merge the authentication composition.
- [x] Reconcile and merge the Phase 0B checkpoint.
- [x] Produce and merge signed-in home discovery and visualization.
- [x] Implement and merge the signed-in Angular home.
- [ ] Complete and record browser review for authentication and home.

### Phase 1 — shell and entry points

- [x] Implement and merge shared production brand assets and lockup components.
- [x] Separate public and authentication routes from the signed-in shell.
- [x] Add signed-in `/home` and normal post-login navigation.
- [x] Define, visualize, review, and merge the desktop rail contract.
- [x] Review and merge the validated Phase 1C production rail.
- [ ] Review and merge restrained one-time public landing-page scroll reveal.
- [ ] Establish production global tokens and typography.
- [ ] Evolve shared page-header, panel, and button treatments after representative validation.
- [ ] Complete remaining public metadata and social-preview work.

### Phase 2 — representative workflows

- [ ] Modernize Games.
- [ ] Modernize Study.
- [ ] Modernize Opening Analysis.
- [ ] Extract only genuinely reusable patterns into shared UI.
- [ ] Validate representative mobile workflows.
- [ ] Decide final mobile-primary navigation from representative evidence.

### Phase 3 — rollout and polish

- [ ] Migrate remaining primary pages and Labs with appropriate hierarchy.
- [ ] Add coherent empty states and onboarding.
- [ ] Refine home recommendations, appearance preferences, and broader application motion and transitions.
- [ ] Complete accessibility and responsive review.

## Session log

### 2026-07-27 — Phase 1D public landing scroll reveal

- Verified PR #118 was squash-merged and that integration CI run #1018 passed.
- Re-entered through the updated transformation entry point and reviewed the Phase 1C browser-feedback contract.
- Inspected the current landing component, public-page styles, Angular package/test setup, and component-test conventions.
- Confirmed there was no existing `IntersectionObserver` or scroll-reveal implementation to reuse.
- Created `visual-transformation/phase-1d-landing-scroll-reveal` from `visual_transformation`.
- Added a feature-local standalone directive with visible-by-default fallbacks and one-time cleanup.
- Kept the hero unanimated and applied restrained motion only to the approved lower-page compositions.
- Added focused normal-motion, fallback, and reduced-motion tests.
- Updated the transformation entry point, decisions, status, working rules, and implementation report.
- Kept global motion architecture, dependencies, tokens, typography, route-page redesign, and backend work outside the slice.

### 2026-07-27 — Phase 1C integration reconciliation

- Verified that PR #112 was already squash-merged into `visual_transformation`.
- Verified successful integration-commit CI run #983.
- Reconciled the transformation entry point, decision log, status, and working rules.
- Closed D-315 as locked and integrated while preserving residual validation and open product decisions.
- Added a dedicated reconciliation report and squash-merged the documentation checkpoint through PR #118.

### 2026-07-27 — Phase 1C browser-review follow-up

- Recorded strong approval of the navigation rail direction.
- Corrected the weak child-submenu affordance with larger conventional down/up chevrons and stronger interaction states.
- Added focused disclosure semantics and tests.
- Passed final pre-merge correction CI run #953.

### 2026-07-27 — Phase 1C production navigation rail

- Implemented the approved expanded/collapsed graphite rail in `MainNavigationComponent`.
- Kept the existing navigation array as the only destination source.
- Selected anchored flyouts for child navigation in both desktop states.
- Kept collapse state local, explicit, and non-persistent.
- Retained the complete grouped mobile sheet below 760px.
- Added focused component tests and opened PR #112.

### 2026-07-26 — Phase 1B navigation shell discovery

- Inspected current shell and navigation ownership.
- Defined expanded/collapsed desktop and interim mobile contracts.
- Added an interactive prototype and detailed report.
- Passed CI and squash-merged through PR #108 after explicit approval.

### Earlier integrated checkpoints

- PR #78 — public landing page.
- PR #79 — shared authentication shell.
- PR #85 — Phase 0B documentation closure.
- PR #86 — signed-in home discovery.
- PR #87 — signed-in Angular home.
- PR #88 — production brand assets and shared lockups.
