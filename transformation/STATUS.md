# Visual Transformation Status

Last updated: 2026-07-27

## Current state

**Program state:** Phase 1C production navigation rail implemented; direct browser review accepted the direction, submenu discoverability was corrected, and final-head automated validation passed

**Integration branch:** `visual_transformation`

**Active implementation branch:** `visual-transformation/phase-1c-navigation-rail`

The public landing page, authentication shell, Phase 0B closure, signed-in home discovery, Angular `/home`, Phase 1A production brand assets, and Phase 1B navigation discovery are squash-merged into `visual_transformation`.

PR #108 was reviewed and explicitly approved. The current slice implements that approved navigation contract without changing routes, APIs, schemas, database behavior, dependencies, or feature workflows.

## Completed

- [x] Established the analytical graphite/mint identity and Node Branch concept.
- [x] Implemented and merged the public landing page through PR #78.
- [x] Implemented and merged the shared authentication shell through PR #79.
- [x] Reconciled and merged the Phase 0B checkpoint through PR #85.
- [x] Defined and merged signed-in home discovery through PR #86.
- [x] Implemented and merged the signed-in Angular home through PR #87.
- [x] Made `/home` the normal post-auth fallback while preserving explicit `returnUrl`.
- [x] Implemented and merged production Node Branch assets, favicon, and shared brand components through PR #88.
- [x] Defined and visualized the desktop rail and interim mobile navigation contract through PR #108.
- [x] Explicitly approved the Phase 1B discovery checkpoint for Angular implementation.
- [x] Created `visual-transformation/phase-1c-navigation-rail` from the updated integration branch.
- [x] Replaced the desktop floating pill header with a graphite left rail.
- [x] Kept `MainNavigationComponent.mainNavItems` as the only route/menu source.
- [x] Derived primary and quieter workspace rail sections from that source.
- [x] Added explicit expanded and collapsed desktop states.
- [x] Kept collapse state local and session-only.
- [x] Preserved every existing top-level route, child route, icon, quiet flag, and active prefix.
- [x] Added distinct keyboard-operable child disclosure buttons.
- [x] Added anchored child flyouts for expanded and collapsed modes.
- [x] Added Escape, backdrop, and route-navigation cleanup for transient navigation.
- [x] Retained the complete grouped mobile sheet below 760px.
- [x] Preserved Clerk and development-auth account behavior.
- [x] Preserved `AppComponent` ownership of the router outlet, imported-game job panel, and confirmation dialog.
- [x] Added focused navigation component tests.
- [x] Opened PR #112 to `visual_transformation`.
- [x] Passed dependency installation, lint, full build, architecture guardrails, migrations, and complete tests on GitHub Actions runs #940 and #945.
- [x] Completed direct browser review of the navigation direction.
- [x] Strengthened child-submenu discoverability with larger down/up chevron controls, stronger states, titles, and accessible labels.
- [x] Passed final-head GitHub Actions run #953 after the submenu correction.
- [x] Recorded the requested landing-page scroll-reveal motion as a separate focused Phase 1 follow-up.

## Current checkpoint

Review in this order:

1. `transformation/reports/PHASE_1C_NAVIGATION_RAIL_IMPLEMENTATION.md`
2. `transformation/reports/PHASE_1C_BROWSER_REVIEW_FEEDBACK.md`
3. expanded and collapsed navigation rail
4. revised Study, Openings, Tools, and Settings submenu controls
5. parent-link versus submenu-button behavior
6. mobile grouped sheet
7. PR #112 final-head CI.

Review focus:

- expanded rail hierarchy, approximately 240px wide;
- collapsed recognition and workspace width at approximately 74px;
- parent-link and disclosure-control separation;
- revised submenu target size and conventional down/up chevron behavior;
- anchored flyout placement, including lower Tools and Settings groups;
- visible keyboard focus and Escape behavior;
- active state for parent and child routes;
- account placement for Clerk and development authentication;
- mobile sheet completeness below the shared 760px breakpoint;
- interaction with imported-game job status and confirmation overlays;
- representative Home, Games, Study, Courses, Opening Analysis, free Analysis, Progress, Lab, and Settings widths.

Do not merge PR #112 without explicit approval. When approved, squash merge it into `visual_transformation`.

