# Repertoire Builder Roadmap

Last updated: 2026-07-31

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

Research review is active through RB-021 / #240.

Recommended capability sequence:

1. **RB-021 — research and architecture:** separate static side-aware opening knowledge from classification while reusing stable classification rule provenance.
2. **RB-022 — deterministic foundation:** implement reviewed descriptions, White/Black plans, conditions/caveats, source provenance, validation and bounded coverage audits.
3. **RB-023 — Builder consumer:** project compact target-side knowledge through existing candidate opening evidence without changing ranking or session authority.
4. **RB-024 — AI game-review stretch:** optionally ground the existing on-demand review in reviewed plans after the deterministic corpus proves useful.

Gate for RB-022: explicit acceptance of the RB-021 hybrid selector, merge semantics and source/editorial policy.

Gate for RB-023: reviewed RB-022 service, corpus and contract projection decision.

Gate for RB-024: reviewed RB-022 knowledge identity plus evidence that plan grounding improves game-review usefulness without encouraging unsupported claims.

This stage is independent of the blocked RB-016 outcome gate. Opening knowledge may deliver standalone educational value without representing outcome evidence.

## Release condition

The deterministic Builder foundation remains complete: evidence is inspectable, target intent and overrides are explicit, decisions and session transitions are bounded, course writes require preview/apply, exact existing-course launches preserve identity, and optional generated text can be disabled without changing workflow authority.

Opening knowledge is not part of the current release condition until RB-021 is accepted and follow-on implementation is delivered. Outcome claims remain excluded until RB-016 evidence exists.

## Queue impact

- RB-001 through RB-015, RB-017 through RB-020 are `DONE` according to their canonical task rows.
- RB-016 remains `BLOCKED` on real use.
- RB-021 is `REVIEW`.
- RB-022, RB-023 and RB-024 are `BLOCKED` on their explicit dependencies.
- If RB-021 is accepted, RB-022 becomes the next dependency-satisfied P1 task; no other priority change is recommended.
