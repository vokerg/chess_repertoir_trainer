# Visual Transformation Status

Last updated: 2026-07-29

## Current state

**Program state:** Phase 2 is active; VT-201 Games and VT-202 Study are complete, and VT-203 Opening Analysis is in progress

**Integration target:** `main`

**Former integration branch:** `visual_transformation` is retired for new work

**Active checkpoint branch:** `visual-transformation/vt-203-opening-analysis-modernization`

**Active pull request:** draft PR #183

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

- [x] retained the lazy `/games` route and current URL query contract;
- [x] added a clearer evidence-set and filter-workspace hierarchy;
- [x] added an explicit Games-only `explorer` presentation to the shared game filter;
- [x] migrated Games filters, results, statuses, action overlay, loading, empty, error, and pagination surfaces to production `--ui-*` roles;
- [x] retained the semantic desktop table and every existing action binding;
- [x] added responsive evidence cards retaining players, date, opening, control, user accuracy, analysis state, ply-index state, review link, and row actions;
- [x] aligned responsive thresholds with shared 980px and 640px breakpoint contracts;
- [x] added focused responsive-card and loaded-result tests;
- [x] documented feature-local extraction candidates for VT-204;
- [x] passed CI #1282, #1288, #1289, #1299, and reconciliation CI #1327;
- [x] received explicit approval and squash-merged into `main`.

No backend, API, schema, database, job-processing, game-analysis algorithm, Study, Opening Analysis, or Game Detail change was included.

## VT-202 integrated checkpoint

Issue #128 is complete through squash-merged PR #178, commit `c2a1e2531b6b8dca3c6ee9a5347d73d484c9231f`, and reconciliation PR #180, commit `c2491d445d71678f03aff09545b0879b7c1f314a`.

Delivered:

- [x] verified `/library`, page, store, data-access, presentational-component, mobile-launcher, and marathon-navigation ownership before implementation;
- [x] retained the lazy `/library` route, selected-lines `/library/marathon` route, course/chapter marathon routes, and direct line Train/Edit destinations;
- [x] retained `LibraryBrowserStore` workflow and navigation ownership;
- [x] retained `LibraryApiService` HTTP ownership;
- [x] made the desktop repertoire → section → lines → training-plan progression explicit;
- [x] added derived current-selection context and restrained page-header stats without duplicate state;
- [x] migrated the Study page, scope lists, line list, basket, status surfaces, and mobile launcher to production `--ui-*` roles;
- [x] added keyboard-focusable line selection while retaining independent marathon checkbox selection and Train/Edit links;
- [x] separated training scope from training mode without changing emitted commands;
- [x] preserved the course-first mobile entry and feature-local launcher contract;
- [x] added focused line-list, basket, and mobile-launcher component coverage;
- [x] documented architecture, preserved behavior, deferred browser checks, and feature-local VT-204 candidates;
- [x] passed final implementation CI #1372, exact reviewable-head CI #1374, and reconciliation CI #1379;
- [x] received explicit approval and squash-merged into `main`.

The user approved integration without performing the direct browser checklist. Browser feedback is intentionally deferred for a later consolidated review and is not represented as observed validation. See `transformation/reports/VT_202_STUDY_COMPLETION.md`.

No backend, API, contract, schema, database, course-ownership, training-algorithm, Games, Opening Analysis, or final mobile-navigation change was included.

## Deferred Study browser feedback

The following checklist remains useful for later consolidated product feedback, but it is not a blocker to the completed VT-202 integration:

- repertoire → section → line → training-plan hierarchy;
- search, review-only filtering, select-visible, and individual selected-line behavior;
- course, section, and selected-lines scope switching;
- All, Weak, and Untrained eligibility and navigation;
- long repertoire, section, and line labels;
- empty catalog, empty section, empty line, loading, and error states where reproducible;
- basket wrapping at the feature-owned 1100px threshold;
- line facts and direct actions at narrower widths;
- course-first mobile entry and launcher open/close/focus return;
- Repertoire, Section, and Line launcher scopes;
- single-line marathon launch;
- keyboard focus, Escape/backdrop closure, and reduced motion.

