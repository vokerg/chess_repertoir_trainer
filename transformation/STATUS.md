# Visual Transformation Status

Last updated: 2026-07-27

## Current state

**Program state:** Phase 1D restrained public landing-page scroll reveal is implemented and has passed complete automated validation; direct browser review remains the acceptance gate

**Integration branch:** `visual_transformation`

**Active implementation branch:** `visual-transformation/phase-1d-landing-scroll-reveal`

The public landing page, authentication shell, Phase 0B closure, signed-in home discovery, Angular `/home`, Phase 1A production brand assets, Phase 1B navigation discovery, Phase 1C production navigation rail, and Phase 1C integration reconciliation are squash-merged into `visual_transformation`.

PR #118 was squash-merged on 2026-07-27 after PR CI run #1008 passed; integration CI run #1018 also passed. The current Phase 1D slice changes only the public landing feature and transformation records. It does not modify the hero, routes, signed-in shell, APIs, schemas, database behavior, dependencies, or feature workflows.

## Completed

- [x] Established the analytical graphite/mint identity and Node Branch concept.
- [x] Implemented and merged the public landing page through PR #78.
- [x] Implemented and merged the shared authentication shell through PR #79.
- [x] Reconciled and merged Phase 0B through PR #85.
- [x] Defined and merged signed-in home discovery through PR #86.
- [x] Implemented and merged signed-in Angular `/home` through PR #87.
- [x] Implemented and merged production brand assets, favicon, and shared lockups through PR #88.
- [x] Defined and merged the desktop navigation contract through PR #108.
- [x] Implemented and merged the Phase 1C production rail through PR #112.
- [x] Reconciled the Phase 1C integration state through PR #118.
- [x] Created `visual-transformation/phase-1d-landing-scroll-reveal` from the updated integration branch.
- [x] Added a small feature-local `landing-scroll-reveal.ts` helper using native `IntersectionObserver`.
- [x] Initialized the helper from `LandingPageComponent` through standard `AfterViewInit` and `OnDestroy` lifecycle ownership.
- [x] Marked only approved lower-page compositions with static `data-scroll-reveal` and optional `data-reveal-delay` attributes.
- [x] Limited motion to one-time opacity and 18px vertical translation with a 420ms duration and delays capped at 240ms.
- [x] Kept content visible when `IntersectionObserver` or `matchMedia` is unavailable or reduced motion is requested.
- [x] Added dynamic reduced-motion handling that reveals pending content immediately with transitions disabled.
- [x] Left the header, hero, first-screen product composition, footer, copy, routes, and layout unchanged.
- [x] Added focused helper tests for normal reveal, cleanup, unsupported-browser fallbacks, initial reduced motion, and dynamic reduced motion.
- [x] Locked the Phase 1D boundary in D-021.
- [x] Added the required Phase 1D implementation report.
- [x] Opened PR #120 to `visual_transformation`.
- [x] Passed complete final runtime-head CI run #1045: dependency installation, lint, full monorepo build, architecture guardrails, database migrations, and all tests.

## Current checkpoint

Review Phase 1D in this order:

1. `transformation/reports/PHASE_1D_LANDING_SCROLL_REVEAL_IMPLEMENTATION.md`;
2. `apps/web/src/app/features/public/landing-scroll-reveal.ts`;
3. `apps/web/src/app/features/public/landing-scroll-reveal.spec.ts`;
4. lifecycle setup and reveal markers in `landing-page.component.ts`;
5. `/` with normal motion and reduced motion;
6. desktop, tablet, compact, and narrow-phone widths;
7. PR #120 review state and current documentation-only-head CI.

Review focus:

- first-screen header, hero, product composition, and semantics remain unchanged;
- selected lower-page content remains in the DOM and retains layout space before reveal;
- reveal occurs once and is restrained rather than continuous or theatrical;
- workflow-step delays remain short when displayed in a row or stacked on mobile;
- capability copy and demonstrations enter as paired compositions;
- unsupported observation or media-query APIs leave content fully visible;
- initial and dynamically enabled reduced motion remove pending animation;
- no dependency, global animation service, route change, global token migration, or signed-in behavior change is included.

Do not merge PR #120 without explicit approval. When approved, squash merge it into `visual_transformation`.

## Validation status

### Confirmed by repository inspection

- `LandingPageComponent` remains a standalone OnPush public-route component.
- The helper is feature-local under `features/public` and is not promoted to `shared`.
- The hero and critical first-screen content have no reveal marker.
- Unsupported observation, unsupported `matchMedia`, and initial reduced-motion paths add no hidden styles.
- Pending elements remain semantically present and retain layout space.
- Intersecting elements reveal once and are unobserved.
- A reduced-motion preference change reveals all pending content without transition.
- Stagger delay is capped at 240ms.
- Component destruction disconnects observation and removes the media listener.
- No landing CSS, copy, route, package, contract, schema, database, or backend file is changed.

### Automated validation

PR #120 validation history:

