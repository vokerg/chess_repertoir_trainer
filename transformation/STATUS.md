# Visual Transformation Status

Last updated: 2026-07-29

## Current state

**Program state:** Phase 2 is active; VT-201 Games, VT-202 Study, VT-203 Opening Analysis, and VT-204 proven shared primitives are complete. VT-205 final mobile-primary navigation is the next deterministic task.

**Integration target:** `main`

**Former integration branch:** `visual_transformation` is retired for new work

**Active checkpoint branch:** `visual-transformation/vt-204-completion-reconciliation`

**Active pull request:** PR #190 — VT-204 completion reconciliation

**Live execution queue:** [Visual Transformation Program issue #122](https://github.com/vokerg/chess_repertoir_trainer/issues/122)

Repository documents own integrated history, architecture, decisions, validation, residual risks, and reports. Issue #122 and child issues #123–#133 own live readiness, order, dependencies, claims, branches, pull requests, blockers, and completion state.

All transformation work uses short-lived branches from the current `main` head, pull requests to `main`, explicit approval, and squash merge. The former `visual_transformation` branch remains historical only.

## Integrated checkpoints

- [x] PR #78 — public landing page.
- [x] PR #79 — shared authentication shell.
- [x] PR #85 — Phase 0B reconciliation.
- [x] PR #86 — signed-in Home discovery.
- [x] PR #87 — signed-in Angular `/home` and post-auth fallback.
- [x] PR #88 — production Node Branch assets, favicon, and shared lockups.
- [x] PR #108 — desktop navigation discovery.
- [x] PR #112 — production navigation rail and disclosure correction.
- [x] PR #118 — Phase 1C integration-state reconciliation.
- [x] PR #120 — restrained public landing scroll reveal.
- [x] PR #134 — issue-driven execution queue and Phase 1D reconciliation.
- [x] PR #137 — expanded-rail inline navigation accordions with collapsed flyouts retained.
- [x] PRs #141–#144 — Home calibration, VT-101 completion, and queue reconciliation.
- [x] PR #155 — main-based transformation delivery correction.
- [x] PR #158 — production tokens, typography, shared visual foundations, and wide workspace correction.
- [x] PR #161 — VT-103 integration reconciliation.
- [x] PR #162 — evidence-bounded Phase 1 browser disposition and local auth return-URL correction.
- [x] PR #165 — VT-104 integration reconciliation.
- [x] PR #167 — VT-201 Games modernization.
- [x] PR #176 — VT-201 completion reconciliation.
- [x] PR #178 — VT-202 Study modernization.
- [x] PR #180 — VT-202 completion reconciliation.
- [x] PR #183 — VT-203 Opening Analysis modernization.
- [x] PR #185 — VT-203 completion reconciliation.
- [x] PR #188 — VT-204 proven shared UI primitives, squash commit `ba45e1a0f1c300a3793cbf6e8d43dd6b5f40e616`.
- [ ] PR #190 — VT-204 completion reconciliation.

## Phase 1 completion

VT-101 through VT-104 established and validated:

- production navigation, inline desktop groups, collapsed flyouts, and grouped mobile access;
- Home palette and surface hierarchy;
- production `--ui-*` tokens and native typography;
- wider signed-in shell and Home caps;
- evidence-bounded public/auth/Home/brand/navigation browser disposition;
- local-development auth return-URL correction.

Phase 1 is complete for sequencing. Unreproduced browser permutations remain documented risks rather than passes.

## VT-201 integrated checkpoint

Issue #127 is complete through PR #167, squash commit `99cf2bf805b7db846e16c651590bb3fcd2af82ee`, and reconciliation PR #176, commit `f6c74a6cda7cbe875c500231b6dcea3bb1b30559`.

Games retained its lazy route, URL/filter contract, typed API/store ownership, cursor pagination, durable job ownership, semantic desktop table, and existing commands. The workflow gained production-token filter/result presentation and responsive analytical evidence cards.

## VT-202 integrated checkpoint

Issue #128 is complete through PR #178, squash commit `c2a1e2531b6b8dca3c6ee9a5347d73d484c9231f`, and reconciliation PR #180, commit `c2491d445d71678f03aff09545b0879b7c1f314a`.

Study retained route, store, typed API, selection, eligibility, marathon navigation, and mobile-launcher ownership. The workflow gained explicit repertoire → section → lines → training-plan hierarchy, derived context, accessible line selection, and separated scope/mode presentation.

The user approved integration without direct browser review. Feedback remains deferred and is not represented as observed validation.

## VT-203 integrated checkpoint

Issue #129 is complete through PR #183, squash commit `3f84b0203e25ba7b63b4daeadbaacf8f90c4d41d`, and reconciliation PR #185, commit `085d6902a4b43c52318d3f918fdcc19227624d03`.

Opening Analysis now composes through the shared analysis workbench while retaining route, store, typed API, board, engine, filters, position history, stale-response handling, widget state, and navigation ownership. It also gained derived position context and a feature-scoped production-role bridge.

The user approved integration without direct browser review. Feedback remains deferred and is not represented as observed validation.

## VT-204 integrated checkpoint

Issue #130 is complete in application code through squash-merged PR #188, commit `ba45e1a0f1c300a3793cbf6e8d43dd6b5f40e616`. Completion reconciliation is proceeding through PR #190.

Delivered:

- promoted `app-context-strip` after compatible use was proven by Study and Opening Analysis;
- promoted `app-fact-grid` after compatible use was proven by Games responsive cards and Study line health;
- retained feature-owned source signals, DTOs, formatting, status, commands, navigation, selection, and workflow state;
- retained `app-page-header`, `app-panel`, and shell actions as the existing shared shell/action layer;
- removed duplicated context and fact markup/styles from four consumers;
- added focused shared-component tests and affected consumer coverage;
- documented the contracts in Angular architecture, patterns, migration, token, decision, and implementation records.

The shared boundary is intentionally narrow:

- `UiContextItem` contains stable id, label, value, optional marker, and optional mono presentation;
- `UiFactItem` contains stable id, label, value, and optional mono presentation;
- the shared components render semantic `dl`/`dt`/`dd` presentation only;
- they contain no feature imports, output commands, router, HTTP, store access, or workflow state.

The following remain feature-owned:

- Games responsive-card hierarchy, filter presentation, result states, pagination, actions, and durable job state;
- Study numbered workflow headers, training-plan scope/mode controls, asymmetric basket facts, mobile launcher, eligibility, and navigation;
- Opening Analysis workbench slots, evidence hierarchy, analytical toggle state, board/engine behavior, and legacy-role bridge.

See `transformation/reports/VT_204_SHARED_PRIMITIVES.md`, `transformation/reports/VT_204_SHARED_PRIMITIVES_COMPLETION.md`, and D-026 in `transformation/DECISIONS.md`.

## Deferred representative-workflow browser feedback

The user explicitly approved VT-202, VT-203, and VT-204 without direct browser review and will provide feedback later in one consolidated pass.

Deferred evidence includes:

- Games responsive fact layouts, long values, active job states, focus, and reduced motion;
- Study selection context, line facts, long labels, selected states, and independent row/checkbox/action intents;
- Opening Analysis segmented context, dynamic perspective/filter/tool updates, responsive layouts, and unchanged workbench/board/engine composition;
- the wider Study and Opening Analysis checklists retained in their completion reports.

These are deferred product-review inputs, not blockers and not observed passes.

## Execution disposition

Issues #123–#130 are complete in implementation terms. Issue #130 closes after PR #190 is green and squash-merged.

Issue #131 / VT-205 is `READY` and becomes the next deterministic task after reconciliation. Issue #132 remains blocked by the completion of #130 until the live queue is reconciled; issue #133 remains blocked by #132.

## Validation status

### Prior checkpoints

- Phase 1D CI #1045, #1047, and integration CI #1051 passed.
- VT-000 final-head CI #1072 passed.
- VT-101 CI #1112, #1118, #1128, and #1140 passed.
- VT-102 CI #1145 and #1152 passed.
- Main-delivery correction CI #1227 passed.
- VT-103 CI #1240, #1245, #1253, #1257, #1262, and reconciliation CI #1266 passed.
- VT-104 CI #1270, #1273, and reconciliation CI #1277 passed.
- VT-201 CI #1282, #1288, #1289, #1299, and reconciliation CI #1327 passed.
- VT-202 CI #1372, #1374, and reconciliation CI #1379 passed.
- VT-203 CI #1392, #1394, and reconciliation CI #1419 passed.

### VT-204 validation

CI #1425 and CI #1432 passed the complete repository workflow:

- dependency installation;
- lint;
- full repository build and Angular template/type compilation;
- opening classification audit;
- architecture guardrails;
- database migrations;
- imported-game opening classification audit;
- complete repository test suite, including the new shared-component and affected consumer tests.

PR #190 receives the normal reconciliation CI before squash merge.

## Open design and product decisions

The decision log remains canonical. Current downstream owners are:

- #131 — final mobile-primary navigation using representative workflow evidence;
- #132 — remaining-page and Labs rollout using the proven token, shell, context, fact, and feature-owned patterns;
- #133 — onboarding, empty-state, accessibility, and responsive polish after rollout.

D-026 locks the evidence-based shared boundary. Future tasks may consume `app-context-strip` and `app-fact-grid` but must not broaden their contracts speculatively.

## Program phase state

### Phase 0 — identity and visual proof

Core implementations are integrated. Remaining direct rendering permutations are documented risks.

### Phase 1 — shell and entry points

Complete and integrated.

### Phase 2 — representative workflows

VT-201 through VT-204 are integrated. VT-204 completion reconciliation is active through PR #190. VT-205 final mobile-primary navigation follows next.

### Phase 3 — rollout and polish

Remaining-page rollout and onboarding/accessibility/responsive polish remain represented by issues #132 and #133.

## Session log

### 2026-07-29 — VT-204 integration

- Selected and claimed issue #130 after VT-203 completion.
- Compared actual Games, Study, Opening Analysis, and existing shared UI implementations.
- Promoted only context-strip and fact-grid contracts, each with at least two compatible consumers.
- Retained all domain-specific candidates in their owning features.
- CI #1425 and #1432 passed the complete repository workflow.
- The user explicitly approved without direct browser review and deferred feedback to a consolidated later pass.
- Squash-merged PR #188 into `main` as `ba45e1a0f1c300a3793cbf6e8d43dd6b5f40e616`.
- Opened completion reconciliation PR #190 and released VT-205 as the next ordered task after reconciliation.

### Earlier integrated checkpoints

PRs #78, #79, #85, #86, #87, #88, #108, #112, #118, #120, #134, #137, #141–#144, #155, #158, #161, #162, #165, #167, #176, #178, #180, #183, #185, and #188 are integrated into `main`.
