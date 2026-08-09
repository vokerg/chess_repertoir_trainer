# RB-029 — Opponent preparation and computed coverage V2

Status: READY

Priority: P1

Order: 220

Delivery class: North-star decision policy and UX

Planning maturity: Agreed product semantics; recommended-set rule requires implementation evidence

GitHub issue: #319

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

## Objective

Reframe `OPPONENT_RESPONSE` as preparation priority: which realistic replies should this repertoire cover? Persona, target opening character, theory burden and Player Chess Profile fit do not judge opponent moves.

## Priority evidence

Use separated evidence centered on:

- selected peer-population frequency/relevance;
- exact-position personal encounters;
- objective danger when an uncommon reply is materially challenging;
- existing course coverage/gaps where applicable;
- Masters as secondary context where useful.

## Coverage model

Coverage is an outcome of selected replies, not a persona/setup preference.

- remove the normal setup percentage slider and persona-specific 70/80/85 defaults;
- produce a deterministic recommended preparation set from response evidence;
- show the cumulative selected share of target-population games as feedback;
- keep every response manually addable/removable;
- preserve explicit defer/ignore and separate continuation branches;
- do not claim theoretical completeness.

The recommended-set stopping rule must be versioned and tested. It must not simply conceal the old fixed percentages under new copy.

## In scope

- opponent ranking/reasons and response-set recommendation;
- contract cleanup needed to remove irrelevant target/profile fit from opponent decisions;
- computed coverage presentation semantics;
- reuse of current RB-009 multi-selection/branch queue;
- focused domain/API/web tests.

## Out of scope

- user-move persona ranking;
- automatic response acceptance or full-tree generation;
- persistence, jobs, new queue model or course-write changes.

## Dependencies

Coordinate shared candidate-contract work with RB-027. RB-031 consumes the final opponent presentation. RB-030 removes setup controls after target-policy compatibility is settled.

## Acceptance criteria

- opponent candidates are not labeled Target/Profile Aligned or Conflict;
- frequency, personal encounter, danger and course-state reasons are independently inspectable;
- recommended responses are deterministic and editable;
- selected coverage is calculated from actual selected response contributions and clearly labeled as target-population share;
- uncommon but dangerous/personal responses can be promoted without being called common;
- accepting selected responses retains current branch creation, queue and reducer semantics;
- setup no longer requires a coverage percentage;
- tests cover common, dangerous-uncommon, personally encountered, sparse, defer, ignore and selection cases.

## Completion

Report: none

Completed at: none
