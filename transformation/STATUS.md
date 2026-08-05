# Visual Transformation Status

Last updated: 2026-08-05

## Current state

**Program state:** Phase 3 is in progress through VT-301 authenticated-route inventory reconciliation.

**Integration target:** `main`

**Former integration branch:** `visual_transformation` is retired for new work.

**Active checkpoint branches:** none after PR #209 integration.

**Active pull requests:** none for a page-family rollout batch after PR #209 integration.

**Live execution queue:** [Visual Transformation Program issue #122](https://github.com/vokerg/chess_repertoir_trainer/issues/122)

Repository documents own integrated history, architecture, decisions, validation, residual risks, and reports. Issue #122 and child issues #123–#133 own live readiness, order, dependencies, claims, branches, pull requests, blockers, and completion state.

All transformation work uses short-lived branches, pull requests to `main`, explicit approval, and squash merge. The former `visual_transformation` branch remains historical only.

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
- [x] PR #188 — VT-204 proven shared UI primitives.
- [x] PR #190 — VT-204 completion reconciliation.
- [x] PR #191 — VT-205 final mobile-primary navigation, squash commit `534533b7d6497ba2802a63abb95e358dc962ef2a`.
- [x] PR #192 — VT-205 completion reconciliation.
- [x] PR #196 — VT-301 Batch 1 Progress account dashboard, squash commit `8bab30990276ce13a95c3544a381e4158aaf9ef0`.
- [x] PR #206 — VT-301 Batch 2 Player Chess Profile, squash commit `bf04e9629f4194c058488ab915a5cfe7b67285bb`.
- [x] PR #209 — VT-301 Batch 3 Settings routes; current-main reconciliation, adversarial review corrections, and rendered regression coverage.
- [x] PR #211 — VT-301 Batch 4a marathon and focused line training, squash commit `a59cb7847270db407e950740df804dde4bd1f060`.
- [x] PR #212 — VT-301 Batch 4a reconciliation, squash commit `4f223f38dd828ace97ad800eed4e9e189870e7fb`.
- [x] PR #215 — VT-301 Batch 4b Courses and Course Review, squash commit `51e4967bc49b6ca1ad492456b13b1802acd5f45f`.
- [x] PR #217 — VT-301 Batch 4b reconciliation, squash commit `e585c662988ff6419de56905b268c9f559aeaf0a`.
- [x] PR #221 — VT-301 Batches 4c/4d repertoire authoring and remaining training, squash commit `fed4fed47d17a7cb7b0351c0bfd99bd80dc453da`.
- [x] PR #229 — VT-301 Batches 4c/4d reconciliation, squash commit `0f9409ef68791123575a659e1361b056f8680038`.
- [x] Direct commit `a30303ffb9e59de4f4a99e1be936e4624ba13b63` — VT-301 Batch 5 shared filter select menu.
- [x] PR #235 — VT-301 Batch 6 analytical workbench and openings evidence, squash commit `65ee1b56cc39f377d7066a1827e510e922b695fa`.
- [x] PR #252 — VT-301 Batch 7a Lab discovery and tabular reports, squash commit `6335c9b940f8eaa4681a29d6e391513b33214e91`.
- [x] PR #269 — VT-301 Batch 7b Performance by Rating, squash commit `5ad2768ab47e3dfe718bae233c52ab1fca61a6fb`.
- [x] PR #277 — VT-301 Batch 7c Tactical Detections, squash commit `c6397dd1831257b67ad606959820e75c33bd2c9a`.

## Phase 1 completion

VT-101 through VT-104 established production navigation, Home calibration, the `--ui-*` token and typography contract, the wide signed-in shell, and evidence-bounded browser disposition. Phase 1 is complete for sequencing; unreproduced browser permutations remain documented risks rather than passes.

## Phase 2 completion

### VT-201 Games

Issue #127 is complete through PR #167 and reconciliation PR #176. Games retained route, filter/query, API/store, pagination, durable job, semantic table, and command ownership while gaining production-token filters/results and responsive evidence cards.

### VT-202 Study

Issue #128 is complete through PR #178 and reconciliation PR #180. Study retained route, store, API, selection, eligibility, marathon, and launcher ownership while gaining explicit workflow hierarchy, derived context, accessible selection, and separated scope/mode presentation.

### VT-203 Opening Analysis

Issue #129 is complete through PR #183 and reconciliation PR #185. Opening Analysis composes through the shared workbench while retaining route, store, API, board, engine, filter, history, stale-response, widget, and navigation ownership.

### VT-204 Proven shared primitives

Issue #130 is complete through PR #188 and reconciliation PR #190. It promoted only `app-context-strip` and `app-fact-grid`; feature-owned cards, workflows, launchers, workbench evidence, state, commands, and responsive composition remain feature-owned.

### VT-205 Final mobile-primary navigation

Issue #131 is complete through PR #191 and reconciliation PR #192. The final mobile-primary model below 760px is Home, Study, Games, Openings, and More, derived from the existing hierarchical navigation model.

## Deferred browser feedback

The user approved multiple Phase 2 and VT-301 integrations without direct authenticated browser review, including Progress, Settings, and Tactical Detections. Their recorded checklists remain useful for a later consolidated product-review pass. Deferred evidence is not represented as an observed validation pass.

## Execution disposition

Issues #123–#131 are complete.

Issue #132 / VT-301 remains `IN_PROGRESS`. Page-family batches 1–7c are integrated. The remaining work is an explicit authenticated-route inventory reconciliation that classifies every remaining route as transformed, accepted debt, or later-program scope before issue #132 can close.

Issue #133 / VT-302 remains blocked until issue #132 is complete and reconciled.

## Validation status

- VT-202 CI #1372, #1374, and reconciliation CI #1379 passed.
- VT-203 CI #1392, #1394, and reconciliation CI #1419 passed.
- VT-204 CI #1425, #1432, #1448, and #1453 passed the complete repository workflow.
- VT-205 implementation CI #1461 and exact approved-head CI #1472 passed the complete repository workflow.
- VT-301 Batch 1 exact-head CI #1744 passed; direct authenticated browser review was deferred.
- VT-301 Batch 2 CI #1521 passed; browser review was explicitly deferred before integration.
- VT-301 Batch 3 original CI #1573 passed only the old implementation. PR #209 was then reconciled with current `main`, adversarially reviewed, corrected, and required to pass a fresh exact-head complete workflow before squash integration. The exact run and final head are recorded on PR #209 and issue #132. Direct authenticated browser review was explicitly deferred.
- VT-301 Batch 4a CI #1594 passed; browser review was explicitly deferred before integration.
- VT-301 Batch 4b CI #1606 passed; browser review was explicitly deferred before integration.
- VT-301 Batches 4c/4d exact audited-head CI #1623 and reconciliation CI #1650 passed.
- VT-301 Batch 5 automated validation was recorded complete; direct browser review remains pending.
- VT-301 Batch 6 exact-head CI #1714 passed; direct browser review was explicitly deferred.
- VT-301 Batch 7a exact-head CI #1825 passed, including 347 Angular web tests; direct authenticated browser review was explicitly deferred.
- VT-301 Batch 7b exact-head CI #1876 passed, including 360 Angular web tests and the complete repository workflow; direct authenticated browser review was explicitly deferred.
- VT-301 Batch 7c rebased exact-head CI #1977 passed on `807d8e629463fd53f43a6268b73886b5fa01c8ca`; direct authenticated browser review was not represented as passed.

The workflows cover dependency installation, lint, full repository build and Angular template/type compilation, opening audits, architecture guardrails, database migrations, and the complete test suite.

## Open design and product decisions

- #132 — authenticated-route inventory reconciliation and final VT-301 completion decision;
- #133 — onboarding, empty-state, accessibility, and responsive polish after rollout.

D-314 locks the final mobile-primary model. D-026 continues to lock the evidence-based shared presentation boundary. D-027 locks the shared single-choice select-menu boundary.

## Program phase state

### Phase 0 — identity and visual proof

Core implementations are integrated. Remaining rendering permutations are documented risks.

### Phase 1 — shell and entry points

Complete and integrated.

### Phase 2 — representative workflows

Complete and integrated through VT-205 / PR #191 and reconciliation PR #192.

### Phase 3 — rollout and polish

VT-301 page-family rollout is integrated; authenticated-route inventory reconciliation remains. VT-302 onboarding, empty-state, accessibility, and responsive polish follows it.

## Session log

### 2026-08-05 — VT-301 Settings current-main reconciliation and adversarial review

- Rejected the earlier metadata-only handling of PR #209 and re-read the governing transformation, Angular architecture, token, shared UI, feature, store, service, test, and current-main records.
- Reconciled 57 commits of base drift without allowing stale branch documentation to overwrite newer `main` history.
- Found and fixed repeated imported-ID filtering from template bindings, flat seven-button account actions, icon-only default-progress control, incomplete OAuth-scope guidance, missing alert/live-region semantics, and ambiguous Appearance form-control labels.
- Moved account facts and workflow eligibility into signal-derived view-state maps; templates now perform lookup rather than non-trivial transformation.
- Added pure helper coverage and rendered component tests for Accounts, Lichess integration, and Appearance.
- Corrected the frontend sound-ownership contract and stale Angular-test tooling ledger.
- The first two fresh exact-head test attempts reproduced a Karma browser timeout after 314 of 315 tests while every non-test gate passed. The new fixture suites were then stabilized with awaited initialization and explicit fixture teardown before final validation.
- Reconciled the already integrated Progress PR #196 and Tactical Detections PR #277 instead of carrying stale active-branch claims.
- Preserved routes, stores, APIs, import jobs, confirmations, OAuth flow, and browser-local sound behavior.
- The user explicitly approved wrap-up while requiring the deeper review. Direct authenticated browser review remains deferred and is not represented as observed evidence.

### 2026-08-04 — VT-301 Tactical Detections integration

- Rejected the initial hand-built workspace-shell approach because the route already owns `app-page-header` and transformed Labs use `app-panel` plus typed shell actions.
- Rebuilt the slice with `app-panel`, `UiShellAction`, `UiShellStat`, `app-select-menu`, production tokens, explicit result/run control meaning, accessible table semantics, and rendered component regression tests.
- Preserved store, API, detection, filter, route, query-parameter, and scenario-training behavior.
- Exact-head CI #1977 passed and PR #277 was squash-merged as `c6397dd1831257b67ad606959820e75c33bd2c9a`.

### 2026-07-31 — VT-301 analytical workbench integration

- Migrated the shared workbench, board controls, move tree, engine presentation, course suggestions, Masters and peer evidence, position evidence, Game Review summary and insight surfaces, Opening Analysis shared consumers, and Opening Struggles to production `--ui-*` roles.
- Preserved routes, stores, APIs, filters, board and engine behavior, persistence, and backend ownership.
- Exact implementation-head CI #1714 passed and PR #235 was squash-merged as `65ee1b56cc39f377d7066a1827e510e922b695fa`.

### 2026-07-30 — VT-301 authoring and remaining-training integration

- Combined two recorded rollout slices in PR #221 to reduce repeated full-repository CI executions.
- Corrected exact selected-subline evidence, categorical typography, accessible names, live-region/error semantics, and stale migration/status records.
- Preserved stores, APIs, routes, board mechanics, engine ownership, scoring, rating, sync, persistence, and backend behavior.
- Exact audited-head CI #1623 passed and PR #221 was squash-merged as `fed4fed47d17a7cb7b0351c0bfd99bd80dc453da`.

### Earlier integrated checkpoints

PRs #78, #79, #85, #86, #87, #88, #108, #112, #118, #120, #134, #137, #141–#144, #155, #158, #161, #162, #165, #167, #176, #178, #180, #183, #185, #188, #190, #191, #192, #196, #206, #209, #211, #212, #215, #217, #221, #229, #235, #252, #269, and #277 are integrated into `main`.
