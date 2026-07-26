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
- public and authentication routes render outside the existing signed-in application shell;
- Clerk lifecycle, local development authentication, explicit `returnUrl` behavior, and the existing `/library` fallback remain intact;
- PR #79 CI completed successfully.

The Phase 0B implementation report records that local browser rendering, responsive review, configured-Clerk interaction, and development-auth interaction were not performed in the connector-only implementation environment. No later repository report currently records those checks as completed.

The active documentation checkpoint is:

1. reconcile the persistent transformation documents with the merged Phase 0B state;
2. preserve the missing browser and Clerk checks as an explicit residual validation gap;
3. establish the next product gate as a separate Phase 0C signed-in `/home` discovery and visualization checkpoint.

Review next:

1. [`transformation/reports/PHASE_0B_CHECKPOINT_CLOSURE.md`](./transformation/reports/PHASE_0B_CHECKPOINT_CLOSURE.md)
2. [`transformation/STATUS.md`](./transformation/STATUS.md)
3. [`transformation/DECISIONS.md`](./transformation/DECISIONS.md)
4. the authentication implementation report and `/login` and `/signup` in a real browser when validation is available.

Do not begin signed-in `/home` production implementation, navigation-rail implementation, production brand-asset extraction, global token migration, or authenticated workflow redesign until the next checkpoint is explicitly approved.