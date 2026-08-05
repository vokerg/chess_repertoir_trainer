# Visual Transformation Program

This file is the stable entry point for ChatGPT, Copilot, Codex, and human sessions working on the product-wide visual transformation.

## Current checkpoint

Phase 3 is in progress. VT-301 page-family rollout batches through Tactical Detections are integrated into `main`. The remaining VT-301 work is an authenticated-route inventory reconciliation that classifies every remaining route as transformed, accepted debt, or later-program scope. VT-302 onboarding, empty-state, accessibility, and responsive polish remains blocked until VT-301 closes.

The authoritative current checkpoint, integrated history, validation, and residual risks are in [`transformation/STATUS.md`](transformation/STATUS.md). Do not copy a volatile “next task” from GitHub issues into this entry point.

## Branch and merge model

- Integration target: `main`.
- Create every meaningful slice from the current `main` head on a short-lived branch.
- Do not commit directly to `main`.
- Open pull requests against `main`.
- Refresh the task branch when concurrent integration moves the base.
- Do not merge without explicit approval.
- Always squash-merge into `main`; do not use merge commits or rebase merges.
- The former long-running `visual_transformation` branch is historical and retired for new work.

## Read before work

1. [`AGENTS.md`](AGENTS.md)
2. [Angular frontend skill](.agents/skills/angular-frontend/SKILL.md) for Angular work
3. [Angular architecture](docs/frontend/angular-architecture.md)
4. [Frontend design tokens](docs/frontend/design-tokens.md)
5. [`transformation/STATUS.md`](transformation/STATUS.md)
6. [`transformation/MASTER_PLAN.md`](transformation/MASTER_PLAN.md)
7. [`transformation/DECISIONS.md`](transformation/DECISIONS.md)
8. [`transformation/WORKING_RULES.md`](transformation/WORKING_RULES.md)
9. [Visual Transformation program issue #122](https://github.com/vokerg/chess_repertoir_trainer/issues/122)
10. the selected execution issue and current implementation it owns

Code and tests are the source of truth for runtime behavior. Repository transformation documents own visual direction, accepted architecture, decisions, validation, residual risks, and reports. GitHub issues own live readiness, order, dependencies, claims, branches, pull requests, blockers, and completion state.

## Task selection

Use issue #122 and its child issues:

1. consider only open issues whose repository state is `READY`;
2. exclude unresolved dependencies and already claimed work;
3. choose the highest priority and then the lowest numeric order;
4. comment to claim the issue before implementation;
5. create the recorded task branch from current `main`;
6. target the pull request at `main`;
7. keep claim, branch, PR, blocker, and completion state in the issue;
8. close only after approved squash merge and documentation reconciliation.

The exact ready task can change independently of this file. Resolve it from the live issue queue and `transformation/STATUS.md`.

## Delivery contract

Every meaningful transformation slice must:

- inspect and preserve the existing route, store/service, API, workflow, board, engine, persistence, and accessibility ownership unless the task explicitly changes it;
- use the approved production design-token and shared-primitive boundaries;
- avoid promoting feature-owned state or workflow components into generic presentation abstractions without evidence;
- update the relevant master plan, decision, status, working-rule, and report records;
- run the narrowest relevant checks and the required affected acceptance gates;
- record deferred browser evidence as deferred, never as an observed pass.

Do not bypass the issue queue, target the retired integration branch, or merge without explicit approval.
