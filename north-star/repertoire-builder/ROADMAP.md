# Repertoire Builder Roadmap

Last updated: 2026-08-06

This roadmap records capability stages and decision gates. Detailed implementation history lives in task and report files.

## Stage 0 — program foundation

Complete. Repository planning, execution protocol and GitHub issue coordination are integrated.

## Stage 1 — reusable evidence foundations

Complete through RB-001, RB-002, RB-003 and RB-018: peer population/level resolution plus deterministic side-aware opening classification and coverage auditing.

## Stage 2 — Player Chess Profile

Complete through RB-004 and RB-005. The deterministic API/contract and authenticated `/progress/profile` experience are on `main` through the stacked integration ending in PR #135.

Gate: passed with populated-data latency and direct desktop/mobile review retained as deferred product evidence, not claimed validation.

## Stage 3 — target, personas and candidate decisions

Complete through RB-006, RB-013 and RB-007: versioned target intent, optional editable profile-derived defaults, exact override provenance, deterministic candidate evidence and explainable ranking.

Gate: passed.

## Stage 4 — visual decision proof

Complete through RB-008. The accepted direction is a focused setup flow and one routed board-first workbench.

## Stage 5 — Builder lifecycle and MVP

Complete through RB-009 and RB-010: serializable bounded session/queue semantics and the authenticated interactive Builder.

Gate: passed for route-local bounded construction.

## Stage 6 — course materialization and adaptation

Complete through RB-011 and RB-012: mandatory preview, explicit transactional apply, and exact Course-ending/Opponent-gap entry points.

Gate: passed for existing-owned-chapter materialization and exact coverage extension.

## Stage 7 — specialized research and optional intelligence

Complete through RB-014, RB-017, RB-015, RB-019 and RB-020.

- The traps pilot proves deterministic evidence/review architecture but recommends revision before production.
- Generated interpretation remains independently gated, explicit, transient, non-authoritative and removable.

Gate: prior research complete; any production traps or AI enablement work requires a new evidence-backed task.

## Stage 8 — outcome feedback

Blocked through RB-016 until sufficient Builder-created/course-applied material has been trained, played and followed by measurable games.

Required future evidence includes adoption, recall, opening-position quality, results and regression/coverage signals. No honest implementation specification exists before that usage gate.

## Stage 9 — opening knowledge enrichment

The architecture and initial consumer sequence is complete:

1. **RB-021 — research and architecture:** complete through PR #244.
2. **RB-022 — deterministic foundation:** complete through PR #255 with 25 reviewed ordered rules and generated/imported-game audits.
3. **RB-023 — Builder consumer:** complete through PR #262; target-side summaries and plans remain ranking-neutral explanatory evidence.
4. **RB-024 — AI game-review grounding:** complete through PR #268; bounded reviewed plans ground the explicit optional review consumer.

The next scale gate is **RB-025 / #290**, claimed on `rb-025/issue-290-coverage-scale-research`.

RB-025 delivery sequence:

1. reconcile canonical metadata and establish explicit coverage tiers;
2. measure generated-entry, unique-name and imported-game-weighted knowledge coverage;
3. measure independent White/Black completeness and classification uncertainty by dimension;
4. produce a deterministic prioritized backlog and bounded batch-manifest format;
5. define reviewer workflow, source policy, stale-content handling and coverage targets;
6. select the first reviewed implementation batch from the accepted backlog;
7. expand runtime rules incrementally while recording measurable coverage gains.

The first claimed delivery excludes bulk runtime prose, classification changes, ranking changes, persistence and new runtime endpoints.

Gate for the first content-expansion batch: accepted RB-025 research report with explicit targets, deterministic prioritization, source/reviewer policy and representative regression fixtures.

This stage remains independent of the blocked RB-016 outcome gate. Opening knowledge delivers standalone educational value without representing outcome evidence.

## Release condition

The deterministic Builder foundation remains complete: evidence is inspectable, target intent and overrides are explicit, decisions and session transitions are bounded, course writes require preview/apply, exact existing-course launches preserve identity, and optional generated text can be disabled without changing workflow authority.

Opening knowledge is part of current runtime as explanatory evidence. Coverage expansion must preserve the ranking-neutral authority boundary and explicit unavailable/partial states.

Outcome claims remain excluded until RB-016 evidence exists.

## Queue impact

- RB-001 through RB-015 and RB-017 through RB-024 are `DONE` according to their canonical task rows.
- RB-016 remains `BLOCKED` on real use.
- RB-025 is `CLAIMED` and is the only active dependency-satisfied Repertoire Builder task.
- Future content batches must be derived from the reviewed RB-025 backlog rather than added ad hoc.
