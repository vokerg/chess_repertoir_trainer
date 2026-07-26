# RB-014 — Research traps knowledge foundation

Status: READY

Priority: P2

Order: 140

Delivery class: Research

Planning maturity: Open

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

## Outcome

Determine whether the application can support a trustworthy, maintainable traps knowledge source and what a trap-oriented repertoire target would require.

This is discovery, not a commitment to build a traps database.

## Why this task exists

The user may want trap-based courses or candidate choices. A trap cannot be represented responsibly as merely a popular dubious move. It needs a definition, source, trigger, tempting response, punishment, refutation, soundness context, and target-population relevance.

## Current repo anchors to inspect

- opening book identity and move sequences;
- position normalization and opening lookup;
- tactical detection/scenario models;
- masters/population explorer evidence;
- course tree and annotations;
- any existing tags or notes suitable for trap metadata;
- licensing documentation patterns for vendored datasets.

## Dependencies

Independent from the core MVP.

Should coordinate with RB-003 to avoid conflicting opening identifiers and with RB-007 before proposing candidate evidence integration.

## In scope

- define candidate meanings of `trap` and distinguish them from gambit, tactical motif, opening mistake, and dubious line;
- research available public/licensable data sources and their coverage;
- identify whether traps can be derived from population plus engine evidence or require curation;
- propose a data model including trigger position, tempting move, punishment, escape/refutation, side, opening identity, soundness, severity, rating/speed relevance, source, confidence, and version;
- evaluate transposition and move-order issues;
- propose validation and review workflow;
- provide several real examples to test the model;
- recommend whether implementation should proceed and create follow-up tasks if approved.

## Out of scope

- bulk importing an unreviewed dataset;
- LLM generation of factual traps without verification;
- production builder integration;
- promising tactical success rates from insufficient data;
- changing course or opening schemas during discovery.

## Open questions to resolve

- Is a trap defined by objective error, practical temptation, or both?
- Must the trapping side's preceding move be sound?
- How many plies define the trap?
- How are multiple defensive escapes represented?
- How is `works at target rating/speed` calculated?
- Can trap identity be stable across transpositions?
- What licenses and attribution are required?
- How are obsolete or refuted traps versioned?

## Acceptance criteria

- A precise proposed definition distinguishes traps from related concepts.
- At least two source strategies are compared.
- A proposed model represents both practical appeal and objective risk.
- Several real examples validate or challenge the model.
- Licensing and update risks are recorded.
- The report recommends proceed, revise, or defer.
- No production capability is claimed without implementation.

## Required validation

- source/license verification;
- reproducible example analysis where engine/population data is used;
- no application build for documentation-only discovery.

## Completion updates

Update RB-D027 and create separate implementation/integration tasks only after user approval. State whether RB-006/RB-007 need forward-compatible changes now or should remain untouched.

## Completion

Report: none

Completed at: none
