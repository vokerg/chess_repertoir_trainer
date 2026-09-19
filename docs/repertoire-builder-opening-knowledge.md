# Repertoire Builder opening knowledge

The Repertoire Builder receives static reviewed opening knowledge through the existing authenticated candidate-decision response. Angular does not perform a second opening lookup.

## Candidate evidence

Candidate-decision contract `2026-08-v2` adds `evidence.opening.knowledge` beside the existing intrinsic opening classification.

The knowledge projection contains:

- explicit `AVAILABLE`, `PARTIAL` or `UNAVAILABLE` status;
- independently versioned knowledge identity;
- concise description and repertoire-side strategic summary;
- at most three reviewed plans for the target side;
- bounded conditions, caveats, confidence, matched rule IDs and source IDs.

`CandidateDecisionService` resolves the candidate's resulting opening and classification first, then passes the same authoritative entry and classification into `OpeningKnowledgeService`. White or Black content is selected from `request.target.side`.

## Builder presentation

Opening knowledge is rendered only in the focused evidence grid for the currently previewed candidate. It is not repeated in every candidate row.

The grid shows the side-specific strategic summary and one compact row per returned plan. Conditions and caveats remain attached to that plan. When knowledge is unavailable, the existing opening profile remains usable and the UI states that reviewed strategic knowledge is unavailable.

Candidate switching selects a different candidate evidence object, so knowledge cannot remain associated with a previously previewed move.

## Authority boundary

Opening knowledge is explanatory. It does not alter:

- candidate ranking or eligibility;
- target/profile fit;
- opponent-response coverage;
- Builder reducers, queue, revisions or selections;
- course preview or apply behavior;
- optional generated interpretation inputs.

The ranking policy version therefore remains `2026-07-deterministic-v1` while the candidate contract version changes.
