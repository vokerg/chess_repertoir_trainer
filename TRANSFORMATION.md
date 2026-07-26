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

Phase 0A, Phase 0B, and the Phase 0C home discovery checkpoint are integrated into `visual_transformation`:

- PR #78 added the public Angular landing page at `/`;
- PR #79 added the shared authentication shell for `/login` and `/signup`;
- PR #85 reconciled the Phase 0B checkpoint documentation;
- PR #86 defined and visualized the first signed-in `/home` composition using existing stable APIs.

The active branch `visual-transformation/phase-0d-angular-home` implements the approved narrow Angular home slice:

- guarded `/home` route inside the existing signed-in shell;
- normal post-auth fallback changed from `/library` to `/home` while explicit `returnUrl` remains authoritative;
- Home added to the existing navigation model without implementing the future rail;
- feature-local state composed from existing account, library catalog, game facet, recent-game, and performance services;
- deterministic Continue and Recommended next rules;
- Recent signals deferred;
- no new backend endpoint, persistence, queue, Lab dependency, or authenticated workflow redesign.

Review next:

1. [`transformation/reports/PHASE_0D_ANGULAR_HOME_IMPLEMENTATION.md`](./transformation/reports/PHASE_0D_ANGULAR_HOME_IMPLEMENTATION.md)
2. `/home` with representative empty, partial, and populated data;
3. default sign-in and sign-up navigation to `/home`;
4. explicit `returnUrl` preservation;
5. desktop and mobile rendering inside the current application shell.

Do not merge the implementation pull request, begin the production navigation rail, finalize mobile navigation, extract production brand assets, migrate global tokens, add a home aggregation API, or redesign authenticated workflows without explicit approval.
