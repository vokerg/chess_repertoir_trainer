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

At-a-glance candidate evidence foregrounds:

- engine quality/cost;
- target-population frequency and position-relative result;
- Masters frequency/support;
- factual personal common/rare/new and result context from RB-028;
- existing-course relationship where relevant.

Opening classification and knowledge remain secondary explanatory context: what kind of chess the move creates and what plans matter.

The focused brief explains dominant tradeoffs using authoritative reason codes/evidence rather than creating a hidden Angular score.

## Opponent-move evidence hierarchy

Use RB-029 preparation semantics: target-population frequency, personal encounters, danger, course state, recommended selection and computed coverage. Persona/profile fit is not shown for opponent moves.

## Cleanup

- normal ECO codes/badges removed from Builder presentation while retaining underlying evidence;
- ambiguous `target play` wording replaced by explicit target-population language;
- primary Target/Profile Aligned/Conflict chips removed where V2 no longer uses them;
- Cockpit remains focused rather than becoming a dense statistics dashboard.

## Dependencies

RB-027, RB-028 and corrected RB-029 contract/semantic work were complete before RB-031. RB-030 ran concurrently on disjoint setup/launch/target/profile/page-composition files and subsequently merged through PR #335.

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
- exact implementation head `9a410681b5fb9cb9c10d530e76d640b6b7e82451` passed CI #2483 (`31421699741`);
- final documentation-adjusted head `a7ed94bdad896bc852685ad25de1dc87bee89e8f` passed exact-head CI #2486 (`31422515093`) and PR #336 was squash-merged as `e6c024afec1753838dec900181ca4023d6114676` on 2026-08-10;
- focused view-model tests cover corpus metric formatting, position-relative results, empirical/preparation reason filtering, factual personal evidence and meaningful course relationships;
- no API, contract, schema/migration, persistence, queue/job, Builder reducer/session or course-write redesign was introduced.

## Completion

Report: `north-star/repertoire-builder/reports/RB-031-2026-08-10-cockpit-evidence-hierarchy-closure.md`

Pull request: #336

Completed at: 2026-08-10
