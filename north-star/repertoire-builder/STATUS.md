# Repertoire Builder Program Status

Last updated: 2026-07-31

## Current state

**Program state:** the deterministic Repertoire Builder capability chain remains complete. RB-016 is blocked on sufficient real Builder/course usage and follow-up-game evidence. RB-021 is in review with a proposed side-aware opening knowledge foundation; RB-022 through RB-024 remain blocked on that research and implementation sequence.

**Runtime on `main`:** peer population/level resolution, deterministic opening classification, Player Chess Profile calculation and `/progress/profile`, versioned repertoire targets, profile-derived editable defaults, deterministic candidate evidence/ranking, bounded session/queue semantics, the authenticated Builder workbench, mandatory course preview/apply, exact existing-course entry points, and the two optional disabled-by-default generated interpretation prototypes are integrated.

**Opening knowledge research:** branch `rb-021/issue-240-opening-knowledge-research` recommends a separate source-controlled `OpeningKnowledgeService` that primarily reuses classification rule IDs, permits narrow knowledge-only selectors, returns reviewed White/Black plans with deterministic inheritance/override semantics, and requires no database or runtime AI/web lookup.

**Execution ownership:** RB-021 / #240 is assigned and in research review. RB-022 / #241, RB-023 / #242 and RB-024 / #243 are open and blocked by their documented dependencies. Program tracker: #105.

## Completed capability chain

1. **Evidence foundations:** RB-001, RB-002, RB-003 and RB-018.
2. **Player profile:** RB-004 and RB-005.
3. **Target and decisions:** RB-006, RB-013 and RB-007.
4. **Interaction and lifecycle:** RB-008, RB-009 and RB-010.
5. **Course materialization:** RB-011 and RB-012.
6. **Specialized research:** RB-014, RB-017 and RB-015.
7. **Optional interpretation prototypes:** RB-019 and RB-020.

## Active review and blocked follow-ons

- **RB-021:** research review package at `reports/RB-021-2026-07-31-opening-knowledge-foundation.md`.
- **RB-022:** blocked until the RB-021 architecture and editorial/source policy are accepted.
- **RB-023:** blocked until RB-022 provides a reviewed service and bounded corpus.
- **RB-024:** blocked until RB-022 provides stable reviewed knowledge identity; remains a P3 stretch consumer.
- **RB-016:** independently blocked on real adoption and outcome evidence.

## Locked boundaries preserved

- Intrinsic classification, static opening knowledge, target-population behavior, player behavior and repertoire intent remain separate evidence concepts.
- Candidate ranking, Builder reducers/queue and course preview/apply remain deterministic authorities.
- Opening knowledge is proposed as explanatory evidence and does not alter ranking or course writes.
- Generated interpretation remains optional, explicit, gated and non-authoritative.
- RB-017 remains a research fixture rather than a production traps capability.

## Residual risks

- The RB-021 recommendation requires user review before becoming a locked architecture decision.
- Strategic opening prose is editorial, can overgeneralize and needs revision/source governance.
- Initial opening knowledge coverage will be intentionally incomplete and should be weighted by actual games rather than generated-name count alone.
- Profile and Builder hands-on calibration risks remain as documented in their completed tasks.
- RB-016 outcome claims remain unavailable until real usage evidence exists.

## Queue recommendation

Review RB-021 before starting implementation. If accepted, run RB-022 as the next P1 foundation; keep RB-023 as a P2 Builder consumer and RB-024 as an independent P3 stretch consumer. Do not start RB-016 before its usage gate is genuinely satisfied.
