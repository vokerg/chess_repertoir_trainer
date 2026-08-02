# Repertoire Builder Program Status

Last updated: 2026-08-02

## Current state

**Program state:** the deterministic Repertoire Builder capability chain, static opening-knowledge foundation and focused Builder knowledge consumer are complete. RB-024 is the next dependency-satisfied stretch consumer. RB-016 remains independently blocked on sufficient real Builder/course usage and follow-up-game evidence.

**Runtime on `main`:** peer population/level resolution, deterministic opening classification, Player Chess Profile calculation and `/progress/profile`, versioned repertoire targets, profile-derived editable defaults, deterministic candidate evidence/ranking, bounded session/queue semantics, the authenticated Builder workbench, mandatory course preview/apply, exact existing-course entry points, static side-aware opening knowledge, focused target-side knowledge presentation, and the two optional disabled-by-default generated interpretation prototypes are integrated.

**Opening knowledge integration:** RB-022 supplies the separate reviewed `OpeningKnowledgeService` and corpus. RB-023 / PR #262 versions candidate evidence, projects bounded target-side summaries/plans through `CandidateDecisionService`, renders them in the existing focused evidence grid and snapshots the independent knowledge version. Ranking, eligibility, fit, coverage, Builder state and course writes remain unchanged.

**Execution ownership:** RB-021 / #240 is complete through PR #244. RB-022 / #241 is complete through PR #255. RB-023 / #242 is complete through PR #262. RB-024 / #243 is dependency-satisfied but remains a lower-priority P3 stretch consumer. Program tracker: #105.

## Completed capability chain

1. **Evidence foundations:** RB-001, RB-002, RB-003 and RB-018.
2. **Player profile:** RB-004 and RB-005.
3. **Target and decisions:** RB-006, RB-013 and RB-007.
4. **Interaction and lifecycle:** RB-008, RB-009 and RB-010.
5. **Course materialization:** RB-011 and RB-012.
6. **Specialized research and knowledge:** RB-014, RB-017, RB-015, RB-021, RB-022 and RB-023.
7. **Optional interpretation prototypes:** RB-019 and RB-020.

## Active and blocked work

- **RB-024:** dependency-satisfied P3 stretch consumer for optional game-review grounding.
- **RB-016:** independently blocked on real adoption and outcome evidence.

## Locked boundaries preserved

- Intrinsic classification, static opening knowledge, target-population behavior, player behavior and repertoire intent remain separate concepts.
- Candidate ranking, Builder reducers/queue and course preview/apply remain deterministic authorities.
- Opening knowledge is explanatory and does not alter ranking or course writes.
- Generated interpretation remains optional, explicit, gated and non-authoritative.
- RB-017 remains a research fixture rather than a production traps capability.

## Residual risks

- Strategic opening prose can overgeneralize and requires source/revision governance.
- Initial knowledge coverage is intentionally incomplete and must remain weighted by actual games separately from generated-name count.
- Authenticated live-browser validation was unavailable for RB-023; contract/API/store/view-model coverage and the complete production web build/test suite are the recorded validation evidence.
- RB-016 outcome claims remain unavailable until real usage evidence exists.

## Queue recommendation

Treat RB-024 as the next optional North Star task. Do not start RB-016 before its usage gate is genuinely satisfied.
