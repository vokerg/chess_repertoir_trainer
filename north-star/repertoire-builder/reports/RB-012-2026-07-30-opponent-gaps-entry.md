# RB-012 Opponent gaps builder entry report

Date: 2026-07-30

Status: implemented for review

Task: RB-012

GitHub issue: #100

Implementation pull request: #208

Implementation branch: `rb-012/issue-100-opponent-gaps-entry`

Final tested implementation head before review-package documentation: `fafeeba20be64766ad0f269546e1dc89010de03d`

Implementation CI: run `30516865329` / CI #1586 — success

## Purpose

Extend the integrated existing-course adaptation workflow from terminal Course endings to in-course Opponent gaps without creating a second builder, recommendation engine or course-write path.

An Opponent gap identifies a position where the game still overlaps the course, the opponent then plays a move the course does not cover, and the course may reach that same position through one or more lines or transpositions. The workflow therefore needs an exact reviewed source anchor before it can safely add coverage.

## Delivered behavior

### Exact source-anchor projection

The Course review service now derives line anchors for each grouped `OPPONENT_UNCOVERED` finding at the pre-gap normalized position.

It reuses the existing chess-domain `findLineAnchors` helper from the RB-011 reintegration planner rather than reconstructing course paths in Angular. The response exposes:

- `LINE_START` when the gap occurs at the line's starting position;
- `NODE` when a prior course node reaches the pre-gap position;
- course chapter, line, optional node, line name and move sequence;
- every exact matching anchor, sorted deterministically.

When a transposed/shared position belongs to multiple lines or occurs more than once, the UI presents distinct anchor-specific actions rather than silently selecting one destination.

### Opponent-gap action in Course review

Each Opponent gap card retains the displayed post-move board and existing review/analysis actions.

For every exact source anchor it renders **Cover this gap in builder**. The builder launch uses the pre-gap position, not the displayed post-move position, so the first decision is the observed opponent move itself.

My deviations remain unchanged and do not receive a builder action in this slice.

### Generalized validated launch boundary

The existing Course ending route contract is generalized into one bounded Course-finding launch union with source-specific intent:

- `COURSE_ENDING` / `EXTEND_EXISTING_LINE`;
- `OPPONENT_GAP` / `COVER_OPPONENT_GAP`.

The Opponent gap payload carries:

- source course, chapter, line and exact `LINE_START` or `NODE` anchor;
- pre-gap FEN and repertoire side;
- observed opponent move UCI/SAN;
- grouped game count and result breakdown;
- minimum course-overlap threshold;
- line-specific move sequence;
- applied game filters, readable summary and source key.

The parser validates source/intent, positive IDs, anchor semantics, UCI, text bounds and FEN. `NODE` requires a positive node ID; `LINE_START` requires no node. Four-field normalized FENs are expanded to a legal full FEN while position identity remains the normalized four fields.

Historical Course ending links remain backward-safe when `anchorKind` is absent, and their return route now uses the canonical `course-endings` query value.

### Existing builder, precise decision role

The existing RB-010 setup remains editable for speed, population, persona, theory and coverage. The source course fixes repertoire side.

After setup:

- the RB-006 target records `COURSE_POSITION`;
- RB-009 starts at the exact pre-gap FEN;
- because the opponent is to move, the initial RB-009 role is `OPPONENT_RESPONSE`;
- the observed move is passed through the existing RB-007 `includeMoveUci` boundary;
- the user can inspect or accept that move using the normal candidate workflow.

No new candidate ranking or recommendation calculation is introduced.

### Visible source evidence and consequence

The builder source panel distinguishes Opponent gaps from Course endings and keeps visible:

- source course and line;
- line path or explicit course-start position;
- observed opponent move;
- game count, minimum overlap and result breakdown;
- source filter summary;
- the consequence that this action adds coverage on this exact line only.

Replacement, an alternate line and another destination are not presented as equivalent actions.

### Exact RB-011 destination

After session completion, **Review course output** reuses the existing RB-011 projection, preview token and transactional apply.

The destination store constructs one required target from the launch:

