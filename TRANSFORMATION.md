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

## Current checkpoint

The following slices are squash-merged into `visual_transformation`:

- PR #78 — public Angular landing page at `/`;
- PR #79 — shared authentication shell for `/login` and `/signup`;
- PR #85 — Phase 0B checkpoint reconciliation;
- PR #86 — signed-in `/home` discovery and visualization;
- PR #87 — guarded Angular `/home`, normal post-auth fallback to `/home`, and deterministic existing-data recommendations.

The active branch is `visual-transformation/phase-1a-brand-assets`.

Its approved scope is:

- extract one production Node Branch SVG geometry;
- provide standard, reversed, transparent-mark, and favicon assets;
- add shared Angular brand mark and live-text lockup components;
- replace duplicated or substitute brand renderings on the landing page, authentication shell, and current signed-in header;
- preserve every route, navigation behavior, API, and workflow.

Review next:

1. [`transformation/reports/PHASE_1A_BRAND_ASSETS_IMPLEMENTATION.md`](./transformation/reports/PHASE_1A_BRAND_ASSETS_IMPLEMENTATION.md)
2. `apps/web/src/assets/brand/brand-readme.md`
3. the shared brand component tests and PR CI;
4. landing, authentication, signed-in header, mobile menu, and favicon rendering in a real browser.

Do not merge the brand-assets pull request, begin the production navigation rail, finalize mobile navigation, migrate global tokens, change typography loading, create social-preview composition, or redesign authenticated workflows without explicit approval.
