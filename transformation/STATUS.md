# Visual Transformation Status

Last updated: 2026-07-29

## Current state

**Program state:** Phase 2 is active; VT-201 Games, VT-202 Study, and VT-203 Opening Analysis are complete, and VT-204 proven shared primitives is in progress

**Integration target:** `main`

**Former integration branch:** `visual_transformation` is retired for new work

**Active checkpoint branch:** `visual-transformation/vt-204-shared-primitives`

**Active pull request:** draft PR #188

**Live execution queue:** [Visual Transformation Program issue #122](https://github.com/vokerg/chess_repertoir_trainer/issues/122)

Repository documents retain integrated history, visual direction, decisions, residual risks, meaningful review checkpoints, and reports. Issue #122 and child issues #123–#133 remain authoritative for live priority, order, readiness, dependencies, claim, branch, pull request, blockers, and completion state.

All visual-transformation tasks use short-lived branches from the current `main` head, open pull requests against `main`, and reach `main` through approved squash merge. Historical reports may describe the former `visual_transformation` branch because that was the delivery model at the time; those records do not authorize new work against the retired branch.

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
- [x] PR #134 — issue-driven execution queue and Phase 1D integration reconciliation.
- [x] PR #137 — expanded-rail inline navigation accordions with collapsed-rail flyouts retained.
- [x] PRs #142–#144 — VT-101 completion and concurrent VT-102 queue reconciliation.
- [x] PR #141 — signed-in Home canvas and surface calibration.
- [x] PR #155 — main-based transformation delivery correction.
- [x] PR #158 — production tokens, typography, shared visual foundations, and wide signed-in workspace correction.
- [x] PR #161 — VT-103 integration and queue reconciliation.
- [x] PR #162 — evidence-bounded Phase 1 browser disposition and local-development auth return-URL correction.
- [x] PR #165 — VT-104 integration and queue reconciliation.
- [x] PR #167 — VT-201 Games modernization.
- [x] PR #176 — VT-201 completion reconciliation.
- [x] PR #178 — VT-202 Study modernization.
- [x] PR #180 — VT-202 completion reconciliation.
- [x] PR #183 — VT-203 Opening Analysis modernization.
- [x] PR #185 — VT-203 completion reconciliation.

## Phase 1 completion

VT-101 through VT-104 established and validated:

- production navigation, inline desktop groups, collapsed flyouts, and grouped mobile access;
- Home palette and surface hierarchy;
- production `--ui-*` tokens and native typography;
- wider signed-in shell and Home caps;
- evidence-bounded public/auth/Home/brand/navigation browser disposition;
- local-development auth return-URL correction.

Phase 1 is complete for transformation sequencing. Explicit browser permutations that could not be reproduced remain documented in `VT_104_SHELL_BROWSER_VALIDATION.md` as risks rather than passes.

## VT-201 integrated checkpoint

Issue #127 is complete through squash-merged PR #167, commit `99cf2bf805b7db846e16c651590bb3fcd2af82ee`, and reconciliation PR #176, commit `f6c74a6cda7cbe875c500231b6dcea3bb1b30559`.

Delivered:

- retained the lazy `/games` route and current URL query contract;
- added a clearer evidence-set and filter-workspace hierarchy;
- added an explicit Games-only `explorer` presentation to the shared game filter;
- migrated Games filters, results, statuses, actions, loading, empty, error, and pagination surfaces to production roles;
- retained the semantic desktop table and every existing action binding;
- added responsive evidence cards retaining the full analytical result context;
- aligned responsive thresholds with shared 980px and 640px contracts;
- documented feature-local extraction candidates for VT-204;
- passed implementation and reconciliation CI;
- received explicit approval and squash-merged into `main`.

No backend, API, schema, database, job-processing, game-analysis algorithm, Study, Opening Analysis, or Game Detail change was included.

## VT-202 integrated checkpoint

Issue #128 is complete through squash-merged PR #178, commit `c2a1e2531b6b8dca3c6ee9a5347d73d484c9231f`, and reconciliation PR #180, commit `c2491d445d71678f03aff09545b0879b7c1f314a`.

Delivered:

- retained `/library`, marathon, deep-link, store, API, selection, eligibility, and navigation ownership;
- made the repertoire → section → lines → training-plan progression explicit;
- added derived selection context without duplicate state;
- migrated desktop and mobile Study surfaces to production roles;
- added keyboard-focusable line selection while retaining marathon selection and Train/Edit links;
- separated training scope from training mode without changing emitted commands;
- preserved the course-first mobile launcher workflow;
- documented feature-local VT-204 candidates;
- passed implementation and reconciliation CI;
- received explicit approval and squash-merged into `main`.

The user approved integration without performing the direct browser checklist. Browser feedback is intentionally deferred for a later consolidated review and is not represented as observed validation. See `transformation/reports/VT_202_STUDY_COMPLETION.md`.

## VT-203 integrated checkpoint

Issue #129 is complete through squash-merged PR #183, commit `3f84b0203e25ba7b63b4daeadbaacf8f90c4d41d`, and reconciliation PR #185, commit `085d6902a4b43c52318d3f918fdcc19227624d03`.

Delivered:

- replaced the page-local board/side grid with the existing `AnalysisWorkbenchComponent`;
- retained `OpeningAnalysisStore`, `PositionGameMovesApiService`, and `AnalysisBoardComponent` ownership boundaries;
- projected current line, course suggestions, performance, next moves, Masters, Peers, opening breakdowns, and recent games through established workbench slots;
- added derived line, perspective, filter-summary, and visible-tool context without duplicate state;
- mapped shared analytical compatibility roles to production values only inside Opening Analysis;
- aligned responsive composition with shared 980px and 640px thresholds;
- documented VT-204 candidates;
- passed implementation and reconciliation CI;
- received explicit approval and squash-merged into `main`.

The user approved integration without performing the direct browser checklist. Browser feedback is intentionally deferred for a later consolidated review and is not represented as observed validation. See `transformation/reports/VT_203_OPENING_ANALYSIS_COMPLETION.md`.

## VT-204 active checkpoint

Issue #130 is active through draft PR #188 on `visual-transformation/vt-204-shared-primitives`.

Comparison result:

- [x] promoted `app-context-strip` after compatible use was proven by Study and Opening Analysis;
- [x] promoted `app-fact-grid` after compatible use was proven by Games responsive cards and Study line health;
- [x] kept source signals, DTOs, formatting, status, commands, navigation, and workflow ownership in each feature;
- [x] retained existing `app-page-header`, `app-panel`, and shell-action contracts rather than adding another shell/card/action layer;
- [x] retained Games cards/filter modes, Study workflow headers/training plan/mobile launcher, and Opening workbench/evidence/compatibility bridge as feature-owned patterns;
- [x] added focused shared-component tests and updated the affected Study consumer test;
- [x] documented the shared contracts in Angular architecture, patterns, migration, token, and decision records;
- [x] passed implementation-head CI #1425;
- [ ] pass exact documentation-head CI;
- [ ] direct browser regression review and explicit approval;
- [ ] squash merge and completion reconciliation.

No backend, API, contract, schema, database, route, store, engine, training, imported-game job, mobile-navigation, or dependency change is included.

## VT-204 shared boundary

The promoted components are presentational only:

- `UiContextItem` contains stable id, label, value, optional marker, and optional mono presentation;
- `UiFactItem` contains stable id, label, value, and optional mono presentation;
- features compute item arrays from existing source state;
- shared components render semantic `dl`/`dt`/`dd` markup and production-token layouts;
- shared components contain no output commands, router, HTTP, feature imports, or store access.

The following remain intentionally feature-local:

- Games responsive-card hierarchy, filter presentation, result states, and pagination;
- Study numbered section headers, training-plan scope/mode controls, asymmetric basket stats, and mobile launcher;
- Opening Analysis workbench slots, primary/secondary evidence hierarchy, analytical toggles, and legacy-role bridge.

See `transformation/reports/VT_204_SHARED_PRIMITIVES.md` and D-026 in `transformation/DECISIONS.md`.

## Deferred representative-workflow browser feedback

Study and Opening Analysis were explicitly approved without direct browser review. Their detailed checklists remain in:

- `transformation/reports/VT_202_STUDY_COMPLETION.md`;
- `transformation/reports/VT_203_OPENING_ANALYSIS_COMPLETION.md`.

VT-204 requires regression review of the newly shared context and fact presentation in Games, Study, and Opening Analysis. This does not retroactively represent the wider deferred workflow checklists as observed validation.

## Execution disposition

Issues #123–#129 are complete.

Issue #130 is `IN_PROGRESS` through draft PR #188. Issue #131 remains `READY` but must not be selected while the lower-order VT-204 task is actively claimed. Issues #132–#133 retain their downstream dependencies.

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

Implementation-head CI #1425 passed:

- dependency installation;
- lint;
- full repository build and Angular template/type compilation;
- opening classification audit;
- architecture guardrails;
- database migrations;
- imported-game opening classification audit;
- complete repository test suite, including new shared-component and affected consumer tests.

The exact documentation head must pass the same complete workflow. Direct browser regression review remains pending. The active task must not be merged before explicit approval.

## Open design and product decisions

The decision log remains canonical. Current downstream owners include:

- #131 — decide final mobile-primary navigation using representative workflow evidence;
- #132 — apply the proven token, shell, context, fact, and feature-owned workflow patterns to remaining pages and Labs;
- #133 — onboarding, empty-state, accessibility, and responsive polish after rollout.

D-026 locks the evidence-based shared boundary. Future tasks may consume `app-context-strip` and `app-fact-grid`, but must not broaden their contracts speculatively.

## Program phase state

### Phase 0 — identity and visual proof

Core implementations are integrated. Remaining direct rendering permutations are documented risks rather than blockers.

### Phase 1 — shell and entry points

Complete and integrated.

### Phase 2 — representative workflows

Active. Games, Study, and Opening Analysis are complete and integrated. VT-204 is extracting the two proven shared presentation contracts through draft PR #188. VT-205 follows after VT-204 completion.

### Phase 3 — rollout and polish

Remaining-page rollout and onboarding/accessibility/responsive polish remain represented by issues #132 and #133.

## Session log

### 2026-07-29 — VT-204 proven shared primitives

- Selected and claimed issue #130 after VT-203 completion.
- Inspected the governing Angular guidance, transformation decisions/status, all three representative implementation reports, existing shared page/panel/action components, and the actual Games, Study, and Opening Analysis consumers.
- Promoted only context-strip and fact-grid contracts because each had at least two compatible implemented consumers.
- Migrated Study and Opening Analysis context plus Games and Study fact evidence without changing source state or commands.
- Explicitly retained domain-specific candidate patterns in their owning features.
- Added focused shared-component tests and updated architecture, migration, token, decision, and implementation records.
- Implementation-head CI #1425 passed the complete repository workflow.
- Opened draft PR #188; exact documentation-head CI and direct browser regression review remain pending.

### 2026-07-29 — VT-203 integration

- Reused the shared analysis workbench without changing Opening Analysis ownership.
- CI #1392 and #1394 passed.
- Received explicit approval without direct browser review and reconciled completion through PR #185.

### 2026-07-29 — VT-202 integration

- Implemented explicit Study selection progression without changing route, store, API, or training ownership.
- CI #1372 and #1374 passed.
- Received explicit approval without direct browser review and reconciled completion through PR #180.

### 2026-07-29 — VT-201 integration

- Implemented the Games production-token filter presentation and responsive analytical result cards without changing ownership or behavior.
- CI #1282, #1288, #1289, and #1299 passed.
- Received explicit approval, squash-merged PR #167, and reconciled completion through PR #176.

### Earlier integrated checkpoints

PRs #78, #79, #85, #86, #87, #88, #108, #112, #118, #120, #134, #137, #141–#144, #155, #158, #161, #162, #165, #167, #176, #178, #180, #183, and #185 are integrated into `main`.
