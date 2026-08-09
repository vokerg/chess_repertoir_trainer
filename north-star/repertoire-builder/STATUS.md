# Repertoire Builder Program Status

Last updated: 2026-08-09

## Current state

**Runtime state:** the deterministic Repertoire Builder capability chain, opening-knowledge service, course preview/apply path, optional bounded interpretation prototypes, and RB-026 three-zone Builder Cockpit are integrated. The current runtime still uses the V1 target/profile-fit/coverage/persona semantics until the V2 tasks are implemented.

**Product direction:** hands-on review on 2026-08-09 accepted the Cockpit and revised the Builder's decision authority. [`BUILDER_V2_PLAN.md`](BUILDER_V2_PLAN.md) is now the target model. The revision is semantic, not a ground-up UI replacement.

**Builder V2 tasks:** RB-027 / #317, RB-028 / #318, RB-029 / #319 and RB-030 / #320 are `READY`; RB-031 / #321 is `PROPOSED` until the shared V2 evidence semantics/contracts stabilize.

**Outcome task:** RB-016 / #104 remains `BLOCKED`. Its useful cohort is explicitly post-V2 real usage so it measures the product model we intend to retain rather than the V1 semantics being replaced.

**RB-026 completion:** runtime merged through PR #311. PR #314 remains documentation/execution-state reconciliation only; this V2 planning work is stacked on its head to avoid conflicting edits to the same canonical program documents.

## Runtime capability chain preserved

1. **Evidence foundations:** peer population/level resolution, deterministic opening classification and opening audits.
2. **Standalone Player Chess Profile:** broader preference/performance analysis remains available at `/progress/profile`.
3. **Candidate evidence orchestration:** engine, target population, Masters, personal, opening and course evidence are already gathered through the authenticated candidate path.
4. **Interaction and lifecycle:** board-first Builder, serializable session/branch queue, defer/ignore/stale state and manual move entry.
5. **Course materialization:** mandatory preview and explicit apply, plus existing-course entry points.
6. **Opening knowledge:** reviewed side-aware descriptions/plans remain deterministic and ranking-neutral.
7. **Builder Cockpit:** board/candidates, focused decision context and branch/action controls remain the accepted three-zone desktop composition with responsive stacking.
8. **Optional interpretation:** generated candidate/completion explanations remain gated and non-authoritative.

## V2 revision

### User moves

Persona applies only when the repertoire side chooses a move.

- **Balanced:** peer-practical first, validated by Masters and engine.
- **Solid:** stronger Master/objective authority.
- **Aggressive:** active/imbalanced practical choices with meaningful Master justification and bounded extra objective cost.
- **Surprise:** uncommon viable choices that overperform the same-position peer baseline with sufficient sample, lower Master adoption and reliable objective safety.

Opening classification/knowledge explain the resulting chess but are no longer the main persona-ranking mechanism. Exact numeric policy remains RB-027 calibration work.

### Personal evidence

Primary Builder `Profile Aligned/Conflict` is replaced by exact-position factual evidence: common/rare/new, sample-qualified results and last-played recency. Familiarity uses all eligible indexed history. The standalone Player Chess Profile remains separate.

### Opponent moves

Opponent replies become preparation priorities driven by peer relevance, exact personal encounters, objective challenge and course state. Persona/profile fit does not judge opponent choices.

### Coverage

Coverage becomes the cumulative target-population share of the replies actually selected. Normal setup no longer asks for a coverage percentage or persona-specific coverage target.

### Setup and Cockpit

Normal setup remains one dialog with side/starting scope, speed population, rating target and persona exactly once. The existing RB-026 Cockpit remains the visual foundation; RB-031 changes its evidence hierarchy rather than replacing it.

## Active and blocked work

- **RB-027 / #317 — READY, P0:** empirical persona ranking V2. First recommended implementation task.
- **RB-028 / #318 — READY, P1:** factual personal move evidence. May proceed in parallel where contract collisions are coordinated.
- **RB-029 / #319 — READY, P1:** opponent preparation and computed coverage.
- **RB-030 / #320 — READY, P1:** single-dialog setup, coordinated with V2 target/coverage contract cleanup.
- **RB-031 / #321 — PROPOSED, P1:** Cockpit evidence hierarchy after RB-027–RB-029 semantics stabilize.
- **RB-016 / #104 — BLOCKED, P2:** post-V2 adoption and real-game outcome evidence.
- **RB-026 / #310 — runtime complete:** only PR #314 completion reconciliation remains open at the time this planning branch was cut.

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

- V2 persona weights and sample treatment are deliberately not locked until representative benchmark positions are tested.
- Surprise may require changes to candidate seeding and bounded engine evidence so genuinely uncommon candidates can be evaluated safely.
- Exact common/rare personal thresholds and position-relative result confidence remain RB-028 work.
- The recommended opponent-response stopping rule must be versioned and must not hide the old fixed percentage defaults.
- Target-contract migration must preserve reproducibility of V1 snapshots rather than silently reinterpret old objective/coverage fields.
- Authenticated populated visual review remains important for RB-031 after the new evidence lands.
- Broader product-wide accessibility/responsive work remains owned by VT-302 / #133 and should not be duplicated.

## Queue recommendation

Start with RB-027 / #317. RB-028 may run in parallel if shared contract edits are coordinated. Then settle RB-029, simplify setup through RB-030, and finish with RB-031 Cockpit integration. Keep RB-016 blocked until sufficient post-V2 material has been built, trained and encountered in later games.
