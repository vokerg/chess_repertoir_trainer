# Repertoire Builder Feature Catalog

Last updated: 2026-08-11

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
| Player Chess Profile | Standalone / Dual-use | Runtime complete | Recalculable broader player tendencies and performance | Separate advisory/inspiration capability; not direct preset-persona authority in V2 |
| V1 repertoire target contract | North-star | Runtime compatibility foundation | Preserves versioned target snapshots and provenance | V2 uses fixed compatibility coverage/theory values pending a deliberate future contract migration |
| Candidate evidence aggregation | North-star | Runtime complete | Supports one-position decisions | Shared evidence orchestration for V2 role-specific authorities |
| V1 explainable candidate ranking | North-star | Historical runtime foundation | Deterministic legacy behavior where still explicitly supported | Preset USER_MOVE replaced by RB-027; opponent role replaced by RB-029 |
| Board-first Builder Cockpit | North-star | Runtime complete through RB-026/RB-031 | Coherent one-workspace decision loop | Final V2 presentation foundation |
| Builder session and branch queue | North-star | Runtime complete | Storage-neutral state foundation | Preserved V2 state authority |
| Course reintegration and preview/apply | Dual-use | Runtime complete | Safer course edits | Preserved V2 write authority |
| Existing-course adaptation | Dual-use | Runtime complete | Improves course review | Reuses same Builder loop and exact launch positions |
| **Empirical persona ranking V2** | North-star | **Runtime complete — RB-027** | Empirical deterministic USER_MOVE recommendations | Balanced/Solid/Aggressive/Surprise interpret selected-population, Masters and bounded engine evidence |
| **Factual personal move evidence** | Dual-use | **Runtime complete — RB-028** | Exact-position Common/Rare/New, recency/share and qualified result context | Replaces broad Profile Fit as move-familiarity presentation without becoming preset persona authority |
| **Opponent preparation + computed coverage V2** | North-star | **Runtime complete — RB-029** | Prioritizes realistic replies to prepare | Role-specific recommendation policy plus editable selected target-population coverage |
| **Single-dialog setup V2** | North-star | **Runtime complete — RB-030** | One understandable launch surface | Side/scope, speed, rating target and persona once; coverage/theory removed as normal choices |
| **Cockpit evidence hierarchy V2** | North-star | **Runtime complete — RB-031** | Faster interpretation of authoritative evidence | Re-presents settled V2 evidence without replacing RB-026 Cockpit or recreating ranking in Angular |
| Traps knowledge foundation | Research | Discovery and bounded pilot complete | Possible future opening resource | Separate from normal Surprise semantics |
| LLM explanation/orchestration | Research | Bounded prototypes complete | Optional generated narrative value | Read-only interpretation over deterministic evidence |
| Outcome feedback and Builder evaluation | Dual-use | Blocked — RB-016 | Better improvement measurement | Validates post-V2 recommendations after sufficient real use |

## Feature relationships

### Evidence foundation

The shared Opening Explorer remains the rated target-population implementation. RB-001 provides compact presets, benchmark bands and factual peer resolution; V2 does not create a second public-game extractor.

Masters remains a distinct corpus. User-move policy compares selected target-population behavior with Masters behavior rather than treating either as the single definition of correctness.

### Opening classification and knowledge

Opening classification remains the compact deterministic intrinsic taxonomy delivered by RB-003/RB-018. Opening knowledge remains the independently versioned, reviewed service delivered through RB-021–RB-025.

Builder V2 clarifies their role: they explain what kind of chess a candidate creates and which plans/caveats matter. They do not form the primary empirical persona-ranking authority. RB-031 removes normal ECO badges/codes from the decision surface while retaining underlying evidence.

### Player Chess Profile versus personal move evidence

The Player Chess Profile remains valuable as a standalone view of broader tendencies by period, color, speed and rating context.

RB-028 supplies a different Builder fact set: exact-position Common/Rare/New, all-indexed game count/share, recency, effective history scope and sample-qualified result context. This is not inferred from broad profile-character similarity and does not become hidden preset-persona rank authority.

### Repertoire target and setup

The V1 target contract still stores objective/coverage structure needed for reproducible historical/current snapshots. RB-030 removed coverage percentage and hard maximum-theory-burden from the V2 setup surface without silently changing that existing wire contract.

Compatibility values are fixed to coverage `80` and non-restrictive theory ceiling `HIGH`; they are schema/default material, not user intent or opponent-ranking input. Future structural removal requires a deliberate contract-version migration.

Normal setup is one dialog: side/starting scope, speed population, rating target and persona exactly once. Common first-move starts plus custom FEN/PGN/SAN/UCI input resolve to exact draft roots through the existing Builder start path. Existing-course launches remain exact.

### User-move recommendation

RB-027 is the V2 preset USER_MOVE ranking authority:

- Balanced — peer-practical with Masters/engine validation;
- Solid — stronger Master/objective authority;
- Aggressive — practical overperformance with meaningful Master justification and bounded extra objective cost;
- Surprise — uncommon viable target-population overperformance with sample, Master-rarity and engine safeguards.

Candidate Decision V4 supplies exact-position target-side population/Masters baselines and per-move deltas plus RB-028 factual personal context. The ranking policy remains `2026-08-empirical-persona-v2`.

### Opponent preparation and coverage

RB-029 is the V2 opponent role authority through `2026-08-opponent-preparation-v1`.

Opponent replies are discovered/prioritized before final truncation using target-population relevance, exact personal encounters, objective danger and course context. Persona/profile fit is irrelevant to whether an opponent move matters. Recommended replies default selected, remain independently editable, and coverage is the target-population share of selected replies when that evidence exists.

RB-009 multi-selection/defer/ignore/branch mechanics remain intact.

### Visual choice

RB-026's Cockpit remains the production composition: primary board/candidates, focused brief and branch/action controls in one desktop workspace with responsive stacking.

RB-031 completes the V2 hierarchy inside that surface. User rows foreground engine, target-population, Masters, factual personal and meaningful course evidence; opponent rows foreground preparation priority and computed coverage. Opening names/plans remain secondary; normal ECO and obsolete primary Target/Profile-fit chips are removed.

### Builder state and course writes

RB-009 remains the pure session/queue authority. RB-011 remains the preview/apply authority. V2 adds no persisted Builder session, second Angular ranking engine, background job, or automatic course write.

### Traps

Normal Surprise is **not** a traps persona. Production trap integration still requires a separate reviewed evidence/curation decision.

### LLM

No core V2 stage depends on an LLM. Generated interpretation remains optional, bounded and non-authoritative.

### Outcome feedback

RB-016 remains blocked until enough V2 material has actually been built, trained and encountered in later games. Its eventual cohort should measure the product semantics now integrated, not the V1 fit/coverage model that V2 replaced.
