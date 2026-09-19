# Visual Transformation Program

This file is the stable entry point for ChatGPT, Copilot, Codex, and human sessions working on the product-wide visual transformation.

## Current checkpoint

The Visual Transformation Program is complete as of 2026-08-11. Phase 1 shell/entry-point work, Phase 2 representative workflows, VT-301 systematic rollout, and VT-302 source-verifiable polish are integrated on `main`.

The current authenticated route registry contains 35 guarded URL entries and 30 unique guarded route components. VT-302 PR #337 audited that current registry, standardized the remaining route-level generic async states on the shared state-message contract, removed the proven-orphaned global `.library-*` presentation namespace, and closed the identified source-verifiable transformation residuals. PR #337 was squash-merged as `11b22206173000fa29f3f9526eec926901c8808c`; its integrated squash passed post-merge `main` CI #2540 (`31457752774`). Documentation reconciliation PR #349 was then squash-merged as `37abcc6539fbeb3692d2ebc5976a6713d3032db7` after exact-head CI #2544 (`31458148632`) passed.

Program closure deliberately dispositions two remaining boundaries rather than claiming they passed:

- functional first-run/readiness/re-entry work remains owned by the separate Onboarding program (ONB-008/#193, ONB-009/#194, ONB-010/#195);
- authenticated browser, screen-reader, complete keyboard, zoom/reflow, rendered-contrast, representative-device, and the small Home elevation-normalization observations remain unobserved residual evidence.

Those items are follow-up/product-evidence concerns, not unfinished Visual Transformation implementation. They must never be rewritten as observed passes merely because this program is closed.

The authoritative integrated history, validation, and residual-risk disposition are in [`transformation/STATUS.md`](transformation/STATUS.md) and the focused reports under [`transformation/reports`](transformation/reports). The historical VT-301 route table remains in [`transformation/reports/VT_301_ROUTE_INVENTORY_AND_COMPLETION.md`](transformation/reports/VT_301_ROUTE_INVENTORY_AND_COMPLETION.md). GitHub issues #122 and #133 own the final completion state.

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

The Visual Transformation execution queue is closed. Issues #123–#133 constitute the completed program and must not be treated as an active deterministic task queue.

For future visual work:

1. do not reopen a completed transformation issue merely because a later product program changes the application;
2. create or explicitly reopen narrowly scoped executable work only when a concrete visual defect or approved follow-up exists;
3. preserve the production token, primitive, route-layout, accessibility, and evidence boundaries established by this program;
4. keep Onboarding-program work in its owning Onboarding issues rather than reclassifying it as VT-302;
5. continue to record unobserved manual evidence as unobserved unless it is actually performed.

## Delivery contract

Every meaningful future visual slice must:

- inspect and preserve the existing route, store/service, API, workflow, board, engine, persistence, and accessibility ownership unless the task explicitly changes it;
- use the approved production design-token and shared-primitive boundaries;
- avoid promoting feature-owned state or workflow components into generic presentation abstractions without evidence;
- update the relevant plan, decision, status, working-rule, and report records when their accepted contracts change;
- run the narrowest relevant checks and the required affected acceptance gates;
- record deferred browser evidence as deferred, never as an observed pass.

Do not revive the retired integration branch or bypass the normal issue/PR review model for later visual work.