- source course and chapter;
- source line;
- exact `LINE_START` or `NODE` anchor;
- normalized pre-gap FEN.

Destination controls remain locked. Apply is enabled only when preview returns the same conflict-free target. Missing or changed source anchors produce a safe stale-source error and no write.

RB-011 remains authoritative for ownership, legal moves, trained-side conflicts, course revision, idempotency and transaction behavior.

### Return to Opponent gaps

The launch retains the applied game filters and `minCoveredPlies`. **Back to opponent gaps** restores the `opponent-gaps` mode, filters and overlap threshold.

No persistent resolved-finding record is introduced. Re-running Course review evaluates the updated course graph.

## Architecture decision

The implementation extends existing boundaries only:

- Course review matcher/grouping and unified page;
- chess-domain line-anchor planner;
- imported-game query codec;
- RB-006 target contract;
- RB-007 candidate API/manual inclusion;
- RB-009 arbitrary-FEN role semantics;
- RB-010 route-local store/workbench;
- RB-011 mandatory preview/apply and exact anchors.

No Prisma model, migration, new API route, persistence adapter, worker, queue, background job, course-writer change or second recommendation engine is added.

## Acceptance mapping

- A real Opponent gap can launch at the exact pre-gap position. — Implemented through anchor-specific actions and arbitrary-FEN start.
- Line-start and in-line positions are supported. — Implemented with `LINE_START` and `NODE` projection/tests.
- Shared positions require an explicit source choice. — Every returned anchor receives a separate action.
- Observed move and evidence remain visible. — Implemented in route context and source panel.
- Target setup remains editable except source side. — Existing setup reused.
- Initial decision can inspect the observed opponent move. — Existing `includeMoveUci` path reused.
- Course apply is constrained to the originating anchor. — Exact required target implemented and tested.
- Stale anchors fail without partial writes. — Missing exact preview target disables apply; RB-011 transaction checks remain authoritative.
- Existing Course review actions remain available. — Preserved.
- Return navigation restores source scope. — Implemented and tested.
- No duplicate recommender or persistence layer. — Confirmed.

## Focused validation

Added or extended coverage for:

- deterministic `LINE_START` and `NODE` anchor projection;
- pre-gap versus displayed post-move finding mapping;
- no builder context for My deviations;
- Course ending and Opponent gap route round-trips;
- malformed/anchor-invalid launch rejection;
- four-field FEN normalization;
- source-specific return modes and thresholds;
- restoration of `minCoveredPlies`;
- exact line-start destination locking;
- rejection of non-source targets;
- safe exact-target absence;
- existing Course ending/node and unconstrained destination behavior.

CI #1586 passed lint, domain/contracts/API/web/mobile builds, both opening audits, architecture guardrails, database migrations and the complete repository test suite.

## Manual review still required

The GitHub connector does not provide a populated authenticated browser runtime. Review must verify:

- a real line-start Opponent gap and a real in-line Opponent gap;
- one action per exact line/anchor for shared positions;
- the builder opens before the observed opponent move;
- that move appears in the initial candidates;
- source evidence, fixed side and editable target setup are clear;
- completed output enables only the originating anchor;
- apply updates that line and no other destination;
- Back to opponent gaps restores filters and overlap threshold;
- changed/deleted anchors fail without partial writes;
- desktop/mobile readability and keyboard traversal.

These are review gates, not claims of completed hands-on validation.

## Remaining RB-012 work

My deviations remain the next possible finding family, but they must not be integrated until the UI explicitly distinguishes:

1. replace the repertoire choice;
2. add an alternate line;
3. keep the current course and train adherence.

Weak-choice and profile-driven adaptation remain downstream of accepted RB-004/RB-005/RB-013 semantics.

Course endings and Opponent gaps remain inspectable source/recalculation surfaces. Retirement or consolidation should be considered only after the integrated builder demonstrates equivalent maintenance value across multiple findings.

## Queue impact

RB-012 moves to `REVIEW` for the Opponent gaps slice through PR #208. Task order and priority remain unchanged. Issue #100 stays open because later consequence types remain part of the same immutable RB task.
