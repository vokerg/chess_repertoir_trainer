# Repertoire Builder Program Status

Last updated: 2026-08-01

## Current state

**Program state:** the deterministic Repertoire Builder capability chain remains complete. RB-021 is accepted and complete. RB-022 is the next dependency-satisfied P1 task. RB-016 remains independently blocked on sufficient real Builder/course usage and follow-up-game evidence.

**Runtime on `main`:** peer population/level resolution, deterministic opening classification, Player Chess Profile calculation and `/progress/profile`, versioned repertoire targets, profile-derived editable defaults, deterministic candidate evidence/ranking, bounded session/queue semantics, the authenticated Builder workbench, mandatory course preview/apply, exact existing-course entry points, and the two optional disabled-by-default generated interpretation prototypes are integrated.

**Accepted opening knowledge architecture:** a separate source-controlled `OpeningKnowledgeService` will primarily reuse classification rule IDs, permit narrow knowledge-only selectors, return reviewed White/Black plans with deterministic inheritance/override semantics, and require no database or runtime AI/web lookup.

**Execution ownership:** RB-021 / #240 is complete through PR #244. RB-022 / #241 is open and ready to claim. RB-023 / #242 and RB-024 / #243 remain open and blocked by RB-022. Program tracker: #105.

## Completed capability chain

1. **Evidence foundations:** RB-001, RB-002, RB-003 and RB-018.
2. **Player profile:** RB-004 and RB-005.
3. **Target and decisions:** RB-006, RB-013 and RB-007.
4. **Interaction and lifecycle:** RB-008, RB-009 and RB-010.
5. **Course materialization:** RB-011 and RB-012.
6. **Specialized research:** RB-014, RB-017, RB-015 and RB-021.
7. **Optional interpretation prototypes:** RB-019 and RB-020.

## Active and blocked work

- **RB-022:** ready to implement the accepted static knowledge service, validators, audits and bounded corpus.
- **RB-023:** blocked until RB-022 provides a reviewed service and corpus.
- **RB-024:** blocked until RB-022 provides stable reviewed knowledge identity; remains a P3 stretch consumer.
- **RB-016:** independently blocked on real adoption and outcome evidence.

## Locked boundaries preserved

- Intrinsic classification, static opening knowledge, target-population behavior, player behavior and repertoire intent remain separate concepts.
- Candidate ranking, Builder reducers/queue and course preview/apply remain deterministic authorities.
- Opening knowledge is explanatory and does not alter ranking or course writes.
- Generated interpretation remains optional, explicit, gated and non-authoritative.
- RB-017 remains a research fixture rather than a production traps capability.

## Residual risks

- Strategic opening prose can overgeneralize and requires source/revision governance.
- Initial knowledge coverage will be intentionally incomplete and should be weighted by actual games rather than generated-name count alone.
- Profile and Builder hands-on calibration risks remain as documented in their completed tasks.
- RB-016 outcome claims remain unavailable until real usage evidence exists.

## Queue recommendation

Run RB-022 as the next P1 foundation. Keep RB-023 as a P2 Builder consumer and RB-024 as an independent P3 stretch consumer. Do not start RB-016 before its usage gate is genuinely satisfied.