## Validation status

### Confirmed by repository inspection

- `AppComponent` remains the signed-in shell owner.
- The shell now uses an `auto minmax(0, 1fr)` desktop grid, so rail width drives content width without cross-component state.
- `MainNavigationComponent.mainNavItems` remains the sole navigation definition.
- Primary and workspace sections are filtered from that single array.
- Parent anchors retain their existing default links.
- Child access uses a separate disclosure button and no hover dependency.
- The disclosure control now uses a larger rounded target, conventional down/up chevron, explicit title, and `Show`/`Hide` submenu labels.
- Flyout and mobile-sheet state use local Angular signals.
- `NavigationEnd` and Escape close transient navigation.
- Mobile continues to render all groups and destinations from the same model.
- No route, contract, API, schema, database, dependency, job, or feature-workflow behavior changed.

### Automated validation

GitHub Actions final-head run #953 completed successfully after the browser-review correction:

- dependency installation passed;
- lint passed;
- full monorepo build passed, including Angular template/type compilation;
- architecture guardrails passed;
- database migrations applied successfully;
- complete monorepo tests passed, including the updated submenu disclosure specs.

Earlier complete runs #940 and #945 also passed before the submenu correction.

PR #112 CI is the authoritative executable validation because the current execution environment cannot resolve `github.com` for a local clone or checkout.

Attempted locally:

```text
git ls-remote https://github.com/vokerg/chess_repertoir_trainer.git HEAD
```

Result:

```text
fatal: unable to access 'https://github.com/vokerg/chess_repertoir_trainer.git/': Could not resolve host: github.com
```

### Outstanding browser validation

- quick visual recheck of the revised expanded and collapsed submenu controls;
- long labels and long user names;
- child flyout placement near top, bottom, and viewport edges;
- mobile grouped sheet at 760px, compact, and narrow-phone widths;
- Clerk account interaction;
- imported-game job panel spacing beside the rail;
- prior authentication, home, favicon, and brand-rasterization residual checks.

## Open decisions

- Whether Phase 1C is accepted after the revised submenu control is reviewed.
- Whether real-icon review requires a small adjustment within the approved expanded/collapsed width ranges.
- Whether child flyouts require viewport-edge repositioning after browser review.
- Whether collapse persistence is useful after real use; it is intentionally excluded now.
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
- [ ] Review and merge the validated Phase 1C production rail.
- [ ] Add restrained one-time scroll-reveal motion to selected public landing-page sections using native `IntersectionObserver`, visible-by-default fallback, and full `prefers-reduced-motion` support.
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

### 2026-07-27 — Phase 1C browser-review follow-up

- Recorded strong approval of the navigation rail direction.
- Corrected the weak child-submenu affordance with larger conventional down/up chevrons and stronger interaction states.
- Added focused disclosure semantics and tests.
- Passed final-head CI run #953.
- Recorded public landing-page scroll-reveal motion as an explicit Phase 1 backlog item and a separate focused slice after PR #112.
- Kept the motion work out of the navigation PR to preserve reviewability and scope boundaries.

### 2026-07-27 — Phase 1C production navigation rail

- Verified PR #108 was squash-merged into `visual_transformation` after explicit approval.
- Created `visual-transformation/phase-1c-navigation-rail` from the updated integration branch.
- Re-read repository Angular, shell, navigation, brand, responsive, and test conventions.
- Implemented the approved expanded/collapsed graphite rail in `MainNavigationComponent`.
- Kept the existing navigation array as the only destination source.
- Selected anchored flyouts for child navigation in both desktop states.
- Kept collapse state local, explicit, and non-persistent.
- Retained the complete grouped mobile sheet below 760px.
- Added focused component tests and opened PR #112.
- Attempted local GitHub access and recorded the exact DNS failure.
- Passed final implementation CI run #940: lint, build, architecture, migrations, and full tests.

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

## Update protocol

After every meaningful design or implementation session:

1. Update completed and backlog items.
2. Add a dated session-log entry.
3. Record locked, revised, or rejected choices in `DECISIONS.md`.
4. Update `MASTER_PLAN.md` if scope or architecture changes.
5. Record validation performed, skipped checks, warnings, and residual risks.
