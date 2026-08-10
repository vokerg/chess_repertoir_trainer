# Repertoire Builder Program Status

Last updated: 2026-08-10

## Current state

**Runtime state:** the deterministic Repertoire Builder capability chain, opening-knowledge service, course preview/apply path, optional bounded interpretation prototypes, RB-026 three-zone Builder Cockpit, RB-027 empirical `USER_MOVE` persona ranking V2, and RB-028 factual exact-position personal move evidence are integrated. Candidate Decision V4 now exposes exact-position population/Masters baselines plus factual personal familiarity, recency, share, result context and effective history scope.

**Product direction:** hands-on review on 2026-08-09 accepted the Cockpit and revised the Builder's decision authority. [`BUILDER_V2_PLAN.md`](BUILDER_V2_PLAN.md) remains the target model. The revision is semantic, not a ground-up UI replacement.

**Builder V2 tasks:** RB-027 / #317 and RB-028 / #318 are `DONE`; RB-029 / #319 and RB-030 / #320 are `READY`; RB-031 / #321 remains `PROPOSED` until the remaining opponent/setup evidence semantics/contracts stabilize.

**Outcome task:** RB-016 / #104 remains `BLOCKED`. Its useful cohort is explicitly post-V2 real usage so it measures the product model we intend to retain rather than the semantics being replaced.

## Runtime capability chain preserved

1. **Evidence foundations:** peer population/level resolution, deterministic opening classification and opening audits.
2. **Standalone Player Chess Profile:** broader preference/performance analysis remains available at `/progress/profile`.
3. **Candidate evidence orchestration:** engine, target population, Masters, personal, opening and course evidence are gathered through the authenticated candidate path.
4. **Empirical user-move ranking V2:** Balanced, Solid, Aggressive and Surprise are versioned ranking policies using selected-population, Masters and bounded objective evidence. Static opening traits, Player Chess Profile fit and personal history are not preset-persona rank authority.
5. **Factual personal move evidence:** exact-position Common/Rare/New uses all eligible indexed history, with recency/share and sample-qualified position-relative result context kept separate from persona authority.
6. **Interaction and lifecycle:** board-first Builder, serializable session/branch queue, defer/ignore/stale state and manual move entry.
7. **Course materialization:** mandatory preview and explicit apply, plus existing-course entry points.
8. **Opening knowledge:** reviewed side-aware descriptions/plans remain deterministic and ranking-neutral.
9. **Builder Cockpit:** board/candidates, focused decision context and branch/action controls remain the accepted three-zone desktop composition with responsive stacking.
10. **Optional interpretation:** generated candidate/completion explanations remain gated and non-authoritative.

## V2 revision

### User moves — implemented by RB-027

Persona applies only when the repertoire side chooses a move.

- **Balanced:** peer-practical first, validated by Masters and engine.
- **Solid:** materially stronger Master/objective authority.
- **Aggressive:** practical overperformance with meaningful Master support and more tolerance for bounded objective cost.
- **Surprise:** uncommon viable choices whose selected-population result materially beats the same-position baseline, with explicit sample and objective safeguards.

The current policy requires at least 20 selected-population games and 10 Masters games before those sources are authoritative for preset ranking. Surprise rarity is gated by at least +3 percentage points versus the selected-position baseline. Objective authority uses legal, internally consistent stored engine roots at depth at least 12 with score/mate evidence. The full versioned weights and guardrails are recorded in the RB-027 closure report.

Opening classification/knowledge explain the resulting chess but are not the primary persona-ranking mechanism. Player Chess Profile fit and personal history remain inspectable context rather than preset-persona rank authority.

### Personal evidence — implemented by RB-028

Primary Builder `Profile Aligned/Conflict` has been replaced by exact-position factual evidence: Common/Rare/New, all-indexed game count and move share, last-played recency, and sample-qualified result context versus the exact-position baseline. Result-less indexed games count for familiarity but not result confidence. Effective account/side/rated/speed scope is inspectable. The standalone Player Chess Profile remains separate.

The factual personal-evidence policy is `2026-08-personal-move-v1`; Candidate Decision contract is `2026-08-v4`. The ranking policy remains `2026-08-empirical-persona-v2`, and the new factual fields do not enter the existing personal ranking input.

### Opponent moves

Opponent replies become preparation priorities driven by peer relevance, exact personal encounters, objective challenge and course state. Persona/profile fit does not judge opponent choices. RB-029 owns this policy and remains ready.

### Coverage

Coverage becomes the cumulative target-population share of the replies actually selected. Normal setup no longer asks for a coverage percentage or persona-specific coverage target. RB-029 owns the computed stopping rule.

### Setup and Cockpit

Normal setup remains one dialog with side/starting scope, speed population, rating target and persona exactly once. The existing RB-026 Cockpit remains the visual foundation; RB-031 changes its evidence hierarchy rather than replacing it.

## Active and blocked work

- **RB-027 / #317 — DONE, P0:** runtime PR #325, squash `34dadd25`, final runtime CI #2392.
- **RB-028 / #318 — DONE, P1:** runtime PR #327, final runtime head `9d0a65a5`, CI #2409; Candidate Decision V4 + factual Builder personal evidence.
- **RB-029 / #319 — READY, P1:** opponent preparation and computed coverage; next unclaimed policy task.
- **RB-030 / #320 — READY, P1:** single-dialog setup, coordinated with V2 target/coverage cleanup.
- **RB-031 / #321 — PROPOSED, P1:** Cockpit evidence hierarchy after RB-029 semantics stabilize.
- **RB-016 / #104 — BLOCKED, P2:** post-V2 adoption and real-game outcome evidence.
- **RB-026 / #310 — DONE:** runtime PR #311 and completion reconciliation PR #314 are merged; issue #310 is closed.

## Locked boundaries preserved

- Builder remains human-controlled; recommendations are non-binding.
- Peer population, Masters, exact personal history, opening classification/knowledge and repertoire intent remain separated evidence concepts.
- Candidate ranking remains deterministic and versioned.
- Builder reducers/queue remain the RB-009 authority.
- Course preview/apply remains the write authority.
- Opening knowledge remains explanatory and cannot change ranking/state/writes.
- Generated interpretation remains optional and non-authoritative.
- Surprise does not silently become production trap integration.
- V2 adds no persistence, queue, job or automatic course-write requirement.

## Residual risks and implementation questions

- RB-027 weights, sample floors, Surprise qualification and objective guardrails are versioned implementation policy; future calibration requires a new policy version rather than an undocumented semantic change.
- RB-028 Common/Rare and result-context thresholds are now versioned factual-presentation policy; future calibration should change the personal-evidence policy version rather than silently reinterpret stored/returned facts.
- The recommended opponent-response stopping rule must be versioned and must not hide the old fixed percentage defaults.
- Target-contract migration must preserve reproducibility of V1 snapshots rather than silently reinterpret old objective/coverage fields.
- Authenticated populated visual review remains important for RB-031 after the remaining opponent/setup evidence lands.
- Broader product-wide accessibility/responsive work remains owned by VT-302 / #133 and should not be duplicated.

## Queue recommendation

Take RB-029 / #319 as the next unclaimed shared candidate-policy change. After that simplify setup through RB-030 and finish with RB-031 Cockpit integration. Keep RB-016 blocked until sufficient post-V2 material has been built, trained and encountered in later games.