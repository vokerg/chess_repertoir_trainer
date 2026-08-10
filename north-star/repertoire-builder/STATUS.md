# Repertoire Builder Program Status

Last updated: 2026-08-10

## Current state

**Runtime state:** the deterministic Repertoire Builder capability chain, opening-knowledge service, course preview/apply path, optional bounded interpretation prototypes, RB-026 three-zone Builder Cockpit, and RB-027 empirical `USER_MOVE` persona ranking V2 are integrated. Candidate Decision V3 now exposes exact-position population/Masters baselines and move deltas used by the versioned preset-persona policies.

**Product direction:** hands-on review on 2026-08-09 accepted the Cockpit and revised the Builder's decision authority. [`BUILDER_V2_PLAN.md`](BUILDER_V2_PLAN.md) remains the target model. The revision is semantic, not a ground-up UI replacement.

**Builder V2 tasks:** RB-027 / #317 is `DONE`; RB-028 / #318 is `IN_PROGRESS` on PR #327; RB-029 / #319 and RB-030 / #320 are `READY`; RB-031 / #321 remains `PROPOSED` until the remaining shared V2 evidence semantics/contracts stabilize.

**Outcome task:** RB-016 / #104 remains `BLOCKED`. Its useful cohort is explicitly post-V2 real usage so it measures the product model we intend to retain rather than the semantics being replaced.

## Runtime capability chain preserved

1. **Evidence foundations:** peer population/level resolution, deterministic opening classification and opening audits.
2. **Standalone Player Chess Profile:** broader preference/performance analysis remains available at `/progress/profile`.
3. **Candidate evidence orchestration:** engine, target population, Masters, personal, opening and course evidence are gathered through the authenticated candidate path.
4. **Empirical user-move ranking V2:** Balanced, Solid, Aggressive and Surprise are versioned ranking policies using selected-population, Masters and bounded objective evidence. Static opening traits, Player Chess Profile fit and personal history are not preset-persona rank authority.
5. **Interaction and lifecycle:** board-first Builder, serializable session/branch queue, defer/ignore/stale state and manual move entry.
6. **Course materialization:** mandatory preview and explicit apply, plus existing-course entry points.
7. **Opening knowledge:** reviewed side-aware descriptions/plans remain deterministic and ranking-neutral.
8. **Builder Cockpit:** board/candidates, focused decision context and branch/action controls remain the accepted three-zone desktop composition with responsive stacking.
9. **Optional interpretation:** generated candidate/completion explanations remain gated and non-authoritative.

## V2 revision

### User moves — implemented by RB-027

Persona applies only when the repertoire side chooses a move.

- **Balanced:** peer-practical first, validated by Masters and engine.
- **Solid:** materially stronger Master/objective authority.
- **Aggressive:** practical overperformance with meaningful Master support and more tolerance for bounded objective cost.
- **Surprise:** uncommon viable choices whose selected-population result materially beats the same-position baseline, with explicit sample and objective safeguards.

The current policy requires at least 20 selected-population games and 10 Masters games before those sources are authoritative for preset ranking. Surprise rarity is gated by at least +3 percentage points versus the selected-position baseline. Objective authority uses legal, internally consistent stored engine roots at depth at least 12 with score/mate evidence. The full versioned weights and guardrails are recorded in the RB-027 closure report.

Opening classification/knowledge explain the resulting chess but are not the primary persona-ranking mechanism. Player Chess Profile fit and personal history remain inspectable context rather than preset-persona rank authority.

### Personal evidence

Primary Builder `Profile Aligned/Conflict` is being replaced by exact-position factual evidence: common/rare/new, sample-qualified results and last-played recency. Familiarity uses all eligible indexed history. The standalone Player Chess Profile remains separate. RB-028 owns this work and is in progress.

### Opponent moves

Opponent replies become preparation priorities driven by peer relevance, exact personal encounters, objective challenge and course state. Persona/profile fit does not judge opponent choices. RB-029 owns this policy and remains ready.

### Coverage

Coverage becomes the cumulative target-population share of the replies actually selected. Normal setup no longer asks for a coverage percentage or persona-specific coverage target. RB-029 owns the computed stopping rule.

### Setup and Cockpit

Normal setup remains one dialog with side/starting scope, speed population, rating target and persona exactly once. The existing RB-026 Cockpit remains the visual foundation; RB-031 changes its evidence hierarchy rather than replacing it.

## Active and blocked work

- **RB-027 / #317 — DONE, P0:** runtime PR #325, squash `34dadd25`, final runtime CI #2392.
- **RB-028 / #318 — IN_PROGRESS, P1:** factual personal move evidence on PR #327 using the stabilized V3 corpus semantics.
- **RB-029 / #319 — READY, P1:** opponent preparation and computed coverage; next unclaimed policy task.
- **RB-030 / #320 — READY, P1:** single-dialog setup, coordinated with V2 target/coverage cleanup.
- **RB-031 / #321 — PROPOSED, P1:** Cockpit evidence hierarchy after RB-028–RB-029 semantics stabilize.
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

- RB-027 weights, sample floors, Surprise qualification and objective guardrails are now versioned implementation policy; future calibration requires a new policy version rather than an undocumented semantic change.
- Exact common/rare personal thresholds and position-relative result confidence remain RB-028 work.
- The recommended opponent-response stopping rule must be versioned and must not hide the old fixed percentage defaults.
- Target-contract migration must preserve reproducibility of V1 snapshots rather than silently reinterpret old objective/coverage fields.
- Authenticated populated visual review remains important for RB-031 after the remaining evidence lands.
- Broader product-wide accessibility/responsive work remains owned by VT-302 / #133 and should not be duplicated.

## Queue recommendation

Finish active RB-028 / #318, then take RB-029 / #319 as the next unclaimed shared candidate-policy change. After that simplify setup through RB-030 and finish with RB-031 Cockpit integration. Keep RB-016 blocked until sufficient post-V2 material has been built, trained and encountered in later games.
