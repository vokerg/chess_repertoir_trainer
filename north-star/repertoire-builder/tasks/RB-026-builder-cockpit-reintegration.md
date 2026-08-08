# RB-026 — Reintegrate the Builder Cockpit workspace

Status: CLAIMED

Priority: P1

Order: 190

Delivery class: Frontend product implementation

Planning maturity: Ready — prototype direction selected by the product owner

GitHub issue: #310

Claimed by: Codex agent session

Claim branch: `rb-026/issue-310-builder-cockpit`

Claimed at: 2026-08-08

Concurrent dependency: #133 / draft PR #309 — Builder workbench production-token migration

## Objective

Reintegrate the selected Cockpit direction into the production Repertoire Builder so the board, candidate comparison, decision context and branch controls form one desktop workspace instead of splitting the main decision loop across two screens.

## Claimed scope

1. Replace the current desktop workbench composition with three persistent zones:
   - board and compact candidate selection;
   - a focused decision brief;
   - actions, branch queue and draft control.
2. Present opening identity and intrinsic move character separately from target fit and Player Chess Profile fit.
3. Turn opening knowledge into concise strategic guidance instead of repeating it as generic evidence-source tiles.
4. Clarify manual board entry while preserving the existing board-move request path.
5. Preserve every existing Builder output and action boundary, including generated interpretation and course reintegration.
6. Preserve opponent-response multi-selection, per-response contribution, cumulative coverage, distinct preview/covered state and separate continuation-branch creation.
7. Provide responsive stacking without introducing a second mobile workflow.

## Explicit exclusions

- no API, contract, ranking-policy, engine-analysis, session-reducer or course-write change;
- no persistence expansion or route change;
- no new opening classifications or knowledge content;
- no global design-token migration already owned by #133 / PR #309;
- no automatic move acceptance or automated repertoire generation.

## Acceptance criteria

- At representative desktop sizes, the board, candidate choices, focused decision brief, current action and branch state are visible without the current below-the-fold focused-evidence section.
- The focused move exposes its opening name, soundness/character/theory attributes, target fit, profile fit, engine impact, population support and reviewed strategic plan in a readable hierarchy.
- `Opening knowledge · White/Black` and individual plan records are no longer rendered as undifferentiated evidence tiles.
- Opponent responses remain independently previewable and multi-selectable; each coverage contribution and the cumulative target progress remain visible.
- Accept, defer, stop, ignore, queue reorder/select, reopen, stale restart, finish, new draft, manual entry and optional generated interpretation remain wired to their current outputs.
- Keyboard focus, labels, zoom, reduced motion and representative desktop/tablet/mobile widths remain usable.
- Focused unit tests, web tests, web build, web lint and architecture checks pass, or every skipped/failed gate is recorded.

## Dependency handling

PR #309 edits the same workbench CSS while migrating it to production `--ui-*` tokens. RB-026 will use the production token vocabulary from the start and refresh from current `main` after that dependency moves before final review. The tasks do not share product behavior or data-flow scope.