- run #1028 failed during Angular lint/type compilation on the initial directive-based implementation;
- run #1030 failed at the same gate after browser-API test-double cleanup;
- run #1033 failed at the same gate after replacing the transformed directive input with static delay attributes;
- the directive implementation was removed and replaced with the landing-specific helper explicitly allowed by the Phase 1C review contract;
- run #1038 confirmed helper-based Angular lint/type compilation;
- run #1043 passed installation, lint, build, architecture, and migrations, then failed in the test step because the new spec used an invalid strict partial `IntersectionObserverEntry` cast;
- run #1044 passed the same non-test gates, then exposed browser-specific CSS serialization assertions in the helper spec;
- run #1045 passed dependency installation, lint, full monorepo build, architecture guardrails, database migrations, and the complete test suite after the fixtures and assertions were made strict and behavior-focused.

Run #1045 is the authoritative executable validation for the final runtime and test files. A later documentation-only head should remain green but does not change the validated runtime surface.

### Local executable validation

A direct local checkout remains unavailable in this environment.

Attempted:

```text
git clone --branch visual-transformation/phase-1d-landing-scroll-reveal --single-branch https://github.com/vokerg/chess_repertoir_trainer.git
```

Result:

```text
fatal: unable to access 'https://github.com/vokerg/chess_repertoir_trainer.git/': Could not resolve host: github.com
```

The helper and its spec were compiled locally with strict DOM settings, including `strict`, `noImplicitReturns`, and `noPropertyAccessFromIndexSignature`; that focused check passed after the final fixture correction.

These repository commands were not available locally:

```text
npm run build:web
npm run test --workspace=apps/web
npm run lint
npm run check:architecture
```

### Outstanding browser validation

Phase 1D:

- normal-motion timing and visual restraint;
- reduced motion before load and when changed while content is pending;
- workflow-step stagger on desktop and stacked mobile layouts;
- capability pairing at desktop and single-column widths;
- progress and final-call-to-action timing;
- absence of first-screen flash, layout shift, or hidden focus targets.

Prior residual checks:

- long navigation labels and long user names;
- child flyout placement near viewport edges;
- mobile grouped navigation at boundary widths;
- Clerk account interaction;
- imported-game job-panel spacing;
- representative signed-in page widths;
- authentication, home, favicon, and brand-rasterization checks.

## Open decisions

- Whether Phase 1D is accepted after direct browser review.
- Whether the 420ms duration, 18px translation, viewport threshold, or capped stagger needs an optical adjustment.
- Whether later product motion should reuse this helper or remain surface-specific; no global abstraction is approved.
- Whether rail widths or flyout placement need adjustment after residual browser review.
- Whether collapse persistence becomes useful after real use.
- Exact mobile-primary navigation after Games, Study, and Opening Analysis modernization.
- IBM Plex Sans loading strategy.
- Final production palette beyond the locked strong-mint text role.
- Final public metadata and social-preview composition.

## Program backlog

### Phase 0 — identity and visual proof

- [x] Produce and implement identity, landing, authentication, and signed-in home checkpoints.
- [ ] Complete and record browser review for authentication and home.

### Phase 1 — shell and entry points

- [x] Implement and merge shared production brand assets and lockups.
- [x] Separate public, authentication, and signed-in experiences.
- [x] Add signed-in `/home` and normal post-login navigation.
- [x] Define and implement the desktop navigation rail.
- [ ] Review and merge Phase 1D landing scroll reveal.
- [ ] Establish production global tokens and typography.
- [ ] Evolve shared page-header, panel, and button treatments after representative validation.
- [ ] Complete public metadata and social-preview work.

### Phase 2 — representative workflows

- [ ] Modernize Games.
- [ ] Modernize Study.
- [ ] Modernize Opening Analysis.
- [ ] Extract only genuinely reusable patterns into shared UI.
- [ ] Validate representative mobile workflows and decide final mobile-primary navigation.

### Phase 3 — rollout and polish

- [ ] Migrate remaining primary pages and Labs.
- [ ] Add coherent empty states and onboarding.
- [ ] Refine home recommendations, appearance preferences, and broader motion.
- [ ] Complete accessibility and responsive review.

## Session log

### 2026-07-27 — Phase 1D public landing scroll reveal

- Verified and squash-merged the Phase 1C reconciliation through PR #118.
- Re-entered through the updated transformation entry point and approved Phase 1D boundary.
- Inspected the current landing implementation, test conventions, package scripts, and the Phase 1C browser-feedback report.
- Confirmed there was no existing reveal implementation to reuse.
- Created the Phase 1D branch and PR #120.
- Implemented the approved reveal behavior initially as a feature-local directive.
- Used CI failures #1028, #1030, and #1033 to isolate Angular compilation incompatibility in that approach.
- Replaced the directive with a smaller landing-specific helper initialized by the existing component, retaining the same motion and accessibility contract.
- Used runs #1043 and #1044 to correct strict test fixtures and remove browser-specific CSS serialization assumptions.
- Passed complete runtime-head CI run #1045.
- Updated the transformation entry point, decisions, status, working rules, report, and PR description to match the final architecture and validation state.

### Earlier integrated checkpoints

- PR #78 — public landing page.
- PR #79 — shared authentication shell.
- PR #85 — Phase 0B documentation closure.
- PR #86 — signed-in home discovery.
- PR #87 — signed-in Angular home.
- PR #88 — production brand assets and shared lockups.
- PR #108 — navigation discovery.
- PR #112 — production navigation rail.
- PR #118 — Phase 1C integration reconciliation.
