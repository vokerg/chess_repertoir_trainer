# Visual Transformation Status

Last updated: 2026-07-29

## Current state

**Program state:** Phase 3 is in progress through VT-301 remaining-page and Labs rollout.

**Integration target:** `main`

**Former integration branch:** `visual_transformation` is retired for new work

**Active checkpoint branches:**

- `visual-transformation/vt-301-remaining-page-rollout` — Batch 1, Progress account dashboard;
- `visual-transformation/vt-301-player-profile` — Batch 2, Player Chess Profile.

**Active pull requests:**

- draft PR #196 — Progress account dashboard; repository CI passed, browser review pending;
- draft PR #206 — Player Chess Profile; repository CI and browser review pending.

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
- [x] PR #188 — VT-204 proven shared UI primitives.
- [x] PR #190 — VT-204 completion reconciliation.
- [x] PR #191 — VT-205 final mobile-primary navigation, squash commit `534533b7d6497ba2802a63abb95e358dc962ef2a`.
- [x] PR #192 — VT-205 completion reconciliation.

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

Issue #130 is complete through PR #188 and reconciliation PR #190. It promoted only:

- `app-context-strip` for Study and Opening Analysis derived context;
- `app-fact-grid` for Games responsive evidence and Study line health.

Feature-owned cards, workflow steps, launchers, workbench evidence, state, commands, and responsive composition remain feature-owned.

### VT-205 Final mobile-primary navigation

Issue #131 is complete through squash-merged PR #191, commit `534533b7d6497ba2802a63abb95e358dc962ef2a`, and completion reconciliation PR #192.

Delivered below the shared 760px breakpoint:

1. Home;
2. Study;
3. Games;
4. Openings;
5. More.

The four persistent destinations are filtered by stable id from `MainNavigationComponent.mainNavItems`. More renders the same complete route/account hierarchy, secondary routes mark More active, and no duplicate mobile route source was added.

The integration also added native modal focus/Escape/backdrop behavior, safe-area-aware application clearance, imported-game job-panel clearance, production-token presentation, narrow-phone behavior, reduced-motion handling, and focused navigation regression coverage.

Desktop rail behavior, route taxonomy, account ownership, feature stores/APIs/workflows, board/training behavior, and backend behavior remain unchanged. D-314 governs the final mobile-primary contract.

## Deferred browser feedback

The user explicitly approved VT-202, VT-203, VT-204, and VT-205 without direct browser review. Their recorded checklists remain useful for a later consolidated product-review pass.

Deferred evidence is not represented as observed validation and did not block the approved integrations.

## Execution disposition

Issues #123–#131 are complete.

Issue #132 / VT-301 is `IN_PROGRESS` with two independent draft rollout batches: PR #196 for the Progress account dashboard and PR #206 for Player Chess Profile. Issue #133 / VT-302 remains blocked until all VT-301 batches are complete and reconciled.

## Validation status

- VT-202 CI #1372, #1374, and reconciliation CI #1379 passed.
- VT-203 CI #1392, #1394, and reconciliation CI #1419 passed.
- VT-204 CI #1425, #1432, #1448, and #1453 passed the complete repository workflow.
- VT-205 implementation CI #1461 and exact approved-head CI #1472 passed the complete repository workflow.
- VT-301 Batch 1 CI #1480 passed the complete repository workflow; direct browser review remains pending.
- VT-301 Batch 2 PR #206 repository CI and direct browser review remain pending.

The VT-205 workflows covered dependency installation, lint, full repository build and Angular template/type compilation, both opening audits, architecture guardrails, database migrations, and the complete test suite including updated navigation tests.

## Open design and product decisions

- #132 — remaining-page and Labs rollout using the production token, shell, final mobile navigation, context, fact, and feature-owned patterns;
- #133 — onboarding, empty-state, accessibility, and responsive polish after rollout.

D-314 locks the final mobile-primary model. D-026 continues to lock the evidence-based shared presentation boundary.

## Program phase state

### Phase 0 — identity and visual proof

Core implementations are integrated. Remaining rendering permutations are documented risks.

### Phase 1 — shell and entry points

Complete and integrated.

### Phase 2 — representative workflows

Complete and integrated through VT-205 / PR #191 and reconciliation PR #192.

### Phase 3 — rollout and polish

VT-301 remaining-page and Labs rollout is active. VT-302 onboarding, empty-state, accessibility, and responsive polish follows it.

## Session log

### 2026-07-29 — VT-301 Player Chess Profile batch

- Continued the claimed VT-301 rollout using the explicit inventory order after the Progress account-dashboard batch.
- Inspected the current Player Chess Profile page, store/API boundary, filter bar, conclusions, breakdown, evidence, coverage, production token contract, responsive breakpoints, issue state, and open pull requests.
- Confirmed PR #196, PR #204, and active RB-012 PR #205 do not touch the Player Chess Profile files.
- Created `visual-transformation/vt-301-player-profile` from current `main` and opened draft PR #206.
- Migrated six feature CSS files to production `--ui-*` roles with semantic status colours, analytical mono numerics, responsive composition, overlay treatment, and visible keyboard focus.
- Preserved all route, store, API, filter, recalculation, evidence-selection, link, and data-state behavior.
- Added the focused rollout report and updated the Angular migration ledger.
- Local application checks remain unavailable in this session; repository CI and direct browser review remain pending.

### 2026-07-29 — VT-205 integration

- Selected and claimed issue #131 after VT-204 completion.
- Inspected the single navigation model, route taxonomy, app shell, imported-game job panel, responsive breakpoints, Home shortcut order, representative workflow evidence, Angular rules, token contract, and prior navigation decisions.
- Selected Home, Study, Games, Openings, and More from implemented product evidence.
- Retained complete route/account access and one hierarchical route source.
- Implemented native modal behavior, active-state delegation, safe-area/content/job-panel clearance, production-token presentation, and focused tests.
- CI #1461 and exact approved-head CI #1472 passed the complete repository workflow.
- The user explicitly approved integration while deferring direct browser feedback.
- Squash-merged PR #191 into `main` as `534533b7d6497ba2802a63abb95e358dc962ef2a`.
- Created and validated completion reconciliation PR #192 from that exact `main` commit.
- Released VT-301 / issue #132 as the next deterministic task.

### Earlier integrated checkpoints

PRs #78, #79, #85, #86, #87, #88, #108, #112, #118, #120, #134, #137, #141–#144, #155, #158, #161, #162, #165, #167, #176, #178, #180, #183, #185, #188, #190, #191, and #192 are integrated into `main`.
