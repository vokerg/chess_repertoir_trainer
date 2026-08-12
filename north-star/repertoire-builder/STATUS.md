# Repertoire Builder Program Status

Last updated: 2026-08-11

## Current state

**Runtime state:** the deterministic Repertoire Builder capability chain, opening-knowledge service, course preview/apply path, optional bounded interpretation prototypes, RB-026 three-zone Builder Cockpit, and the complete RB-027–RB-031 Builder V2 decision/presentation chain are integrated on `main`.

**Product direction:** the 2026-08-09 hands-on review retained the Cockpit and revised the Builder decision authority. [`BUILDER_V2_PLAN.md`](BUILDER_V2_PLAN.md) remains the semantic design record; the V2 implementation described there is now delivered through RB-027–RB-031 rather than pending work.

**Builder V2 tasks:** RB-027 / #317, RB-028 / #318, RB-029 / #319, RB-030 / #320, and RB-031 / #321 are `DONE`.

**Outcome task:** RB-016 / #104 remains `BLOCKED`. Its cohort is explicitly post-V2 real usage so it measures the product model now integrated rather than the V1 semantics that V2 replaced.

There is no unclaimed `READY` Builder implementation task at this checkpoint.

## Integrated V2 decision model

### User moves — RB-027

Persona applies only when the repertoire side chooses a move.

- **Balanced:** peer-practical first, validated by Masters and engine.
- **Solid:** materially stronger Master/objective authority.
- **Aggressive:** practical overperformance with meaningful Master support and bounded objective cost.
- **Surprise:** uncommon viable choices whose selected-population result materially beats the same-position baseline with explicit sample/objective safeguards.

Preset `USER_MOVE` ranking remains versioned as `2026-08-empirical-persona-v2`. Opening classification/knowledge, broad Player Chess Profile fit, and personal history are contextual evidence rather than preset-persona rank authority.

### Personal evidence — RB-028

Candidate Decision V4 exposes exact-position factual personal evidence: Common/Rare/New, all-indexed game count and move share, last-played recency, sample-qualified result context versus the exact-position baseline, and effective account/side/rated/speed/history scope.

The factual personal-evidence policy is `2026-08-personal-move-v1`. Result-less indexed games count for familiarity but not result confidence. These facts do not enter preset USER_MOVE persona ranking as a new hidden component.

### Opponent preparation and coverage — RB-029

`OPPONENT_RESPONSE` uses the corrected role-specific authority `2026-08-opponent-preparation-v1`.

Preparation priority is driven by:

- selected target-population relevance;
- repeated exact-position personal encounters;
- objective danger;
- course coverage/transposition as context and ordering evidence;
- Masters as secondary evidence.

Persona, target/profile fit, opening character, and theory burden do not judge opponent moves. Qualifying replies are discovered before final candidate truncation, recommended replies are initially selected but remain editable, and selected coverage is the usable target-population share of the replies actually selected. Unknown coverage stays unavailable rather than being fabricated as zero.

Original PR #331 was corrected through PR #333 after a post-merge authority audit. The RB-029 closure report records the defects and corrected boundary.

### Single-dialog setup — RB-030

Normal setup is one dialog with:

- repertoire side and starting scope;
- speed population;
- rating target;
- one persona.

Common White/Black first-move scopes and custom FEN/PGN/SAN/UCI input resolve to exact draft-root positions through the existing Builder launch/start path. Exact course launches preserve their source position and do not expose an irrelevant broader scope choice.

Coverage percentage and hard theory burden are no longer normal setup controls. The current V1 target contract still receives fixed compatibility values for reproducible snapshots: coverage `80` and non-restrictive theory ceiling `HIGH`. Those values are compatibility material, not V2 intent or opponent-ranking authority.

PR #335 final implementation head `621ee6abb9a311646859357f8de41d4a6c4528e7` passed CI #2478 (`31420953443`) and was squash-merged as `9bfcf3f5b4337c827719f5ee170bcd5f67b6f3c2`.

### Cockpit evidence hierarchy — RB-031

The RB-026 three-zone board-first Cockpit remains the product composition. RB-031 reorders existing authoritative evidence instead of creating a second Angular ranking model.

