# Visual Transformation Status

Last updated: 2026-07-26

## Current state

**Program state:** Phase 0D signed-in Angular home implemented; automated validation passed, browser review pending

**Integration branch:** `visual_transformation`

**Active implementation branch:** `visual-transformation/phase-0d-angular-home`

The public landing page, authentication shell, Phase 0B checkpoint closure, and Phase 0C home discovery are squash-merged into `visual_transformation`. The current slice implements the approved first `/home` inside the existing signed-in shell and intentionally stops before the production navigation rail or representative workflow redesigns.

## Completed

- [x] Established the analytical identity, graphite/mint direction, Node Branch concept, and public/auth/app separation.
- [x] Implemented and merged the public landing page through PR #78.
- [x] Implemented and merged the shared authentication shell through PR #79.
- [x] Reconciled and merged the Phase 0B checkpoint through PR #85.
- [x] Defined, visualized, and merged the signed-in home discovery checkpoint through PR #86.
- [x] Approved the Phase 0C hierarchy with Recent signals deferred and the rail kept separate.
- [x] Added guarded `/home` inside the existing signed-in shell.
- [x] Changed the normal sign-in and sign-up fallback to `/home` while preserving explicit `returnUrl`.
- [x] Added Home to the existing navigation data model and added a matching shared icon.
- [x] Added a feature-local home store using existing typed account, library, games, and performance services.
- [x] Implemented partial-request failure handling and manual refresh.
- [x] Implemented deterministic Continue and Recommended next rules.
- [x] Added restrained workspace shortcuts and recent-progress summary.
- [x] Added focused tests for account selection, Continue priorities, setup recommendations, and stale-sync behavior.
- [x] Passed lint, full build, architecture guardrails, CI migrations, and the complete monorepo test suite on PR #87.
- [x] Updated the transformation entry point, decision log, working stop condition, and implementation report.

## Current checkpoint

Review in this order:

1. `transformation/reports/PHASE_0D_ANGULAR_HOME_IMPLEMENTATION.md`
2. `/home` with populated data
3. `/home` with no connected account, no games, and no courses
4. `/home` with one or more failed supporting API requests
5. desktop and mobile rendering inside the current application shell
6. default sign-in/sign-up navigation and explicit `returnUrl`
7. PR #87 changed files and final CI

Review focus:

- whether Continue is visually and functionally dominant;
- whether recommendation reasons and links are correct;
- whether the existing request fan-out is acceptable;
- whether empty and partial states remain useful;
- whether progress stays secondary;
- whether the current navigation remains usable with Home added;
- whether the slice should be approved without pulling rail work into scope.

Do not merge PR #87 without explicit approval. When approved, squash merge it into `visual_transformation`.

## Validation status

### Confirmed by repository inspection

- `/home` is registered with `authGuard`.
- `/home` renders inside the existing application shell.
- login and sign-up use `/home` only when no explicit `returnUrl` is supplied.
- the existing Progress account-selection order is reused.
- weak/untrained course actions link to existing course marathon routes and modes.
- analysed-game actions link to existing game review routes.
- analysis-backlog actions use the existing Games query codec.
- no backend, contract, schema, migration, dependency, queue, persistence, or Lab API was added.
- Recent signals is not included in the implementation.

### Automated validation

GitHub Actions CI run #885 completed successfully on the implementation head:

- dependency installation passed;
- lint passed;
- full monorepo build passed;
- architecture guardrails passed;
- database migrations applied successfully to the CI database;
- complete monorepo tests passed, including the focused home helper tests.

The final documentation-only validation commit must also complete CI before PR #87 is marked ready for review.

### Outstanding browser validation

- desktop rendering at representative wide and medium widths;
- mobile rendering around 390px and the existing 760px breakpoint;
- keyboard and visible-focus review;
- populated, empty, loading, error, and partial-warning states;
- configured-Clerk sign-in and sign-up fallback to `/home`;
- explicit `returnUrl` navigation;
- local development-auth navigation;
- request timing and loading behavior with representative data volume.

Authentication browser/Clerk validation from D-306 remains open and is not resolved merely by changing the fallback route.

