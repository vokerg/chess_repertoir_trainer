# RB-014 — Research traps knowledge foundation

Status: DONE

Priority: P2

Order: 140

Delivery class: Research

Planning maturity: Complete

Claimed by: ChatGPT session

Claim branch: `rb-014/issue-102-traps-foundation-research`

Claimed at: 2026-07-27

Claim scope: documentation-only discovery of trustworthy trap definitions, source/license strategies, derivation versus curation, data shape, transposition identity, validation workflow, and representative examples. No schema, import, API, Angular, course, ranking, or production capability changes.

Review PR: #113, squash-merged as `d53ff6e2b6eedcbf5f3abcea137373baa0102397`

## Outcome

Determine whether the application can support a trustworthy, maintainable traps knowledge source and what a trap-oriented repertoire target would require.

This task delivered discovery and an approved pilot direction, not a production traps database.

## Accepted recommendation

Proceed with one bounded curated pilot, tracked as RB-017 / #114.

The accepted foundation combines:

- normalized position-and-move identity;
- versioned engine evidence;
- rating/speed-targeted population evidence;
- explicit safe defenses and refutations;
- editorial review and lifecycle state;
- source/license/checksum provenance.

Do not add production persistence, API contracts, Angular UI, builder integration, or course-writing behavior during the pilot.

## Definition established

A trap is a versioned conditional branch pattern where one side reaches a reproducible trigger position, offers or permits a practically tempting opponent response, and has a bounded tactical punishment after that response. Safe alternatives and the trap-setting setup's objective soundness remain explicit.

This distinguishes a trap from:

- a gambit, which is a voluntary material investment and may not depend on an opponent error;
- a tactical motif, which is a reusable pattern rather than a branch identity;
- an opening mistake, which may have no intentional temptation or recognizable punishment;
- a dubious line, which may contain a trap but must retain a separate risk classification.

## Repository findings

- normalized FEN plus move transitions are the correct stable identity;
- opening ECO/name is descriptive metadata, not identity;
- multiple move orders reaching one trigger are setup routes for the same occurrence;
- related but non-identical triggers may share a trap family;
- tactical detections provide the closest version/hash/run/provenance precedent;
- existing Stockfish and Opening Explorer boundaries can supply future evidence;
- course tags, notes, comments, annotations, labels, and weights are output surfaces, not a canonical knowledge store.

## Source decision

Suitable inputs:

- CC0 Lichess puzzle, game, and evaluated-position exports;
- CC0 `lichess-org/chess-openings` labels;
- original application engine/population analysis;
- original reviewed editorial text.

Discovery leads only:

- public studies;
- videos;
- forums and blogs;
- books and commercial trap collections;
- any source without explicit reusable licensing.

User-generated Lichess content is not automatically CC0.

## Representative examples

The report tests the model against:

1. Légal trap — sound tactical offer, tempting queen capture, forced mate, and explicit safe alternatives;
2. Blackburne–Shilling — practical temptation with a dubious trap-setting move, proving soundness must remain separate;
3. Fishing Pole — multiple routes, defenses, and family/occurrence ambiguity.

No numerical success rate is asserted.

## Validation assessment

Completed:

- direct repository inspection of opening lookup, normalized positions, PositionAnalysis, tactical detection, scenario training, explorer, course, and provenance patterns;
- official source/license verification;
- legal move sequences and normalized trigger positions documented for representative examples;
- reproducible engine and population snapshot protocols defined using existing repository boundaries;
- source limitations, licensing risks, and update/version rules documented;
- complete repository CI passed on PR #113.

Not executed during discovery:

- exact Stockfish snapshots for the named examples;
- authenticated Lichess Explorer snapshots.

These are mandatory acceptance gates for RB-017. The report intentionally does not fabricate values.

## Dependencies

Independent from the core MVP.

Coordinate with RB-003 only for optional opening labels and with RB-007 before any future candidate-evidence contract is proposed.

## Product impact

- RB-006 remains unchanged. A future trap-oriented persona is a target preference, not a factual mutation.
- RB-007 remains unchanged. Future optional trap evidence must remain separate from engine, population, master, personal, and theory evidence.
- RB-003 is not a blocker for trap identity.
- no critical-path dependency is added.

## Acceptance assessment

- Precise definition distinguishes traps from related concepts: met.
- At least two source strategies are compared: met; puzzle seed, derived population/engine mining, and editorial curation are compared.
- Proposed model represents practical appeal and objective risk: met.
- Several real examples validate or challenge the model: met.
- Licensing and update risks are recorded: met.
- Report recommends proceed, revise, or defer: met; the bounded pilot was approved.
- No production capability is claimed without implementation: met.
- Reproducible engine/population protocol is documented: met.
- Exact named-example engine/population snapshots: transferred to RB-017 as its first hard gate; no values are invented.

## Out of scope preserved

- no bulk dataset import;
- no LLM factual trap generation;
- no production builder integration;
- no promised success rates;
- no course/opening schema changes;
- no new dependency.

## Completion disposition

- RB-D027 is accepted as the pilot foundation and will be tested by RB-017.
- One bounded pilot issue was created: RB-017 / #114.
- RB-006 and RB-007 remain untouched unless the pilot demonstrates a concrete contract requirement.
- Issue #102 is closed as completed.
- The research report remains the authoritative discovery evidence.

## Completion

Report: `reports/RB-014-2026-07-27-traps-foundation-discovery.md`

Completed at: 2026-07-27