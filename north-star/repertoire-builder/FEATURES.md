# Repertoire Builder Feature Catalog

Last updated: 2026-08-10

Planning maturity values:

- **Agreed** — purpose and role are stable enough to plan delivery.
- **Outlined** — major behavior is described; important design work remains.
- **Placeholder** — acknowledged dependency or concept with intentionally incomplete planning.
- **Open** — optional or exploratory; no delivery commitment.

Delivery classes:

- **Standalone** — general product improvement with independent user value.
- **Dual-use** — standalone value and direct north-star dependency.
- **North-star** — primarily useful inside the repertoire builder.
- **Research** — discovery that may or may not become implementation.

| Feature | Class | Maturity | Value now | North-star role |
| --- | --- | --- | --- | --- |
| Rated Lichess population explorer | Dual-use | Runtime foundation merged | Improves opening analysis and practical research | Supplies target-population moves and results |
| Compact speed/rating population presets | Dual-use | Implemented and merged | Replaces raw filter matrices with useful defaults | Defines the population being optimized |
| Lichess-benchmark rating bands | Dual-use | Implemented and merged | Makes peer groups match provider query buckets | Shared peer-level vocabulary |
| Factual peer-band resolver | Dual-use | Implemented and merged | Enables My peers immediately | Supplies automatic population target defaults |
| Multi-account player level | Dual-use | Implemented through shared resolver | One inspectable level across accounts | Reuses factual peer evidence without a second formula |
| Named opening classification | Dual-use | Implemented and merged | Enables opening browsing and taxonomy | Secondary intrinsic explanation in Builder V2 |
| Side-aware opening knowledge | Dual-use | Runtime complete | Reusable opening explanations and plans | Explains focused strategy without changing ranking |
| Player Chess Profile | Standalone / Dual-use | Runtime complete | Recalculable broader player tendencies and performance | Separate advisory/inspiration capability; no longer direct preset-persona authority in V2 |
| V1 repertoire target contract | North-star | Runtime complete | Current target snapshots and provenance | Historical runtime foundation to migrate explicitly for remaining V2 work |
| Candidate evidence aggregation | North-star | Runtime complete | Supports one-position decisions | Reused evidence orchestration for V2 |
| V1 explainable candidate ranking | North-star | Historical runtime foundation | Deterministic legacy behavior for CUSTOM/opponent paths | Preset USER_MOVE policy replaced by RB-027; opponent policy remains RB-029 |
| Board-first Builder Cockpit | North-star | Runtime complete through RB-026 | Coherent one-workspace decision loop | Preserved as V2 presentation foundation |
| Builder session and branch queue | North-star | Runtime complete | Storage-neutral state foundation | Preserved V2 state authority |
| Course reintegration and preview/apply | Dual-use | Runtime complete | Safer course edits | Preserved V2 write authority |
| Existing-course adaptation | Dual-use | Runtime complete | Improves course review | Reuses same Builder loop |
| **Empirical persona ranking V2** | North-star | **Runtime complete — RB-027** | Empirical deterministic USER_MOVE recommendations | Balanced/Solid/Aggressive/Surprise interpret selected-population, Masters and bounded engine evidence |
| **Factual personal move evidence** | Dual-use | **IN_PROGRESS — RB-028 / PR #327** | Improves exact-position personal research | Replaces broad Profile Fit with common/rare/new, result context and recency |
| **Opponent preparation + computed coverage V2** | North-star | **Agreed / READY — RB-029** | — | Prioritizes replies to prepare and makes coverage selection feedback |
| **Single-dialog setup V2** | North-star | **Agreed / READY — RB-030** | — | Side/scope, speed, rating target and persona once; removes coverage/theory overload |
| **Cockpit evidence hierarchy V2** | North-star | **Outlined / PROPOSED — RB-031** | — | Re-presents settled V2 evidence without replacing RB-026 Cockpit |
| Traps knowledge foundation | Research | Discovery and bounded pilot complete | Possible future opening resource | Separate from normal Surprise semantics |
| LLM explanation/orchestration | Research | Bounded prototypes complete | Optional generated narrative value | Read-only interpretation over deterministic evidence |
| Outcome feedback and Builder evaluation | Dual-use | Blocked — RB-016 | Better improvement measurement | Validates post-V2 recommendations after sufficient use |