Unavailable states must be recorded explicitly rather than treated as observed.

## VT-203 active checkpoint

Issue #129 is active through draft PR #183 on `visual-transformation/vt-203-opening-analysis-modernization`.

Delivered on the active branch:

- [x] verified guarded lazy route, page, store, typed HTTP service, shared workbench, shared board, feature evidence widgets, engine, filters, and responsive ownership before implementation;
- [x] replaced the page-local board/side grid with the existing shared `AnalysisWorkbenchComponent`;
- [x] retained `OpeningAnalysisStore` ownership of position history, filters, perspective, widget visibility, stale-request handling, engine lifecycle, and navigation;
- [x] retained `PositionGameMovesApiService` typed HTTP ownership;
- [x] projected current line, course suggestions, performance, next moves, Masters, Peers, opening breakdowns, and recent games through established workbench slots;
- [x] kept the shared `AnalysisBoardComponent` as the single board, toolbar, evaluation-bar, engine-arrow, and Stockfish-panel composition;
- [x] added a derived position-context strip for current line, perspective, filter evidence, and visible-tool count without duplicate state;
- [x] retained header toggle order and every existing store command;
- [x] mapped shared analytical compatibility variables to production roles only inside Opening Analysis rather than changing unrelated consumers;
- [x] aligned responsive composition with the shared 980px workbench and 640px compact thresholds;
- [x] added focused context-derivation coverage;
- [x] documented architecture, preserved behavior, browser checks, and feature-local VT-204 candidates in `transformation/reports/VT_203_OPENING_ANALYSIS_MODERNIZATION.md`;
- [x] passed implementation-head CI #1392 after focused test-harness corrections;
- [ ] pass exact final documentation-head CI;
- [ ] direct browser review and explicit approval;
- [ ] squash merge and completion reconciliation.

No backend, API, contract, schema, database, engine-algorithm, imported-game-filter, Games, Study, dependency, or final mobile-navigation change is included.

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

## VT-203 browser review required

Review `/opening-analysis` with realistic indexed-game data at desktop, tablet, compact, and narrow-phone widths:

- shared board/workbench hierarchy and board width;
- engine shown and hidden, evaluation bar, arrow, and Stockfish panel;
- White and Black filter perspectives;
- Left-arrow and Home shortcuts outside form controls;
- next-move selection and resulting FEN/history/context updates;
- collapsed and expanded filters, apply, reset, and refresh;
- Tags, Masters, Peers, Last games, and Engine toggles independently and in dense combinations;
- course move, opening breakdown, performance tag, Masters, and Peers move selection;
- long line, opening, player, and filter-summary labels;
- loading, error, empty, placeholder, and long-list states where reproducible;
- 980px workbench stacking and 640px compact context stacking;
- keyboard focus and reduced motion.

Unavailable states must be recorded explicitly rather than treated as observed.

## Execution disposition

Issues #123–#128 are complete.

Issue #129 is `IN_PROGRESS` through draft PR #183. Issues #130 and #131 remain blocked by #129. Issues #132–#133 retain their downstream dependencies.

## Validation status

### Prior checkpoints

- Phase 1D CI #1045, #1047, and integration CI #1051 passed.
- VT-000 final-head CI #1072 passed.
- VT-101 CI #1112, #1118, #1128, and #1140 passed.
- VT-102 CI #1145 and #1152 passed.
- Main-delivery correction CI #1227 passed.
- VT-103 CI #1240, #1245, #1253, #1257, and #1262 passed.
- VT-103 reconciliation CI #1266 passed.
- VT-104 corrected/final/reconciliation CI #1270, #1273, and #1277 passed.
- VT-201 CI #1282, #1288, #1289, #1299, and reconciliation CI #1327 passed.
- VT-202 CI #1372, #1374, and reconciliation CI #1379 passed.

