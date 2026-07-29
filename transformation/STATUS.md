# Visual Transformation Status

Last updated: 2026-07-29

## Current state

**Program state:** Phase 2 is active; VT-201 Games, VT-202 Study, and VT-203 Opening Analysis are complete, and VT-204 shared-primitives review is the next ordered ready task

**Integration target:** `main`

**Former integration branch:** `visual_transformation` is retired for new work

**Active checkpoint branch:** none

**Active pull request:** none

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

Issue #129 is complete through squash-merged PR #183, commit `3f84b0203e25ba7b63b4daeadbaacf8f90c4d41d`, and reconciliation PR #185.

Delivered:

- verified guarded lazy route, page, store, typed HTTP service, shared workbench, shared board, evidence widgets, engine, filters, and responsive ownership;
- replaced the page-local board/side grid with the existing `AnalysisWorkbenchComponent`;
- retained `OpeningAnalysisStore` ownership of position history, filters, perspective, widget state, stale-response handling, engine lifecycle, and navigation;
- retained `PositionGameMovesApiService` typed HTTP ownership;
- retained `AnalysisBoardComponent` as the single board, toolbar, evaluation-bar, engine-arrow, and Stockfish-panel composition;
- projected current line, course suggestions, performance, next moves, Masters, Peers, opening breakdowns, and recent games through established workbench slots;
- added derived line, perspective, filter-summary, and visible-tool context without duplicate state;
- mapped shared analytical compatibility roles to production values only inside Opening Analysis;
- aligned responsive composition with shared 980px and 640px thresholds;
- added focused context-derivation coverage;
- documented shared-workbench, context-strip, evidence-stack, compatibility-bridge, and header-toggle candidates for VT-204;
- passed implementation-head CI #1392 and exact documentation-head CI #1394;
- received explicit approval and squash-merged into `main`.

The user approved integration without performing the direct browser checklist. Browser feedback is intentionally deferred for a later consolidated review and is not represented as observed validation. See `transformation/reports/VT_203_OPENING_ANALYSIS_COMPLETION.md`.

No backend, API, contract, schema, database, engine-algorithm, imported-game-filter, Games, Study, dependency, or final mobile-navigation change was included.

## VT-203 behavior boundary

The following remain unchanged:

- guarded lazy `/opening-analysis` route;
- initial facets and exact-position analysis loading;
- default `blitz,rapid`, rated, White filters;
- imported-game filter model, query serialization, apply, reset, and refresh behavior;
- user-colour-derived board perspective and reset-on-perspective-change behavior;
- opening and tag filter selection;
- stale analysis, performance, top-game, and breakdown response rejection;
- current FEN, position history, line label, last move, and board version;
- board move and external suggestion/explorer move handling;
- previous/start navigation and keyboard shortcuts;
- engine start, stop, visibility, evaluation, best-move arrow, and worker ownership;
- Tags, Masters, Peers, Last games, and Engine defaults and toggles;
- lazy top-game and performance loading rules;
- free-analysis deep link and Lichess bot challenge command;
- `OpeningAnalysisStore` workflow ownership;
- `PositionGameMovesApiService` HTTP ownership.

## Deferred representative-workflow browser feedback

Study and Opening Analysis were explicitly approved without direct browser review. Their detailed checklists remain in:

- `transformation/reports/VT_202_STUDY_COMPLETION.md`;
- `transformation/reports/VT_203_OPENING_ANALYSIS_COMPLETION.md`.

The deferred feedback includes dense desktop and mobile hierarchy, long labels/lists, loading/error/empty states, selection/filter commands, board/engine states, responsive stacking, keyboard focus, and reduced motion. These are later consolidated product-review inputs, not blockers to the completed integrations.

## Execution disposition

Issues #123–#129 are complete.

Issues #130 and #131 are `READY` because all three representative workflows are integrated. Issue #130 / VT-204 is the next deterministic task because it has the lower numeric order. Issues #132–#133 retain their downstream dependencies.

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

### VT-203 validation

CI #1392 and CI #1394 passed:

- dependency installation;
- lint;
- full repository build and Angular template/type compilation;
- opening classification audit;
- architecture guardrails;
- database migrations;
- imported-game opening classification audit;
- complete repository test suite, including the Opening Analysis page tests.

CI #1389 and #1391 exposed focused-test typing and expected-default issues only. Both corrections were confined to the spec; no production code changed.

PR #185 is documentation/process-only and receives the repository's normal reconciliation CI before merge.

## Open design and product decisions

The decision log remains canonical. Current downstream owners include:

- #130 — compare Games, Study, and Opening Analysis evidence and extract only proven shared primitives;
- #131 — decide final mobile-primary navigation using representative workflow evidence.

The Games dense-filter/evidence-card patterns, Study workflow patterns, and Opening Analysis shared-workbench slot composition, position-context strip, evidence-stack hierarchy, feature-scoped compatibility bridge, and header-owned toggles remain candidates until VT-204 compares all three representative workflows.

## Program phase state

### Phase 0 — identity and visual proof

Core implementations are integrated. Remaining direct rendering permutations are documented risks rather than blockers.

### Phase 1 — shell and entry points

Complete and integrated.

### Phase 2 — representative workflows

Active. Games, Study, and Opening Analysis are complete and integrated. VT-204 now owns evidence-based extraction of proven shared primitives, followed by VT-205 final mobile-primary navigation.

### Phase 3 — rollout and polish

Remaining-page rollout and onboarding/accessibility/responsive polish remain represented by issues #132 and #133.

## Session log

### 2026-07-29 — VT-203 integration

- Selected and claimed issue #129 after VT-202 completion.
- Inspected Opening Analysis route, page, store, typed API service, shared workbench, shared board, Free Analysis composition, evidence widgets, engine behavior, tests, breakpoints, token contract, and transformation rules.
- Replaced the page-local board/side layout with shared workbench slot composition without changing store, API, board, engine, filter, or navigation ownership.
- Added derived position context and a feature-scoped production-role bridge.
- Corrected focused-spec read-only-signal and default-filter expectations; no production code changed in those corrections.
- CI #1392 and #1394 passed the complete repository workflow.
- The user explicitly approved without direct browser review and deferred feedback to a later consolidated pass.
- Squash-merged PR #183 into `main` as `3f84b0203e25ba7b63b4daeadbaacf8f90c4d41d`.
- Reconciled completion through PR #185 and released issues #130 and #131.
- VT-204 / issue #130 is the next deterministic task.

### 2026-07-29 — VT-202 integration

- Implemented explicit Study selection progression without changing route, store, API, or training ownership.
- CI #1372 and #1374 passed the complete repository workflow.
- Received explicit approval without direct browser review; browser feedback was deferred.
- Squash-merged PR #178 and reconciled completion through PR #180.

### 2026-07-29 — VT-201 integration

- Implemented the Games production-token filter presentation and responsive analytical result cards without changing ownership or behavior.
- CI #1282, #1288, #1289, and #1299 passed.
- Received explicit approval, squash-merged PR #167, and reconciled completion through PR #176.

### Earlier integrated checkpoints

PRs #78, #79, #85, #86, #87, #88, #108, #112, #118, #120, #134, #137, #141–#144, #155, #158, #161, #162, #165, #167, #176, #178, #180, #183, and #185 are integrated into `main`.