## Feature relationships

### Evidence foundation

The shared Opening Explorer remains the rated target-population implementation. RB-001 provides compact presets, benchmark bands and factual peer resolution; V2 does not create a second public-game extractor.

Masters remains a distinct corpus. The V2 user-move policy compares target-population behavior with Masters behavior rather than treating either as the single definition of correctness.

### Opening classification and knowledge

Opening classification remains the compact deterministic intrinsic taxonomy delivered by RB-003/RB-018. Opening knowledge remains the independently versioned, reviewed service delivered through RB-021–RB-025.

Builder V2 clarifies their role: they explain **what kind of chess a candidate creates and which plans/caveats matter**. They do not form the primary empirical persona-ranking authority.

### Player Chess Profile versus personal move evidence

The Player Chess Profile remains valuable as a standalone view of broader tendencies by period, color, speed and rating context.

RB-028 adds a different Builder concept: exact-position move familiarity and results. A candidate can be `Common for you`, `Rare for you` or `New to you`, with sample-qualified results and recency. This is not inferred from broad profile-character similarity.

### Repertoire target and setup

The current target stores explicit objective/coverage fields and provenance. V2 retains reproducible side/scope, population and persona identity while revising which target fields are product authority.

RB-030 owns the normal one-dialog setup surface. Persona appears once. Coverage percentage and hard maximum-theory-burden controls leave the normal setup rather than being renamed and preserved invisibly.

### User-move recommendation

RB-027 is implemented as the V2 preset USER_MOVE ranking authority:

- Balanced — peer-practical with Masters/engine validation;
- Solid — stronger Master/objective authority;
- Aggressive — practical overperformance with meaningful Master justification and bounded extra objective cost;
- Surprise — uncommon viable target-population overperformance with sample, Master-rarity and engine safeguards.

Candidate Decision V3 supplies exact-position target-side population/Masters baselines and per-move deltas. The current versioned policy uses a 20-game selected-population floor, 10-game Masters floor, +3 percentage-point Surprise overperformance gate, and already-stored legal internally consistent engine evidence at depth at least 12. Exact weights and objective guardrails are recorded in the RB-027 closure report. Future changes require an explicit policy-version change rather than silent recalibration.

### Opponent preparation and coverage

RB-029 owns the V2 opponent role. Opponent replies are preparation priorities driven by peer relevance, exact personal encounters, objective challenge and course state. Persona/profile fit is irrelevant to whether an opponent can play a move.

Coverage becomes the cumulative target-population share of the replies actually selected. The current branch multi-selection/defer/ignore mechanics remain intact.

### Visual choice

RB-026's Cockpit remains the accepted production composition: primary board/candidates, focused brief and branch/action controls in one desktop workspace with responsive stacking.

RB-031 changes the evidence hierarchy only after RB-028–RB-029 settle contracts. User rows foreground peer/Masters/engine plus factual personal context; opponent rows foreground preparation priority and computed coverage. Opening names/plans remain; ECO codes and obsolete fit badges leave the normal decision surface.

### Builder state and course writes

RB-009 remains the pure session/queue authority. RB-011 remains the preview/apply authority. V2 tasks do not add persistence, a second Angular ranking engine, or automatic course writes.

### Traps

Normal Surprise is **not** a traps persona. Production trap integration still requires a separate reviewed evidence/curation decision.

### LLM

No core V2 stage depends on an LLM. Generated interpretation remains optional, bounded and non-authoritative.

### Outcome feedback

RB-016 remains blocked until V2 material has actually been built, trained and encountered in later games. Its eventual cohort should measure the product semantics we intend to keep, not the V1 fit/coverage model being replaced.