## Open decisions

- Whether Phase 0D is approved after browser review.
- Whether the seven-day stale-sync threshold should be retained after real-data use.
- Whether existing request fan-out remains acceptable after browser timing review.
- Exact production desktop navigation rail and mobile navigation model.
- Whether direct browser and Clerk validation accepts the Phase 0B authentication composition without revision.
- Production Node Branch asset extraction and final geometry.
- IBM Plex Sans loading strategy.
- Final production palette beyond the locked strong-mint text role.

## Program backlog

### Phase 0 — identity and visual proof

- [x] Produce identity and landing proof.
- [x] Implement and merge the landing page.
- [x] Implement and merge the authentication composition.
- [x] Reconcile and merge the Phase 0B checkpoint.
- [x] Produce and merge signed-in home discovery and visualization.
- [ ] Complete and record browser review for authentication or approve a focused correction slice.
- [ ] Approve or revise the Angular signed-in home implementation.

### Phase 1 — shell and entry points

- [ ] Add shared production brand assets and lockup components.
- [x] Separate public and authentication routes from the signed-in application shell.
- [x] Refactor login and sign-up into a shared authentication shell.
- [x] Theme Clerk presentation consistently at the variable level.
- [ ] Merge signed-in `/home` and its normal post-login destination change.
- [ ] Implement the approved desktop navigation rail and mobile navigation behavior.
- [ ] Evolve global tokens and shared UI treatments only after representative validation.

### Phase 2 — representative workflows

- [ ] Modernize Games.
- [ ] Modernize Study.
- [ ] Modernize Opening Analysis.
- [ ] Extract only genuinely reusable patterns into shared UI.
- [ ] Validate representative mobile workflows.

### Phase 3 — rollout and polish

- [ ] Migrate remaining primary pages and Labs with appropriate hierarchy.
- [ ] Add coherent empty states and onboarding.
- [ ] Refine home recommendations, appearance preferences, motion, and transitions.
- [ ] Complete accessibility and responsive review.

## Session log

### 2026-07-26 — Phase 0D Angular signed-in home

- Confirmed PR #86 CI succeeded and squash-merged it into `visual_transformation`.
- Created `visual-transformation/phase-0d-angular-home` from the updated integration branch.
- Implemented the guarded `/home` route in the current signed-in shell.
- Added Home to the existing navigation model without implementing the planned rail.
- Changed normal login and sign-up fallback to `/home` while preserving explicit return URLs.
- Added a feature-local store that composes existing stable services with partial-failure handling.
- Implemented deterministic Continue and recommendation rules with a named seven-day stale-sync constant.
- Deferred Recent signals and avoided Lab or new backend dependencies.
- Added responsive home composition and focused rule tests.
- Opened draft PR #87 and passed lint, build, architecture guardrails, migrations, and the complete test suite.

### 2026-07-26 — Phase 0C signed-in home discovery

- Squash-merged PR #85 after successful CI.
- Inspected stable frontend data-access services and contracts.
- Defined a no-new-backend home composition and deterministic action hierarchy.
- Produced a responsive prototype and review sheet.
- Squash-merged the approved discovery checkpoint through PR #86 after successful CI.

### 2026-07-26 — Phase 0B checkpoint closure

- Reconciled stale transformation documentation.
- Preserved the authentication browser-validation gap.
- Squash-merged the closure through PR #85 after CI passed.

### 2026-07-26 — Phase 0B authentication shell

- Added the shared responsive authentication shell.
- Preserved Clerk, development auth, and return-URL behavior.
- Squash-merged through PR #79.

### 2026-07-26 — Angular landing implementation

- Implemented the isolated public landing page at `/`.
- Preserved authenticated application routes and behavior.
- Squash-merged through PR #78.

## Update protocol

After every meaningful design or implementation session:

1. Update completed and backlog items.
2. Add a dated session-log entry.
3. Record locked, revised, or rejected choices in `DECISIONS.md`.
4. Update `MASTER_PLAN.md` if scope or architecture changes.
5. Record validation performed, skipped checks, warnings, and residual risks.
