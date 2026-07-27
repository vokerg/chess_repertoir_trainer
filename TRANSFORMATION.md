# Visual Transformation Program

This file is the stable entry point for every ChatGPT, Copilot, Codex, or human session working on the product-wide visual transformation.

## Branch model

- Long-running integration branch: `visual_transformation`
- Base branch: `main`
- Do not commit transformation work directly to `main`.
- Substantial implementation slices use short-lived branches created from `visual_transformation` and merged back into it through reviewed pull requests.
- Merge transformation pull requests into `visual_transformation` with squash merge only after explicit approval.
- The transformation branch should reach `main` only through an explicitly reviewed pull request when the program is ready.

## Read before doing transformation work

Read these files in order:

1. [`AGENTS.md`](./AGENTS.md)
2. [Angular frontend skill](./.agents/skills/angular-frontend/SKILL.md) for Angular work
3. [Angular architecture](./docs/frontend/angular-architecture.md)
4. [`transformation/MASTER_PLAN.md`](./transformation/MASTER_PLAN.md)
5. [`transformation/DECISIONS.md`](./transformation/DECISIONS.md)
6. [`transformation/STATUS.md`](./transformation/STATUS.md)
7. [`transformation/WORKING_RULES.md`](./transformation/WORKING_RULES.md)

The repository code and tests remain the source of truth for runtime behavior. These transformation documents are the source of truth for the visual direction, sequencing, and decisions made across sessions.

## Documentation contract

Every meaningful transformation change must update the relevant files under `transformation/` in the same branch:

- Update `MASTER_PLAN.md` when scope, architecture, phases, or target outcomes change.
- Update `DECISIONS.md` when a design or product decision is locked, revised, or rejected.
- Update `STATUS.md` after each completed implementation slice or design checkpoint.
- Keep unresolved questions explicit. Do not silently convert provisional ideas into final decisions.

## Integrated checkpoints

The following slices are squash-merged into `visual_transformation`:

- PR #78 — public Angular landing page at `/`;
- PR #79 — shared authentication shell for `/login` and `/signup`;
- PR #85 — Phase 0B checkpoint reconciliation;
- PR #86 — signed-in `/home` discovery and visualization;
- PR #87 — guarded Angular `/home`, normal post-auth fallback to `/home`, and deterministic existing-data recommendations;
- PR #88 — production Node Branch assets, shared brand components, favicon, and integrated lockups;
- PR #108 — Phase 1B desktop rail and interim mobile-navigation discovery;
- PR #112 — Phase 1C production navigation rail, submenu-discoverability correction, focused tests, and retained grouped mobile sheet;
- PR #118 — Phase 1C integration-state documentation reconciliation.

Direct browser validation for authentication, home, brand rasterization, favicon, long navigation labels and names, viewport-edge flyouts, Clerk controls, and representative responsive widths remains residual work and must not be represented as completed.

## Current checkpoint

The active branch is `visual-transformation/phase-1d-landing-scroll-reveal`.

Its approved scope is the narrow production implementation of restrained public landing-page motion:

- add a feature-local standalone Angular directive using native `IntersectionObserver`;
- reveal selected lower-page landing compositions once with opacity and a small vertical translation;
- cover the workflow introduction and steps, capability copy and demonstrations, progress composition, and final call to action;
- leave the header, hero, first-screen product composition, footer, routes, copy, and layout unchanged;
- keep content visible when `IntersectionObserver` is unavailable or reduced motion is requested;
- use short restrained delays only, with no animation dependency or global motion system;
- add focused tests, transformation documentation, automated validation, and a reviewed pull request.

Review next:

1. [`transformation/reports/PHASE_1D_LANDING_SCROLL_REVEAL_IMPLEMENTATION.md`](./transformation/reports/PHASE_1D_LANDING_SCROLL_REVEAL_IMPLEMENTATION.md)
2. `apps/web/src/app/features/public/reveal-on-scroll.directive.ts`
3. `apps/web/src/app/features/public/reveal-on-scroll.directive.spec.ts`
4. the selected reveal bindings in `landing-page.component.ts`
5. `/` in a real browser with normal motion, reduced motion, desktop, and mobile widths
6. the Phase 1D pull request validation and review state.

Do not merge the Phase 1D pull request, animate the hero, create a global animation abstraction, add dependencies, migrate global tokens or typography, implement bottom navigation, redesign route pages, or change backend behavior without explicit approval.
