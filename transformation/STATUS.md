# Visual Transformation Status

Last updated: 2026-07-29

## Current state

**Program state:** Phase 2 is active; VT-201 Games modernization awaits direct browser review

**Integration target:** `main`

**Former integration branch:** `visual_transformation` is retired for new work

**Active checkpoint branch:** `visual-transformation/vt-201-games-modernization`

**Active pull request:** draft PR #167

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

## Phase 1 completion

VT-101 through VT-104 established and validated:

- production navigation, inline desktop groups, collapsed flyouts, and grouped mobile access;
- Home palette and surface hierarchy;
- production `--ui-*` tokens and native typography;
- wider signed-in shell and Home caps;
- evidence-bounded public/auth/Home/brand/navigation browser disposition;
- local-development auth return-URL correction.

Phase 1 is complete for transformation sequencing. The explicit browser permutations that could not be reproduced remain documented in `VT_104_SHELL_BROWSER_VALIDATION.md` as risks rather than passes.

## VT-201 active checkpoint

Draft PR #167 modernizes Games as the representative data-exploration workflow.

Delivered on the active branch:

- [x] verified route/page/store/data-access/job ownership before implementation;
- [x] retained the lazy `/games` route and current URL query contract;
- [x] added a clearer evidence-set and filter-workspace hierarchy;
- [x] added an explicit Games-only `explorer` presentation to the shared game filter while leaving all other consumers on the default presentation;
- [x] migrated Games filters, results, statuses, action overlay, loading, empty, error, and pagination surfaces to production `--ui-*` roles;
- [x] retained the semantic desktop table and every existing action binding;
- [x] replaced the information-poor narrow representation with responsive evidence cards containing players, date, opening, control, user accuracy, analysis state, ply-index state, review link, and row actions;
- [x] aligned responsive thresholds with shared 980px and 640px breakpoint contracts;
- [x] corrected the malformed `more available` subtitle separator without changing pagination behavior;
- [x] added focused responsive-card and loaded-result tests;
- [x] documented feature-local extraction candidates for VT-204 in `transformation/reports/VT_201_GAMES_MODERNIZATION.md`;
- [x] implementation-head CI #1282 passed the complete repository workflow;
- [ ] final documentation-head CI;
- [ ] direct browser review and explicit approval;
- [ ] squash merge and completion reconciliation.

No backend, API, schema, database, job-processing, game-analysis algorithm, Study, Opening Analysis, or Game Detail change is included.

## VT-201 behavior boundary

The following remain unchanged and are covered by the existing implementation and focused tests:

- applied versus draft route criteria;
- canonical query serialization and refresh behavior;
- period/date synchronization;
- account, provider, result, color, control, rated, analysis, tag, and advanced filter models;
- stale search-response rejection;
- cursor pagination and append behavior;
- `GamesApiService` HTTP ownership;
- `GamesExplorerStore` mutable workflow ownership;
- `ImportedGameJobStore` durable job ownership;
- job eligibility, force/retry behavior, rejected-game errors, and terminal-job refresh;
- game review, provider, and player-profile destinations.

The current Games implementation exposes no row-selection model. VT-201 does not invent one solely because the issue template referenced selection behavior.

## VT-201 browser review required

Review `/games` with realistic data at desktop, tablet, and narrow-phone widths:

- common filters, advanced filters, tags, custom dates, apply, reset, and URL persistence;
- desktop table density and long player/opening names;
- tablet two-column and compact one-column evidence cards;
- opening, control, accuracy, analysis, and index visibility on responsive cards;
- row action menu placement, keyboard focus, and Escape/outside-click closure;
- loading, error, and empty states where reproducible;
- cursor load-more behavior and loaded count;
- queued/running/settled imported-game jobs and job-panel overlap;
- reduced-motion behavior.

Unavailable states must be recorded explicitly rather than treated as observed.

## Execution disposition

Issues #123–#126 are complete.

Issue #127 is `IN_PROGRESS` through draft PR #167. Issues #128 and #129 remain `READY` but cannot replace the active task.

Issues #130–#133 retain their downstream dependencies.

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

### VT-201 validation

Implementation-head CI #1282 passed:

- dependency installation;
- lint;
- full repository build and Angular template/type compilation;
- opening classification audit;
- architecture guardrails;
- database migrations;
- imported-game opening classification audit;
- complete repository test suite, including the new responsive Games tests.

Direct browser review remains pending. The active task must not be represented as complete or merged before explicit approval.

## Open design and product decisions

The decision log remains canonical. Current downstream owners include:

- #128 — Study workflow evidence;
- #129 — Opening Analysis workflow evidence;
- #130 — extraction of only the primitives proven across representative workflows;
- #131 — final mobile-primary navigation after representative mobile evidence exists.

The Games dense-filter presentation, responsive evidence-card hierarchy, result-state treatment, and analytical fact grid remain feature-local candidates until VT-204 compares all representative workflows.

## Program phase state

### Phase 0 — identity and visual proof

Core implementations are integrated. Remaining direct rendering permutations are documented risks rather than blockers.

### Phase 1 — shell and entry points

Complete and integrated.

### Phase 2 — representative workflows

Active. Games is implemented on draft PR #167 and awaits browser review. Study and Opening Analysis remain ready and ordered after Games.

### Phase 3 — rollout and polish

Remaining-page rollout and onboarding/accessibility/responsive polish remain represented by issues #132 and #133.

## Session log

### 2026-07-29 — VT-201 Games modernization

- Claimed issue #127 and branched from reconciled `main`.
- Inspected the current Games route, page, store, API service, filters, table, action menu, job integration, tests, Angular rules, token contract, and responsive breakpoints.
- Implemented a Games-only production-token filter presentation and responsive analytical result cards without changing ownership or behavior.
- Added focused responsive-card tests and corrected the malformed result subtitle.
- Opened draft PR #167.
- Passed implementation-head CI #1282.
- Awaiting final documentation-head CI and direct browser review.

### 2026-07-29 — VT-104 integration

- Final acceptance-head CI #1273 passed.
- Squash-merged PR #162 and reconciled through PR #165.
- Closed Phase 1 for transformation sequencing.

### Earlier integrated checkpoints

PRs #78, #79, #85, #86, #87, #88, #108, #112, #118, #120, #134, #137, #142, #143, #144, #141, #155, #158, #161, #162, and #165 are integrated into `main`.
