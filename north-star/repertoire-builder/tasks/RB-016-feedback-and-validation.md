# RB-016 — Measure adoption and real-game outcomes

Status: BLOCKED

Priority: P2

Order: 160

Delivery class: Dual-use

Planning maturity: Placeholder — blocked until V2 and real-use evidence

GitHub issue: #104

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

## Outcome

Measure whether repertoire choices produced by the Builder are:

- trained;
- remembered;
- selected in later games;
- associated with improved opening-position quality;
- associated with improved results after accounting for context;
- becoming obsolete, weak, or incomplete as new games arrive.

Use those measurements to improve course maintenance and future evidence calibration without silently overriding user choices.

## Why this task exists

The north star is not successful merely because it generates a large course. The application should eventually close the loop between recommendation, training, real-game use, and new evidence.

## Revised blocker — 2026-08-09

The product owner revised the Builder decision model through RB-027–RB-031.

RB-016 must **not** use the current V1 profile-fit, target-fit, persona-weight or setup-coverage semantics as the long-term evaluation cohort. Useful outcome measurement now requires:

1. RB-027 empirical persona ranking V2 integrated;
2. RB-028 factual personal move evidence integrated;
3. RB-029 opponent preparation/computed coverage integrated;
4. RB-030 single-dialog setup integrated;
5. RB-031 V2 Cockpit evidence hierarchy integrated, or otherwise enough settled V2 metadata to identify the recommendation policy shown to the user;
6. a meaningful set of V2 Builder-created/adapted course lines;
7. training attempts against that material;
8. later imported games reaching relevant positions;
9. an agreed observation period and minimum sample boundary.

RB-026's Cockpit runtime and RB-011 course writes remain valid foundations; V2 changes recommendation semantics, not those state/write authorities.

## Current repo anchors to inspect at claim time

- V2 candidate policy/version, reasons and decision evidence from RB-027/RB-029;
- V2 personal evidence semantics from RB-028;
- Builder target/session decision history and course output metadata;
- training sessions, attempts, and subline stats;
- imported-game plies and course coverage classification;
- opening analysis and tag outcomes;
- account rating/performance periods;
- job/import workflows if recalculation triggers are considered.

## In scope

- define adoption and recall measures;
- connect V2 Builder/course decisions to later imported-game positions without overclaiming causality;
- distinguish played move, remembered trained move, deviation, and opponent never entering the line;
- measure opening-position outcomes before/after adoption with context;
- identify newly frequent deferred responses;
- identify regression or recurring course gaps;
- define confidence and minimum samples;
- preserve the V2 recommendation policy/persona/population context behind outcome cohorts;
- provide bounded progress/maintenance summaries;
- decide recalculation triggers and whether existing workflows suffice;
- add tests for linkage and outcome classification.

## Out of scope

- using pre-V2 Builder sessions as the primary calibration cohort for V2 recommendations;
- claiming causal rating improvement from uncontrolled correlations;
- automatic course rewrites;
- automatic policy/weight changes from outcome data;
- high-frequency background monitoring without need;
- LLM evaluation of outcomes;
- generic achievement systems.

## Open questions to resolve

- Which V2 decision metadata must be retained on applied course material so later games can be grouped by policy/persona/population?
- What is repertoire adoption versus coincidental move selection?
- How many training attempts indicate learned material?
- How are opponent choices accounted for?
- What comparison window and baseline are valid?
- How are rating, speed, color, and opponent changes controlled?
- When should a deferred response be promoted?
- How is regression displayed without punishing experimentation?
- How should policy-version changes split or compare cohorts?

## Acceptance criteria

- Metrics distinguish exposure, training, recall, real-game use, opening outcome, and final result.
- Every conclusion includes V2 policy/context, sample size and relevant filters.
- The system does not claim causation it cannot support.
- Builder/course identifiers link safely to later game positions.
- Deferred branches can become newly relevant from real-game evidence.
- Results can inform existing-course adaptation and future policy research without automatic writes or silent ranking mutation.
- Tests cover transpositions, no opponent entry, trained-but-unplayed, played deviations, sparse samples, changed target context, and different V2 policy versions.

## Required validation

- domain/API tests;
- database aggregation and performance review;
- migration tests if new linkage metadata is required;
- representative post-V2 before/after data validation;
- architecture checks.

## Completion updates

The report must define the north-star success metrics actually supported, identify required metadata changes, and recommend any new maintenance/progress or policy-calibration tasks. Do not complete RB-016 merely because V2 shipped; the real-use gate must also be met.

## Completion

Report: none

Completed at: none
