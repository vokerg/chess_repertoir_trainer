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

Phase 0A and Phase 0B are integrated into `visual_transformation`:

- PR #78 squash-merged the public Angular landing page at `/`;
- PR #79 squash-merged the shared authentication shell for `/login` and `/signup`;
- PR #85 squash-merged the Phase 0B checkpoint documentation after successful CI;
- public and authentication routes render outside the existing signed-in application shell;
- Clerk lifecycle, local development authentication, explicit `returnUrl` behavior, and the existing `/library` fallback remain intact.

The active branch `visual-transformation/phase-0c-home-discovery` contains the signed-in `/home` discovery and visualization checkpoint. It includes:

- direct inspection of existing account, game, course, training-stat, and progress contracts;
- a proposed first-home data composition using existing stable APIs only;
- deterministic Continue and Recommended next rules;
- a responsive desktop/mobile static prototype;
- a GitHub-renderable review sheet;
- a dedicated discovery, rationale, validation, and risk report.

Review next:

1. [`transformation/reports/PHASE_0C_HOME_DISCOVERY.md`](./transformation/reports/PHASE_0C_HOME_DISCOVERY.md)
2. [`transformation/prototypes/phase-0c-home/review-sheet.svg`](./transformation/prototypes/phase-0c-home/review-sheet.svg)
3. the responsive HTML prototype under `transformation/prototypes/phase-0c-home/`
4. [`transformation/DECISIONS.md`](./transformation/DECISIONS.md) and [`transformation/STATUS.md`](./transformation/STATUS.md)

Do not implement `/home`, change the normal post-login destination, implement the production navigation rail, extract production brand assets, migrate global tokens, or redesign authenticated workflows until the Phase 0C composition and rules are explicitly approved.
