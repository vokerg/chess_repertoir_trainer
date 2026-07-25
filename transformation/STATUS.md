# Visual Transformation Status

Last updated: 2026-07-25

## Current state

**Program state:** Planning and identity direction established

**Implementation state:** Not started

**Integration branch:** `visual_transformation`

The branch and documentation structure now exist so design and implementation context can persist across sessions.

## Completed

- [x] Reviewed the current application shell, routes, authentication pages, navigation, global styles, Study entry point, and frontend architecture rules.
- [x] Diagnosed the main visual problem as a product-shell and identity problem rather than isolated page styling.
- [x] Established three distinct experiences: public, authentication, and signed-in application.
- [x] Agreed that `/` should become a public landing page.
- [x] Agreed that `/home` should become the signed-in entry point.
- [x] Selected the analytical identity direction.
- [x] Selected graphite chrome, clean light workspaces, and mint signal color as the visual direction.
- [x] Selected the geometric Node Branch symbol.
- [x] Agreed to keep `Chess Repertoire Trainer`, with `Chess Repertoire` visually primary and `TRAINER` secondary.
- [x] Agreed to use controlled SVG geometry rather than a generated raster logo.
- [x] Agreed on a collapsible left navigation rail for desktop.
- [x] Established the phased transformation plan.
- [x] Created the `visual_transformation` branch from `main`.
- [x] Added persistent transformation documentation.

## Current checkpoint

No production assets, Angular components, routes, or styles have been changed yet.

The next step must be discussed with the user before implementation begins.

Recommended next checkpoint:

1. Create a production-oriented Node Branch geometry proof.
2. Test it at 16px, 24px, 32px, and 48px, plus reversed and monochrome contexts.
3. Create a high-fidelity responsive landing-page visualization using the chosen identity.
4. Review the page and lock the production palette, typography hierarchy, and wordmark proportions.

## Program backlog

### Phase 0 — identity and visual proof

- [ ] Finalize Node Branch geometry.
- [ ] Validate small-size, normal, reversed, and monochrome behavior.
- [ ] Finalize wordmark proportions.
- [ ] Produce high-fidelity landing-page visualization.
- [ ] Validate desktop and mobile landing compositions.
- [ ] Lock production palette.
- [ ] Lock typography hierarchy and analytical numeric treatment.
- [ ] Produce auth visualization.
- [ ] Produce signed-in home visualization.

### Phase 1 — shell and entry points

- [ ] Add brand SVG assets.
- [ ] Add shared brand mark and lockup components.
- [ ] Add public layout.
- [ ] Add public landing page at `/`.
- [ ] Add authentication layout.
- [ ] Refactor login and sign-up into the shared auth shell.
- [ ] Theme Clerk presentation consistently.
- [ ] Add authenticated app layout.
- [ ] Add signed-in `/home`.
- [ ] Change normal post-login destination to `/home` while preserving explicit return URLs.
- [ ] Move authenticated navigation and job/status UI into the app layout.
- [ ] Implement collapsible desktop navigation rail.
- [ ] Refine mobile navigation without duplicating the navigation model.
- [ ] Evolve global tokens, shared page header, panel, and button treatments.
- [ ] Add favicon and public metadata/social preview.

### Phase 2 — representative workflows

- [ ] Modernize Games.
- [ ] Modernize Study.
- [ ] Modernize Opening Analysis.
- [ ] Extract only genuinely reusable patterns into shared UI.
- [ ] Validate representative mobile workflows.

### Phase 3 — rollout and polish

- [ ] Migrate remaining primary pages.
- [ ] Migrate Labs without giving experiments equal prominence to core workflows.
- [ ] Add coherent empty states.
- [ ] Develop onboarding.
- [ ] Refine home recommendations.
- [ ] Decide and implement full appearance preferences if justified.
- [ ] Refine motion and transitions.
- [ ] Produce final marketing screenshots and social assets.
- [ ] Complete accessibility and responsive review.

## Session log

### 2026-07-25 — Program setup

- Established the analytical identity direction.
- Chose the Node Branch symbol.
- Defined the public/auth/app separation and signed-in home direction.
- Created `visual_transformation` from `main`.
- Added the master plan, decisions, status tracker, and working rules.
- No application code or assets changed.

## Update protocol

After every meaningful design or implementation session:

1. Update the completed/backlog items above.
2. Add a dated session-log entry.
3. Record newly locked or rejected choices in `DECISIONS.md`.
4. Update `MASTER_PLAN.md` if the scope or architecture changed.
5. Record validation performed, skipped checks, warnings, and residual risks when implementation begins.
