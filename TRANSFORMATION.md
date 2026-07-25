# Visual Transformation Program

This file is the stable entry point for every ChatGPT, Copilot, Codex, or human session working on the product-wide visual transformation.

## Branch model

- Long-running integration branch: `visual_transformation`
- Base branch: `main`
- Do not commit transformation work directly to `main`.
- Substantial implementation slices may use short-lived branches created from `visual_transformation` and merged back into it.
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

The Phase 0A landing proof has been merged into `visual_transformation`, and a focused review refinement has been prepared. Production Angular implementation has not started.

Locked direction:

- Analytical, calm, product-led identity
- Graphite application chrome with clean light workspaces
- Mint as the primary signal/accent color
- Geometric **Node Branch** symbol representing repertoire continuations and training targets
- Three distinct experiences: public website, authentication, and signed-in application
- A new signed-in `/home` entry point rather than using Study/Train as the product home

Review next:

1. [`transformation/reports/PHASE_0A_REVIEW_REFINEMENT.md`](./transformation/reports/PHASE_0A_REVIEW_REFINEMENT.md)
2. [`transformation/prototypes/phase-0a-landing/review-sheet.svg`](./transformation/prototypes/phase-0a-landing/review-sheet.svg)
3. [`transformation/reports/PHASE_0A_LANDING_PROOF.md`](./transformation/reports/PHASE_0A_LANDING_PROOF.md)
4. [`transformation/prototypes/phase-0a-landing/`](./transformation/prototypes/phase-0a-landing/)

The next decision is to approve or revise the Phase 0A recommendations for mark geometry, the strong-mint text token, typography/wordmark proportions, and landing composition. Do not begin auth/home visualization or Phase 1 Angular implementation until that decision is explicit.
