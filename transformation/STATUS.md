# Visual Transformation Status

Last updated: 2026-07-29

## Current state

**Program state:** Phase 2 is active; VT-201 Games modernization is complete and VT-202 Study modernization is in progress

**Integration target:** `main`

**Former integration branch:** `visual_transformation` is retired for new work

**Active checkpoint branch:** `visual-transformation/vt-202-study-modernization`

**Active pull request:** draft PR #178

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

## VT-202 active checkpoint

Issue #128 is active through draft PR #178 on `visual-transformation/vt-202-study-modernization`.

Delivered on the active branch:

- [x] verified `/library`, page, store, data-access, presentational-component, mobile-launcher, and marathon-navigation ownership before implementation;
- [x] retained the lazy `/library` route, selected-lines `/library/marathon` route, course/chapter marathon routes, and direct line Train/Edit destinations;
- [x] retained `LibraryBrowserStore` ownership of catalog loading, filters, selected course/chapter/line state, selected-line ids, scope fallback, eligibility, and all training navigation;
- [x] retained `LibraryApiService` HTTP ownership;
- [x] made the desktop repertoire → section → lines → training-plan progression explicit;
- [x] added derived current-selection context and restrained page-header stats without duplicate state;
- [x] migrated the Study page, scope lists, line list, basket, status surfaces, and mobile launcher to production `--ui-*` roles;
- [x] replaced mouse-only line-row selection with a keyboard-focusable selection button while retaining independent marathon checkbox selection and Train/Edit links;
- [x] separated training scope from training mode without changing the emitted `{ mode, scope }` command;
- [x] preserved the course-first mobile entry and feature-local launcher contract;
- [x] added focused line-list, basket, and mobile-launcher component coverage;
- [x] documented architecture, behavior preservation, browser checks, and feature-local VT-204 candidates in `transformation/reports/VT_202_STUDY_MODERNIZATION.md`;
- [x] passed final-head CI #1372 after focused test-harness corrections;
- [ ] direct browser review and explicit approval;
- [ ] squash merge and completion reconciliation.

No backend, API, contract, schema, database, course-ownership, training-algorithm, Games, Opening Analysis, or final mobile-navigation change is included.

## VT-202 behavior boundary

The following remain unchanged:

- guarded lazy `/library` route and existing marathon/deep-link destinations;
- initial catalog load and default course/chapter/line selection;
- selected-id guards for stale course/chapter workflows;
- search and review-only filtering;
- course, chapter, line, and selected-line-id state;
- course/chapter selection reset behavior;
- selected-lines scope activation and fallback behavior;
- select-visible behavior;
- course, chapter, selected-lines, and single-line marathon navigation;
- All, Weak, and Untrained mode semantics and eligibility;
- direct line Train and Edit destinations;
- `LibraryBrowserStore` workflow ownership;
- `LibraryApiService` typed HTTP ownership.

## VT-202 browser review required

Review `/library` with realistic data at desktop, tablet, and narrow-phone widths:

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

## Execution disposition

Issues #123–#127 are complete.

Issue #128 is `IN_PROGRESS` through draft PR #178. Issue #129 remains `READY` but cannot replace the active task. Issues #130–#133 retain their downstream dependencies.

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

### VT-202 validation

Final-head CI #1372 passed:

- dependency installation;
- lint;
- full repository build and Angular template/type compilation;
- opening classification audit;
- architecture guardrails;
- database migrations;
- imported-game opening classification audit;
- complete repository test suite, including the new Study component tests.

CI #1366 and #1370 exposed focused-test assertion and DOM-typing issues only. Those tests were corrected without production-code changes before the passing final-head run.

Direct browser review remains pending. The active task must not be represented as complete or merged before explicit approval.

## Open design and product decisions

The decision log remains canonical. Current downstream owners include:

- #129 — Opening Analysis workflow evidence;
- #130 — extraction of only the primitives proven across representative workflows;
- #131 — final mobile-primary navigation after representative mobile evidence exists.

The Games dense-filter/evidence-card patterns and Study numbered workflow header, selection-context strip, selectable analytical row, scope-versus-mode launch panel, and mobile launcher remain feature-local candidates until VT-204 compares all representative workflows.

## Program phase state

### Phase 0 — identity and visual proof

Core implementations are integrated. Remaining direct rendering permutations are documented risks rather than blockers.

### Phase 1 — shell and entry points

Complete and integrated.

### Phase 2 — representative workflows

Active. Games is complete and integrated. Study is automated-green through draft PR #178 and awaits browser review. Opening Analysis remains ready after Study.

### Phase 3 — rollout and polish

Remaining-page rollout and onboarding/accessibility/responsive polish remain represented by issues #132 and #133.

## Session log

### 2026-07-29 — VT-202 Study modernization

- Selected issue #128 as the next deterministic task after VT-201 completion.
- Claimed the issue and branched from reconciled `main`.
- Inspected the Study route, page, store, data-access service, scope lists, line list, basket, mobile launcher, helpers, breakpoints, focused architecture rules, token contract, and transformation decisions.
- Implemented explicit desktop selection progression, production-token presentation, keyboard line selection, clearer scope/mode launch hierarchy, and a migrated course-first mobile launcher without changing ownership or navigation.
- Added focused component coverage for line evidence/intents, basket eligibility/commands, and mobile single-line launch behavior.
- Corrected whitespace-sensitive and untyped DOM test assertions exposed by CI #1366 and #1370; no production code changed in those corrections.
- Final-head CI #1372 passed the complete repository workflow.
- Opened draft PR #178 and documented the implementation and browser-review boundary.
- Awaiting direct browser review and explicit approval.

### 2026-07-29 — VT-201 integration

- Claimed issue #127 and branched from reconciled `main`.
- Implemented a Games-only production-token filter presentation and responsive analytical result cards without changing ownership or behavior.
- Added focused responsive-card tests and corrected the malformed result subtitle.
- Opened PR #167 and passed CI #1282, #1288, #1289, and #1299.
- Received explicit approval and squash-merged PR #167 into `main` as `99cf2bf805b7db846e16c651590bb3fcd2af82ee`.
- Reconciled completion through PR #176.

### 2026-07-29 — VT-104 integration

- Final acceptance-head CI #1273 passed.
- Squash-merged PR #162 and reconciled through PR #165.
- Closed Phase 1 for transformation sequencing.

### Earlier integrated checkpoints

PRs #78, #79, #85, #86, #87, #88, #108, #112, #118, #120, #134, #137, #142, #143, #144, #141, #155, #158, #161, #162, #165, #167, and #176 are integrated into `main`.
