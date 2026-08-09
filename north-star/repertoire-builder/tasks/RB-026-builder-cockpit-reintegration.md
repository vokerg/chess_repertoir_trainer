# RB-026 — Reintegrate the Builder Cockpit workspace

Status: DONE

Priority: P1

Order: 190

Delivery class: Frontend product implementation

Planning maturity: Complete — Builder Cockpit integrated; canonical completion reconciliation in PR #314

GitHub issue: #310

Claimed by: Codex agent session

Claim branch: `rb-026/issue-310-builder-cockpit`

Claimed at: 2026-08-08

Started at: 2026-08-08

Runtime pull request: #311

Runtime squash commit: `fe0a5ada0205e1d2cf0e27017886d8e907ef4ff7`

Final runtime head: `42e57a331cb99a2b8a88160bfec16704e1b96b73`

Final runtime CI: #2253 (`31275215472`) — passed

Completion reconciliation branch: `rb-026/issue-310-completion-reconciliation`

Completion reconciliation pull request: #314

Closure report: `reports/RB-026-2026-08-09-builder-cockpit-closure.md`

Concurrent dependency: #133 / PR #309 — Builder workbench production-token migration, merged before final RB-026 review

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

PR #309 edited the same workbench CSS while migrating it to production `--ui-*` tokens. RB-026 was refreshed after that migration landed and the final runtime pull request targeted `main` from the production token vocabulary. The tasks did not share product behavior or data-flow scope.

## Completion

PR #311 squash-merged the RB-026 runtime into `main` as `fe0a5ada0205e1d2cf0e27017886d8e907ef4ff7`. Final runtime head `42e57a331cb99a2b8a88160bfec16704e1b96b73` passed exact-head CI #2253 (`31275215472`), including lint, build, opening audits, architecture guardrails, migrations, imported-game audits and the complete test gate.

The implementation preserved the existing Builder store/API/course boundaries and added no backend, contract, ranking, persistence or course-write behavior. Runtime PR #311 changed the Builder workbench/view-model/test surface plus the shared responsive breakpoint helper and coordination metadata.

Authenticated desktop/tablet/mobile visual review was not completed in the implementation session because the available browser redirected `/builder` to sign-in. That remains deferred product evidence and is not represented as a pass by this task.

Completion evidence is recorded in `reports/RB-026-2026-08-09-builder-cockpit-closure.md` and synchronized through `README.md`, `GITHUB_ISSUES.md`, `ROADMAP.md`, `STATUS.md`, `TASKS.md`, issue #310 and program tracker #105 by completion PR #314. PR #314 contains no runtime implementation.

Queue impact: RB-016 remains `BLOCKED` on real-use outcome evidence. No dependency-satisfied Repertoire Builder implementation task is currently queued, and RB-026 does not promote or invent one.

Completed at: 2026-08-09, effective when PR #314 is approved and squash-merged. Issue #310 remains open until that merge.
