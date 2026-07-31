# Repertoire Builder Program Status

Last updated: 2026-07-31

## Current state

**Program state:** every dependency-satisfied Repertoire Builder task is complete. RB-016 is the sole unfinished task and remains blocked on sufficient real Builder/course usage and follow-up-game evidence.

**Runtime on `main`:** peer population/level resolution, deterministic opening classification, Player Chess Profile calculation and `/progress/profile`, versioned repertoire targets, profile-derived editable defaults, deterministic candidate evidence/ranking, bounded session/queue semantics, the authenticated Builder workbench, mandatory course preview/apply, exact existing-course entry points, and the two optional disabled-by-default generated interpretation prototypes are integrated.

**Research on `main`:** the traps foundation and bounded RB-017 evidence pilot are complete. RB-017 recommends revision before any production traps capability.

**Execution ownership:** there is no open or unclaimed dependency-satisfied North Star implementation work after closure reconciliation. Program tracker: #105.

## Completed capability chain

1. **Evidence foundations:** RB-001, RB-002, RB-003 and RB-018.
2. **Player profile:** RB-004 and RB-005, integrated through stacked PR #135; residual populated-data/browser review remains deferred product evidence.
3. **Target and decisions:** RB-006, RB-013 and RB-007.
4. **Interaction and lifecycle:** RB-008, RB-009 and RB-010.
5. **Course materialization:** RB-011 and RB-012.
6. **Specialized research:** RB-014, RB-017 and RB-015.
7. **Optional interpretation prototypes:** RB-019 and RB-020.

## Recent accepted closures

- **RB-004:** deterministic profile API/contract is `DONE`; integration commit `07299fd3`; CI #1103.
- **RB-005:** profile experience is `DONE`; integration commit `07299fd3`; CI #1208. No authenticated populated-data desktop/mobile walkthrough is claimed.
- **RB-013:** profile-to-Builder defaults are `DONE`; implementation `4d57e140`; closure `9feb925d`.
- **RB-017:** bounded traps pilot is `DONE`; implementation `38bf745d`; CI #1725. Review output is 1 approved, 1 downgraded, 1 rejected and 47 evidence-bound unresolved records.

## Locked boundaries

- Profile evidence remains descriptive; target intent and manual overrides remain user-controlled.
- Candidate ranking, Builder reducers/queue and course preview/apply remain deterministic authorities.
- Generated interpretation remains optional, transient, disabled by default and non-authoritative.
- RB-017 adds no production persistence, public contract, Angular UI, course write or Builder ranking input.
- Outcome claims are not implied by feature completion; RB-016 requires real evidence.

## Residual risks

- Profile evidence bands are descriptive rather than significance tests; long-tail groups may be truncated and cross-provider duplicates may remain.
- RB-005 populated-data and responsive browser review is deferred rather than represented as passed.
- Builder limits, ranking weights and route-local state require normal product-use calibration.
- Optional AI prototypes require current provider/privacy verification before enablement.
- The trap pilot corpus is not production-ready and requires record-by-record editorial completion before any product use.

## Queue recommendation

Keep task order and priorities unchanged. Do not start RB-016 until the documented usage gate is genuinely satisfied. Create any production traps, persisted Builder intent or new AI enablement task only from demonstrated product need.
