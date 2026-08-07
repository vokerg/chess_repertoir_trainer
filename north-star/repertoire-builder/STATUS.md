# Repertoire Builder Program Status

Last updated: 2026-08-06

## Current state

**Program state:** the deterministic Repertoire Builder capability chain, static opening-knowledge foundation, focused Builder knowledge consumer and bounded opening-grounded game-review consumer are complete. RB-025's deterministic coverage and editorial-tooling foundation is in review through PR #302. RB-016 remains independently blocked on sufficient real Builder/course usage and follow-up-game evidence.

**Runtime on `main`:** peer population/level resolution, deterministic opening classification, Player Chess Profile calculation and `/progress/profile`, versioned repertoire targets, profile-derived editable defaults, deterministic candidate evidence/ranking, bounded session/queue semantics, the authenticated Builder workbench, mandatory course preview/apply, exact existing-course entry points, static side-aware opening knowledge, focused target-side knowledge presentation, and the optional disabled-by-default generated interpretation prototypes are integrated.

**Opening-knowledge baseline:** `OpeningKnowledgeService` contains 25 ordered reviewed rules. Generated-entry knowledge is 1,352 `AVAILABLE` (36.2%), 299 `PARTIAL` (8.0%) and 2,082 `UNAVAILABLE` (55.8%). Each side is independently useful for 1,651 entries (44.2%). Classification has all measured dimensions for 3,697 entries (99.0%) per side, but only 2,526 entries (67.7%) are fully specified at high confidence.

**RB-025 review:** issue #290 is represented by coordination PR #300 and review PR #302. The delivery adds deterministic generated/imported coverage models, independent White/Black completeness, per-dimension classification uncertainty, a versioned priority backlog, validated editorial batch manifests, coverage targets and source/reviewer policy. The first six-family content manifest remains `DRAFT` and contains no runtime prose.

**Execution ownership:** RB-021 / #240 is complete through PR #244. RB-022 / #241 is complete through PR #255. RB-023 / #242 is complete through PR #262. RB-024 / #243 is complete through PR #268. RB-025 / #290 is in review through PR #302. Program tracker: #105.

## Completed capability chain

1. **Evidence foundations:** RB-001, RB-002, RB-003 and RB-018.
2. **Player profile:** RB-004 and RB-005.
3. **Target and decisions:** RB-006, RB-013 and RB-007.
4. **Interaction and lifecycle:** RB-008, RB-009 and RB-010.
5. **Course materialization:** RB-011 and RB-012.
6. **Specialized research and knowledge:** RB-014, RB-017, RB-015, RB-021, RB-022, RB-023 and RB-024.
7. **Optional interpretation prototypes:** RB-019 and RB-020, plus RB-024 as a bounded game-review grounding enhancement.

## Review and blocked work

- **RB-025:** research/tooling foundation in review; exact-head CI on PR #302 is a mandatory acceptance gate.
- **RB-016:** independently blocked on real adoption and outcome evidence.

No other dependency-satisfied Repertoire Builder task is currently queued.

## Locked boundaries preserved

- Intrinsic classification, static opening knowledge, target-population behavior, player behavior and repertoire intent remain separate concepts.
- Candidate ranking, Builder reducers/queue and course preview/apply remain deterministic authorities.
- Opening knowledge is explanatory and does not alter ranking or course writes.
- Generated interpretation remains optional, explicit, gated and non-authoritative.
- Public opening-assessment theory is assembled from reviewed knowledge and validated structured claims, not free-form provider prose.
- RB-017 remains a research fixture rather than a production traps capability.
- RB-025 does not turn nominal rule matching into a claim of semantic completeness.
- Editorial priority scores cannot enter runtime candidate ranking or course materialization.

## Residual risks

- Strategic opening prose can overgeneralize and requires source/revision governance.
- The first batch is `DRAFT`; its family-specific strategic claims and sources are not reviewed.
- CI's migrated database has zero imported games, so real imported-game-weighted priority evidence remains unavailable in this environment.
- Generated-family breadth can overvalue obscure names relative to real player demand.
- Broad Ruy Lopez and Italian inheritance require careful narrow exceptions.
- Priority weights may need a new version after evidence from applied batches.
- RB-016 outcome claims remain unavailable until real usage evidence exists.

## Queue recommendation

Review PR #302 and require its exact-head CI to pass. After acceptance, run the weighted audit in a populated owner-controlled environment before promoting `rb-025-generated-priority-batch-001` from `DRAFT`. Keep RB-016 blocked until its real-use gate is satisfied.