### VT-203 validation

Implementation-head CI #1392 passed:

- dependency installation;
- lint;
- full repository build and Angular template/type compilation;
- opening classification audit;
- architecture guardrails;
- database migrations;
- imported-game opening classification audit;
- complete repository test suite, including the Opening Analysis page tests.

CI #1389 and #1391 exposed focused-test typing and expected-default issues only. Both corrections were confined to the spec; no production code changed.

The exact final documentation head must pass the same complete workflow. Direct browser review remains pending. The active task must not be merged before explicit approval.

## Open design and product decisions

The decision log remains canonical. Current downstream owners include:

- #130 — compare Games, Study, and Opening Analysis evidence and extract only proven shared primitives;
- #131 — final mobile-primary navigation after representative mobile evidence exists.

The Games dense-filter/evidence-card patterns, Study workflow patterns, and Opening Analysis shared-workbench slot composition, position-context strip, evidence-stack hierarchy, feature-scoped compatibility bridge, and header-owned toggles remain candidates until VT-204 compares all three representative workflows.

## Program phase state

### Phase 0 — identity and visual proof

Core implementations are integrated. Remaining direct rendering permutations are documented risks rather than blockers.

### Phase 1 — shell and entry points

Complete and integrated.

### Phase 2 — representative workflows

Active. Games and Study are complete and integrated. Opening Analysis is in progress through draft PR #183.

### Phase 3 — rollout and polish

Remaining-page rollout and onboarding/accessibility/responsive polish remain represented by issues #132 and #133.

## Session log

### 2026-07-29 — VT-203 Opening Analysis modernization

- Selected issue #129 as the next deterministic task after VT-202 completion.
- Claimed the issue and branched from current `main`.
- Inspected the Opening Analysis route, page, store, typed API service, shared workbench, shared board, Free Analysis composition, evidence widgets, engine behavior, tests, breakpoints, token contract, and transformation rules.
- Verified that Opening Analysis recreated a page-local board/side layout while the shared workbench already owned the intended board/engine/responsive composition.
- Recomposed Opening Analysis through `AnalysisWorkbenchComponent` slots without changing store, API, board, engine, filter, or navigation ownership.
- Added derived position context and a feature-scoped production-role bridge for existing shared analytical widgets.
- Added focused context coverage and corrected read-only-signal/default-filter expectations exposed by CI; no production code changed in those corrections.
- Implementation-head CI #1392 passed the complete repository workflow.
- Opened draft PR #183 and documented the architecture, behavior boundary, VT-204 candidates, and browser-review checklist.
- Awaiting final documentation-head CI, direct browser review, and explicit approval.

### 2026-07-29 — VT-202 integration

- Claimed issue #128 and implemented explicit Study selection progression without changing route, store, API, or training ownership.
- CI #1372 and #1374 passed the complete repository workflow.
- Received explicit approval without direct browser review; browser feedback was deferred for later consolidated review.
- Squash-merged PR #178 and reconciled completion through PR #180.
- Released VT-203 / issue #129 as the next ordered ready task.

### 2026-07-29 — VT-201 integration

- Claimed issue #127 and implemented a Games-only production-token filter presentation and responsive analytical result cards without changing ownership or behavior.
- Added focused responsive-card tests and corrected the malformed result subtitle.
- Opened PR #167 and passed CI #1282, #1288, #1289, and #1299.
- Received explicit approval and squash-merged PR #167 into `main`.
- Reconciled completion through PR #176.

### Earlier integrated checkpoints

PRs #78, #79, #85, #86, #87, #88, #108, #112, #118, #120, #134, #137, #142, #143, #144, #141, #155, #158, #161, #162, #165, #167, #176, #178, and #180 are integrated into `main`.