User-move presentation foregrounds engine quality/cost, target-population frequency/result context, Masters support, factual personal evidence, and meaningful course relationship. Opponent rows keep RB-029 Recommended/Optional preparation semantics and selected target-population coverage. Opening identity/knowledge remains secondary explanatory context; normal ECO and obsolete primary Target/Profile-fit chips are removed.

Final PR #336 head `a7ed94bdad896bc852685ad25de1dc87bee89e8f` passed CI #2486 (`31422515093`) and was squash-merged as `e6c024afec1753838dec900181ca4023d6114676`.

## Preserved capability chain

1. **Evidence foundations:** peer population/level resolution, deterministic opening classification and opening audits.
2. **Standalone Player Chess Profile:** broader preference/performance analysis remains available at `/progress/profile`.
3. **Candidate evidence orchestration:** engine, selected target population, Masters, personal, opening and course evidence are gathered through the authenticated candidate path.
4. **Versioned user-move ranking:** preset persona authority stays deterministic and empirical.
5. **Factual personal evidence:** exact-position familiarity/results remain separate from persona authority.
6. **Opponent preparation:** role-specific recommendation/coverage authority is deterministic and versioned.
7. **Interaction and lifecycle:** board-first Builder, route-local session/branch queue, defer/ignore/stale behavior and manual move entry.
8. **Course materialization:** mandatory preview and explicit apply plus existing-course entry points.
9. **Opening knowledge:** reviewed side-aware descriptions/plans remain deterministic and ranking-neutral.
10. **Optional interpretation:** generated candidate/completion explanations remain gated and non-authoritative.

## Active and blocked work

- **RB-027 / #317 — DONE, P0:** empirical persona ranking V2.
- **RB-028 / #318 — DONE, P1:** factual personal move evidence and Candidate Decision V4.
- **RB-029 / #319 — DONE, P1:** corrected opponent preparation and computed coverage; PRs #331/#333.
- **RB-030 / #320 — DONE, P1:** single-dialog setup V2; PR #335, CI #2478.
- **RB-031 / #321 — DONE, P1:** Cockpit evidence hierarchy V2; PR #336, CI #2486.
- **RB-016 / #104 — BLOCKED, P2:** adoption and real-game outcome evidence after sufficient post-V2 use.
- **RB-026 / #310 — DONE:** runtime PR #311 and completion reconciliation PR #314.

## Locked boundaries preserved

- Builder remains human-controlled; recommendations are non-binding.
- Peer population, Masters, exact personal history, opening classification/knowledge and repertoire intent remain separated evidence concepts.
- Candidate ranking and opponent preparation remain deterministic and versioned.
- Builder reducers/queue remain the RB-009 authority.
- Course preview/apply remains the write authority.
- Opening knowledge remains explanatory and cannot change ranking/state/writes.
- Generated interpretation remains optional and non-authoritative.
- Surprise does not silently become production trap integration.
- V2 adds no persistence, background job, queue, or automatic course-write requirement.

## Residual risks and future gates

- RB-027 weights, sample floors, Surprise qualification and objective guardrails are versioned implementation policy; future calibration requires explicit evidence and a new policy version.
- RB-028 Common/Rare/result-context thresholds are versioned factual-presentation policy; future calibration requires a policy-version change rather than silent reinterpretation.
- RB-029 recommendation thresholds are versioned policy and should not be recalibrated without representative evidence.
- V1 target compatibility fields remain in the shared contract. Their eventual removal requires an explicit contract migration preserving historical snapshot reproducibility.
- Authenticated populated browser/device validation remains useful observational evidence; unavailable execution is recorded as skipped rather than claimed.
- Product-wide accessibility/responsive work remains owned by Visual Transformation #133 and must not be duplicated in Builder tasks.
- RB-016 remains blocked until enough post-V2 Builder/course material has been built, trained, and encountered in later games to support outcome analysis.

## Queue recommendation

Do not start another Builder implementation merely because V2 is complete. There is no `READY` task now.

RB-016 / #104 is the next existing Builder task only after its post-V2 real-usage gate is demonstrably satisfied. Any other new Builder work requires a new immutable RB task/issue and explicit prioritization.
