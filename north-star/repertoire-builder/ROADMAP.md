# Repertoire Builder Roadmap

Last updated: 2026-08-08

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

Complete through RB-021–RB-025:

1. **RB-021 — research and architecture:** complete through PR #244.
2. **RB-022 — deterministic foundation:** complete through PR #255 with 25 reviewed ordered rules and generated/imported-game audits.
3. **RB-023 — Builder consumer:** complete through PR #262; target-side summaries and plans remain ranking-neutral explanatory evidence.
4. **RB-024 — AI game-review grounding:** complete through PR #268; bounded reviewed plans ground the explicit optional review consumer.
5. **RB-025 — coverage scale and editorial tooling:** implementation merged through PR #302, including stacked completion PR #304. The pinned generated opening book now resolves 3,733/3,733 entries and 3,167/3,167 unique names as `AVAILABLE`, with independent White/Black summary-plus-plan coverage at 100% and 160 exercised reviewed rules.

RB-025 also delivered deterministic generated-book and imported-game-weighted audit models, per-dimension classification uncertainty, side-specific completeness metrics, a deterministic priority backlog, validated batch manifests, source/editorial policy and hard all-book regression gates.

The completion boundary is intentionally finite: 100% applies to the pinned generated opening book, not arbitrary names and not equal theoretical depth for every rare line. Unknown names outside the book remain `UNAVAILABLE`, and narrow reviewed rules may continue to deepen specific families when real use justifies it.

This stage remains independent of the blocked RB-016 outcome gate. Opening knowledge delivers standalone educational value without representing outcome evidence.

## Release condition

The deterministic Builder foundation remains complete: evidence is inspectable, target intent and overrides are explicit, decisions and session transitions are bounded, course writes require preview/apply, exact existing-course launches preserve identity, and optional generated text can be disabled without changing workflow authority.

Opening knowledge is current runtime explanatory evidence with complete strategic-knowledge coverage for the pinned generated book. Candidate ranking, eligibility, Builder state and course writes remain separate deterministic authorities.

Outcome claims remain excluded until RB-016 evidence exists.

## Queue impact

- RB-001 through RB-015 and RB-017 through RB-025 are `DONE` according to their canonical task rows once the final RB-025 reconciliation PR is accepted.
- RB-016 remains `BLOCKED` on real use.
- No dependency-satisfied Repertoire Builder implementation task is currently queued.
- Future opening-knowledge work should be driven by observed depth/quality demand, low-confidence classification cases, imported-game weighting, or upstream opening-book changes rather than nominal coverage-gap filling.
