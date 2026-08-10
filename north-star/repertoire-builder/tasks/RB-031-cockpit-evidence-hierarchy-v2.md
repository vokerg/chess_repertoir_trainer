# RB-031 — Cockpit evidence hierarchy V2

Status: DONE

Priority: P1

Order: 240

Delivery class: Frontend product integration

Planning maturity: Delivered on PR #336

GitHub issue: #321

Claimed by: ChatGPT

Claim branch: `repertoire-builder/rb-031-cockpit-evidence-v2`

Claimed at: 2026-08-10

Claim scope: Cockpit workbench evidence hierarchy, V2 presentation cleanup and focused tests; setup/page-composition files remained outside scope while RB-030 / PR #335 was active

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

RB-027, RB-028 and corrected RB-029 contract/semantic work are complete on `main`. RB-030 remained concurrently active on PR #335; RB-031 stayed out of setup, launch, target, profile and page-composition files and had no changed-file overlap with #335 at final review.

## Acceptance criteria

- [x] existing three-zone Cockpit remains the default desktop composition;
- [x] user-move rows expose enough peer/Masters/engine information to understand ordering quickly;
- [x] personal evidence reads as factual familiarity/results, never profile similarity;
- [x] focused reasons identify dominant tradeoffs deterministically from authoritative reason codes and evidence;
- [x] opponent rows communicate preparation priority and computed coverage;
- [x] ECO is absent from normal Builder presentation;
- [x] opening knowledge stays concise and ranking-neutral;
- [x] all existing actions/state transitions/manual move/generated interpretation/course boundaries remain wired;
- [x] visual-validation evidence is explicitly recorded: authenticated populated browser desktop/tablet/mobile, keyboard and zoom execution was unavailable in the repository-connector environment; source-level responsive/focus review and CI build/template validation were completed instead, without claiming an unavailable browser run.

## Validation

- two full self-review passes completed with no blocking findings;
- no external PR review submissions, inline review threads or PR comments were outstanding at final review;
- exact implementation head `9a410681b5fb9cb9c10d530e76d640b6b7e82451` passed CI #2483 (`31421699741`), including lint, build/template compilation, audits, architecture guardrails, migrations and tests;
- focused view-model tests cover corpus metric formatting, position-relative results, empirical/preparation reason filtering, factual personal evidence and meaningful course relationships;
- no API, contract, schema/migration, persistence, queue/job, Builder reducer/session or course-write redesign was introduced.

## Completion

Report: `north-star/repertoire-builder/reports/RB-031-2026-08-10-cockpit-evidence-hierarchy-closure.md`

Pull request: #336

Completed at: 2026-08-10
