# Repertoire Builder Roadmap

Last updated: 2026-08-11

This roadmap records capability stages and decision gates. Detailed implementation history lives in task and report files.

## Stage 0 — program foundation

Complete. Repository planning, execution protocol and GitHub issue coordination are integrated.

## Stage 1 — reusable evidence foundations

Complete through RB-001, RB-002, RB-003 and RB-018: peer population/level resolution plus deterministic side-aware opening classification and coverage auditing.

## Stage 2 — Player Chess Profile

Complete through RB-004 and RB-005. The deterministic API/contract and authenticated `/progress/profile` experience are integrated.

The profile remains a standalone capability. Builder V2 deliberately does not treat broad profile similarity as direct candidate familiarity/ranking authority.

## Stage 3 — V1 target, personas and candidate decisions

Complete through RB-006, RB-013 and RB-007: versioned target intent, editable defaults, deterministic candidate evidence and explainable V1 ranking.

This stage is historical runtime foundation. The 2026-08-09 product review revised its decision semantics without discarding the evidence pipeline or historical target snapshots.

## Stage 4 — visual decision proof and Cockpit

Complete through RB-008, RB-026 and RB-031.

RB-026 established the three-zone, board-first Cockpit: board/candidates, focused decision context, and branch/action controls remain visible together on desktop with responsive stacking. RB-031 completed the V2 evidence hierarchy inside that composition without creating a second client-side ranking model.

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

The evaluation cohort is explicitly **post-V2**. V2 is now integrated, but the evidence gate still requires enough Builder/course material to be built, trained and encountered in later games before adoption/outcome work is meaningful.

Required future evidence includes adoption, recall, opening-position quality, results and regression/coverage signals after real post-V2 use.

## Stage 9 — opening knowledge enrichment

Complete through RB-021–RB-025.

Opening knowledge is current runtime explanatory evidence with complete strategic-knowledge coverage for the pinned generated book. It remains ranking-neutral under Builder V2.

## Stage 10 — Builder V2 decision model

Complete through RB-027–RB-031. See [`BUILDER_V2_PLAN.md`](BUILDER_V2_PLAN.md) for the design record.

### 10.1 RB-027 / #317 — empirical user-move personas

Status: **DONE**, P0.

Runtime PR #325 (`34dadd25`) implements versioned Balanced/Solid/Aggressive/Surprise `USER_MOVE` policies over exact-position selected-population, Masters and bounded objective evidence. Final runtime CI #2392 is green.

Gate: passed. See `reports/RB-027-2026-08-10-empirical-persona-ranking-v2-closure.md`.

### 10.2 RB-028 / #318 — factual personal move evidence

Status: **DONE**, P1.

PR #327 advances Candidate Decision to V4 and replaces primary Builder Profile Fit with exact-position Common/Rare/New, all-indexed game count/share, recency, effective history scope and sample-qualified result context versus the same-position baseline. The factual policy is `2026-08-personal-move-v1`; preset ranking remains `2026-08-empirical-persona-v2`.

Gate: passed. See `reports/RB-028-2026-08-10-personal-move-evidence-closure.md`.

### 10.3 RB-029 / #319 — opponent preparation and computed coverage

Status: **DONE**, P1.

PR #331 introduced the V2 opponent policy and PR #333 corrected the complete authority boundary after a post-merge audit. `2026-08-opponent-preparation-v1` discovers and prioritizes replies before final truncation using target-population relevance, personal encounters, objective danger and course context. Recommended replies default selected, remain editable, and selected coverage is factual target-population share rather than setup intent.

Gate: passed. See `reports/RB-029-2026-08-10-opponent-preparation-closure.md`.

### 10.4 RB-030 / #320 — single-dialog setup

Status: **DONE**, P1.

PR #335 delivers one normal setup dialog with side/starting scope, speed population, rating target and persona exactly once. Common first-move scopes and custom FEN/PGN/SAN/UCI input resolve through the existing Builder start path. Exact course launches stay exact. Coverage/theory are not normal setup controls; V1 target fields remain fixed compatibility data (`80`, `HIGH`) for reproducible snapshots.

Final head `621ee6abb9a311646859357f8de41d4a6c4528e7` passed CI #2478 and squash-merged as `9bfcf3f5b4337c827719f5ee170bcd5f67b6f3c2`.

Gate: passed. See `reports/RB-030-2026-08-11-single-dialog-setup-v2-closure.md`.

### 10.5 RB-031 / #321 — Cockpit evidence hierarchy

Status: **DONE**, P1.

PR #336 preserves the RB-026 Cockpit and foregrounds authoritative V2 evidence: engine, target-population, Masters, factual personal context and meaningful course relationship on user turns; RB-029 preparation priority and coverage on opponent turns. Opening identity/plans remain secondary; normal ECO and obsolete primary Target/Profile-fit chips are removed.

Final head `a7ed94bdad896bc852685ad25de1dc87bee89e8f` passed CI #2486 and squash-merged as `e6c024afec1753838dec900181ca4023d6114676`.

Gate: passed. See `reports/RB-031-2026-08-10-cockpit-evidence-hierarchy-closure.md`.

## Release condition

The complete Builder V2 decision/presentation authority is integrated:

- [x] user-move personas are empirically calibrated and versioned;
- [x] exact-position personal familiarity/results replace broad Builder Profile Fit;
- [x] opponent turns no longer use persona/profile fit and coverage is computed from selection;
- [x] normal setup is simplified to one understandable dialog;
- [x] the Cockpit communicates the new evidence hierarchy without losing existing state/course behavior.

This is a product/runtime completion statement, not an outcome claim. Outcome quality remains excluded until RB-016 has sufficient post-V2 evidence.

## Queue impact

- RB-027–RB-031 are complete.
- There is no unclaimed READY Builder implementation task.
- RB-016 remains blocked behind sufficient post-V2 real usage and follow-up-game evidence.
- New Builder work requires a new immutable task/issue unless the RB-016 evidence gate is genuinely satisfied.
