# RB-031 — Cockpit evidence hierarchy V2

Status: PROPOSED

Priority: P1

Order: 240

Delivery class: Frontend product integration

Planning maturity: Agreed direction; waits on V2 evidence contracts

GitHub issue: #321

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

## Objective

Adapt the integrated RB-026 Cockpit to the V2 decision model without replacing the workspace that already works well.

## Preserve

- one primary board and eval bar;
- compact candidate preview/switching;
- focused decision brief;
- opening identity, reviewed plans and caveats;
- evidence details and deterministic reasons;
- manual move entry;
- action/branch column, queue, defer/ignore/stop and draft preview;
- optional generated interpretation as non-authoritative;
- responsive stacking and course preview/apply boundaries.

## User-move evidence hierarchy

At-a-glance candidate evidence should foreground the facts that drive V2:

- engine quality/cost;
- target-population frequency and position-relative result;
- Masters frequency/support;
- factual personal common/rare/new and result context from RB-028;
- existing-course relationship where relevant.

Opening classification and knowledge remain secondary explanatory context: what kind of chess the move creates and what plans matter.

The focused brief must answer why a higher-ranked candidate outranks another without requiring the user to infer a hidden weighted score.

## Opponent-move evidence hierarchy

Use RB-029 preparation semantics: target-population frequency, personal encounters, danger, course state, recommended selection and computed coverage. Do not show persona/profile fit for opponent moves.

## Cleanup

- remove ECO codes/badges from normal Builder UI while retaining underlying evidence;
- replace ambiguous `target play` wording with explicit target-population language;
- remove primary Target/Profile Aligned/Conflict chips where V2 no longer uses them;
- avoid turning the Cockpit into a dense statistics dashboard.

## Dependencies

Depends on RB-027, RB-028 and RB-029 contract/semantic completion. Coordinate setup/context copy with RB-030.

## Acceptance criteria

- existing three-zone Cockpit remains the default desktop composition;
- user-move rows expose enough peer/Masters/engine information to understand ordering quickly;
- personal evidence reads as factual familiarity/results, never profile similarity;
- focused reasons identify dominant tradeoffs deterministically;
- opponent rows communicate preparation priority and computed coverage;
- ECO is absent from normal Builder presentation;
- opening knowledge stays concise and ranking-neutral;
- all existing actions/state transitions/manual move/generated interpretation/course boundaries remain wired;
- authenticated populated visual review covers desktop/tablet/mobile, keyboard and zoom when available, with skipped evidence recorded explicitly.

## Completion

Report: none

Completed at: none
