# Repertoire Builder Roadmap

Last updated: 2026-08-10

This roadmap records capability stages and decision gates. Detailed implementation history lives in task and report files.

## Stage 0 — program foundation

Complete. Repository planning, execution protocol and GitHub issue coordination are integrated.

## Stage 1 — reusable evidence foundations

Complete through RB-001, RB-002, RB-003 and RB-018: peer population/level resolution plus deterministic side-aware opening classification and coverage auditing.

## Stage 2 — Player Chess Profile

Complete through RB-004 and RB-005. The deterministic API/contract and authenticated `/progress/profile` experience are integrated.

The profile remains a standalone capability. Builder V2 deliberately stops treating broad profile similarity as direct candidate familiarity/ranking authority.

## Stage 3 — V1 target, personas and candidate decisions

Complete through RB-006, RB-013 and RB-007: versioned target intent, editable defaults, deterministic candidate evidence and explainable V1 ranking.

This stage is historical runtime foundation. The 2026-08-09 product review identified semantic revisions rather than discarding the evidence pipeline.

## Stage 4 — visual decision proof and Cockpit

Complete through RB-008 and RB-026.

The accepted product composition remains one routed board-first workbench. RB-026 integrated the three-zone Cockpit through PR #311: board/candidates, focused decision context, and branch/action controls remain visible together on desktop.

Builder V2 preserves this composition and changes its evidence hierarchy.

## Stage 5 — Builder lifecycle and MVP

Complete through RB-009 and RB-010: serializable bounded session/queue semantics and the authenticated interactive Builder.

Gate: passed for route-local bounded construction.

## Stage 6 — course materialization and adaptation

Complete through RB-011 and RB-012: mandatory preview, explicit transactional apply, and exact existing-course entry points.

## Stage 7 — specialized research and optional intelligence

Complete through RB-014, RB-017, RB-015, RB-019 and RB-020.

Production traps remain separate from normal Surprise semantics. Generated interpretation remains gated, transient, non-authoritative and removable.

## Stage 8 — outcome feedback

RB-016 remains blocked.

The useful evaluation cohort is explicitly **post-V2**. Outcome work should not calibrate semantics that are still being revised by the V2 queue.

Required future evidence still includes adoption, recall, opening-position quality, results and regression/coverage signals after Builder-created material has been trained and encountered in later games.

## Stage 9 — opening knowledge enrichment

Complete through RB-021–RB-025.

Opening knowledge is current runtime explanatory evidence with complete strategic-knowledge coverage for the pinned generated book. It remains ranking-neutral under Builder V2.

## Stage 10 — Builder V2 decision model

Product direction locked on 2026-08-09. See [`BUILDER_V2_PLAN.md`](BUILDER_V2_PLAN.md).

### 10.1 RB-027 / #317 — empirical user-move personas

Status: **DONE**, P0.

Runtime PR #325 (`34dadd25`) implements versioned Balanced/Solid/Aggressive/Surprise `USER_MOVE` policies over exact-position selected-population, Masters and bounded objective evidence. The Candidate Decision V3 contract exposes position baselines/deltas; Surprise uses rarity plus material peer overperformance with explicit sample/objective safeguards. Final runtime CI #2392 is green.

Gate: passed. See `reports/RB-027-2026-08-10-empirical-persona-ranking-v2-closure.md`.

### 10.2 RB-028 / #318 — factual personal move evidence

Status: **IN_PROGRESS**, P1.

Replace primary Builder Profile Fit with exact-position common/rare/new, result context and recency. Familiarity uses all eligible indexed history and remains primarily informational rather than a hidden persona authority.

Implementation is active on PR #327 and can consume the stabilized RB-027 V3 corpus semantics.

### 10.3 RB-029 / #319 — opponent preparation and computed coverage

Status: **READY**, P1.

Opponent turns become preparation priority driven by peer relevance, personal encounters, objective challenge and course state. Remove persona/profile judgment from opponent moves. Recommend a response set and show cumulative selected target-population coverage as feedback.

Gate: existing RB-009 multi-selection/branch semantics remain unchanged.

### 10.4 RB-030 / #320 — single-dialog setup

Status: **READY**, P1.

Normal setup remains one dialog with side/starting scope, speed population, rating target and persona exactly once. Remove normal coverage and hard theory controls. Reuse existing starting-position/session mechanics for common first-move scopes.

Gate: V2 target-contract compatibility is clear after RB-029 shared changes.

### 10.5 RB-031 / #321 — Cockpit evidence hierarchy

Status: **PROPOSED**, P1.

Integrate the settled V2 evidence into the RB-026 Cockpit. Foreground peer/Masters/engine and factual personal evidence on user turns; preparation priority/computed coverage on opponent turns; keep opening knowledge as concise explanation; remove normal ECO and obsolete fit badges.

Gate: RB-028–RB-029 semantics/contracts are stable enough that Angular does not invent a second recommendation model.

## Release condition

The deterministic Builder remains production runtime while V2 is implemented incrementally. RB-027's empirical user-move ranking is now part of that runtime; remaining V2 stages are still incremental work.

V2 is ready as the complete new product authority when:

- [x] user-move personas are empirically calibrated and versioned;
- [ ] exact-position personal familiarity/results replace broad Builder Profile Fit;
- [ ] opponent turns no longer use persona/profile fit and coverage is computed from selection;
- [ ] normal setup is simplified to one understandable dialog;
- [ ] the Cockpit communicates the new evidence hierarchy without losing existing state/course behavior.

Outcome claims remain excluded until RB-016 has sufficient post-V2 evidence.

## Queue impact

- RB-027 is complete.
- RB-028 is active on PR #327.
- RB-029 is the next unclaimed candidate-policy task.
- RB-030 follows target-policy compatibility work.
- RB-031 integrates the settled V2 semantics into the Cockpit.
- RB-016 remains blocked behind both V2 delivery and real usage.
