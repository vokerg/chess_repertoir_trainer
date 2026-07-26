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

The Phase 0A direction was explicitly approved for a browser-review implementation slice. The working branch `visual-transformation/phase-0a-angular-landing` now contains an isolated Angular landing page at `/` and is awaiting pull-request review into `visual_transformation`.

Implemented in this slice:

- standalone public landing component;
- responsive Phase 0A composition;
- Node Branch-inspired inline vector mark;
- approved strong-mint text token `#1F7865`;
- real `/login` and `/signup` calls to action;
- root route changed from the authenticated Study redirect to the public landing page;
- public landing rendered outside the existing authenticated application shell.

Explicitly not included:

- authentication-page redesign;
- signed-in `/home`;
- navigation-rail redesign;
- global production token migration;
- changes to authenticated feature pages, API behavior, or persistence.

Review next:

1. [`transformation/reports/PHASE_0A_ANGULAR_LANDING_IMPLEMENTATION.md`](./transformation/reports/PHASE_0A_ANGULAR_LANDING_IMPLEMENTATION.md)
2. the root route in the branch deployment or local Angular application;
3. desktop, tablet, and mobile composition;
4. sign-in and sign-up navigation behavior.

Do not merge the implementation pull request or begin auth/home visualization until the landing page has been visually reviewed and explicitly approved.
