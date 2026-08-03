# Repertoire Builder Program Status

Last updated: 2026-08-03

## Current state

**Program state:** the deterministic Repertoire Builder capability chain, static opening-knowledge foundation and focused Builder knowledge consumer are complete. RB-024 is implemented and in review as the final currently unblocked optional stretch consumer. RB-016 remains independently blocked on sufficient real Builder/course usage and follow-up-game evidence.

**Runtime on `main`:** peer population/level resolution, deterministic opening classification, Player Chess Profile calculation and `/progress/profile`, versioned repertoire targets, profile-derived editable defaults, deterministic candidate evidence/ranking, bounded session/queue semantics, the authenticated Builder workbench, mandatory course preview/apply, exact existing-course entry points, static side-aware opening knowledge, focused target-side knowledge presentation, and the two optional disabled-by-default generated interpretation prototypes are integrated.

**RB-024 review package:** PR #268 grounds the existing explicit AI game review with bounded user-side reviewed opening knowledge, validates structured plan references and verifies stored-review input identity before reuse. It adds no automatic provider call, ranking, Builder state, course write or runtime opening research. Complete exact-head validation is the review-ready gate and is recorded on the pull request.

**Execution ownership:** RB-021 / #240 is complete through PR #244. RB-022 / #241 is complete through PR #255. RB-023 / #242 is complete through PR #262. RB-024 / #243 is implemented in PR #268 and pending maintainer review. Program tracker: #105.

## Completed capability chain

1. **Evidence foundations:** RB-001, RB-002, RB-003 and RB-018.
2. **Player profile:** RB-004 and RB-005.
3. **Target and decisions:** RB-006, RB-013 and RB-007.
4. **Interaction and lifecycle:** RB-008, RB-009 and RB-010.
5. **Course materialization:** RB-011 and RB-012.
6. **Specialized research and knowledge:** RB-014, RB-017, RB-015, RB-021, RB-022 and RB-023.
7. **Optional interpretation prototypes:** RB-019 and RB-020; RB-024 is in review as a bounded game-review grounding enhancement.

## Active and blocked work

- **RB-024:** implemented in PR #268; maintainer review and integration pending.
- **RB-016:** independently blocked on real adoption and outcome evidence.

No additional dependency-satisfied Repertoire Builder task is currently queued after RB-024.

## Locked boundaries preserved

- Intrinsic classification, static opening knowledge, target-population behavior, player behavior and repertoire intent remain separate concepts.
- Candidate ranking, Builder reducers/queue and course preview/apply remain deterministic authorities.
- Opening knowledge is explanatory and does not alter ranking or course writes.
- Generated interpretation remains optional, explicit, gated and non-authoritative.
- RB-017 remains a research fixture rather than a production traps capability.

## Residual risks

- Strategic opening prose can overgeneralize and requires source/revision governance.
- Initial knowledge coverage is intentionally incomplete and must remain weighted by actual games separately from generated-name count.
- RB-024 has deterministic client/service coverage but no live configured-provider validation in the execution environment.
- RB-016 outcome claims remain unavailable until real usage evidence exists.

## Queue recommendation

Complete maintainer review and integration of RB-024. After that, do not start RB-016 before its usage gate is genuinely satisfied; new work requires new planning or newly available outcome evidence.
