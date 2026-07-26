# RB-016 — Measure adoption and real-game outcomes

Status: BLOCKED

Priority: P2

Order: 160

Delivery class: Dual-use

Planning maturity: Placeholder

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

## Outcome

Measure whether repertoire choices produced by the builder are:

- trained;
- remembered;
- selected in later games;
- associated with improved opening-position quality;
- associated with improved results after accounting for context;
- becoming obsolete, weak, or incomplete as new games arrive.

Use those measurements to improve course maintenance and, where justified, Player Chess Profile conclusions.

## Why this task exists

The north star is not successful merely because it generates a large course. The application should eventually close the loop between recommendation, training, real-game use, and new evidence.

## Current repo anchors to inspect

At claim time inspect:

- builder target/decision history and course output metadata;
- training sessions, attempts, and subline stats;
- imported-game plies and course coverage classification;
- opening analysis and tag outcomes;
- account rating/performance periods;
- job/import workflows if recalculation triggers are considered.

## Dependencies

Blocked until builder decisions can be written to courses and used in training/real games. Depends on RB-010 and RB-011 in production use; RB-012 improves maintenance entry points.

## In scope

- define adoption and recall measures;
- connect course decisions to later imported-game positions without overclaiming causality;
- distinguish played move, remembered trained move, deviation, and opponent never entering the line;
- measure opening-position outcomes before and after adoption with context;
- identify newly frequent deferred responses;
- identify regression or recurring course gaps;
- define confidence and minimum samples;
- provide bounded progress/maintenance summaries;
- decide recalculation triggers and whether existing workflows suffice;
- add tests for linkage and outcome classification.

## Out of scope

- claiming causal rating improvement from uncontrolled correlations;
- automatic course rewrites;
- high-frequency background monitoring without need;
- LLM evaluation of outcomes;
- generic achievement systems.

## Open questions to resolve

- What metadata must RB-011 persist to link a decision to a course node?
- What is repertoire adoption versus coincidental move selection?
- How many training attempts indicate learned material?
- How are opponent choices accounted for?
- What comparison window and baseline are valid?
- How are rating, speed, color, and opponent changes controlled?
- When should a deferred response be promoted?
- How is regression displayed without punishing experimentation?

## Acceptance criteria

- Metrics distinguish exposure, training, recall, real-game use, opening outcome, and final result.
- Every conclusion includes context and sample size.
- The system does not claim causation it cannot support.
- Builder/course identifiers link safely to later game positions.
- Deferred branches can become newly relevant from real-game evidence.
- Results can inform existing-course adaptation without automatic writes.
- Tests cover transpositions, no opponent entry, trained-but-unplayed, played deviations, sparse samples, and changed target context.

## Required validation

- domain/API tests;
- database aggregation and performance review;
- migration tests if new linkage metadata is required;
- representative before/after data validation;
- architecture checks.

## Completion updates

The report must define the north-star success metrics actually supported, identify required earlier-task metadata changes, and recommend any new maintenance or progress UI tasks.

## Completion

Report: none

Completed at: none
