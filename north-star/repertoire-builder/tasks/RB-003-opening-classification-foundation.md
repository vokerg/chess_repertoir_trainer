# RB-003 — Establish named opening classification foundation

Status: PROPOSED

Priority: P0

Order: 30

Delivery class: Dual-use

Planning maturity: Placeholder

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

## Outcome

Establish an independently reviewed foundation through which every named opening used by the application can eventually expose a side-aware intrinsic opening profile.

The north-star program requires the capability, but deliberately does not prescribe how classification is produced.

## Why this task exists

Player-profile conclusions and repertoire candidate fit need a stable vocabulary for opening character, soundness, theoretical status, and learning burden. The same taxonomy would improve opening browsing and analysis independently.

The user explicitly chose to leave the classification solution blank for now and solve it as its own roadmap item. This task must respect that boundary.

## Current repo anchors to inspect

When claimed, inspect:

- generated Lichess opening-book source, update script, types, and lookup service;
- opening assignment on imported games;
- exact-name/ECO/FEN/move lookup behavior and transpositions;
- any newly introduced opening population explorer;
- data volume, duplicate names, ECO breadth, and stable identifiers;
- canonical docs for opening book and imported-game opening assignment.

## Dependencies

Independent from RB-001 and RB-002.

RB-004, RB-006, and RB-007 need either this task's output or an explicitly approved limited fallback.

## In scope for the first claimed slice

Because planning is intentionally blank, the first claim should normally be discovery and decision work, not mass implementation.

Expected discovery outputs:

- inventory of opening entries and identity problems;
- proposed stable opening/variation key;
- proposed relationship between named variations, families, and move-sequence prefixes;
- candidate side-aware taxonomy dimensions;
- options for curated, derived, inherited, generated, or hybrid classification;
- confidence and versioning options;
- validation strategy for complete coverage;
- maintenance/update workflow;
- data and licensing considerations;
- recommendation whether implementation should be split into additional tasks.

Production implementation may be included only when the user approves a sufficiently specific approach and the claim scope records it.

## Explicitly not decided by this task file

- exact categories or numeric axes;
- manual versus automated classification;
- LLM use;
- inheritance rules;
- database versus generated source;
- whether every deep variation receives unique overrides;
- confidence thresholds;
- visual presentation.

Do not treat examples such as sharp, tactical, solid, mainline, principal, or dubious as a complete mutually exclusive enum without analysis.

## Out of scope

- player-profile aggregation;
- repertoire candidate ranking;
- population move extraction;
- traps database design, except documenting overlap risks;
- silently modifying generated upstream opening data.

## Acceptance criteria for discovery completion

- The current opening dataset and lookup behavior are documented from inspected code and data.
- Stable identity and transposition issues are demonstrated with real examples.
- At least two credible classification approaches are compared with tradeoffs.
- The proposed taxonomy is side-aware and multidimensional or explains why not.
- A complete-coverage validation strategy is described.
- The user reviews and approves, revises, or rejects the proposed direction.
- Follow-up implementation tasks are created rather than hiding an enormous implementation under this placeholder.

## Required validation

For discovery-only work:

- deterministic scripts or queries used for inventory should be included or their method documented;
- no application build is required unless repository code changes;
- any generated data sample must be reproducible.

For later implementation work, validation must be defined by the approved architecture.

## Completion updates

The report must state whether this task closes as discovery and creates implementation tasks, or whether it delivered a complete foundation. Update RB-D012/RB-D013 and all dependent tasks.

## Completion

Report: none

Completed at: none
