# Repertoire Builder Decisions

Last updated: 2026-08-09

States:

- **LOCKED** — agreed foundation; change only with explicit user revision.
- **PROVISIONAL** — current direction, subject to task evidence.
- **OPEN** — intentionally unresolved.
- **REJECTED** — considered and explicitly not selected.

## Product decisions

### RB-D001 — Human-controlled repertoire architect

State: **LOCKED**

The north star is an interactive repertoire builder that proposes evidence-backed choices while leaving important decisions to the user.

### RB-D002 — Player Chess Profile remains advisory and separate from Builder move familiarity

State: **LOCKED**

Revised 2026-08-09.

The standalone Player Chess Profile may inspire a repertoire target or provide broader player insight, but Builder V2 does not use broad profile-character matching as a primary move-ranking authority or as proof that a specific move is familiar to the player.

Exact-position personal move history is a separate factual evidence layer. Manual repertoire intent remains authoritative.

### RB-D003 — Multiple repertoire personas

State: **LOCKED**

Revised 2026-08-09.

The same player may create multiple courses for the same opening with different intents. The normal Builder V2 personas are **Balanced, Solid, Aggressive and Surprise**. They are policies for interpreting empirical evidence on the user's move, not permanent labels on the player.

Future trap-oriented or other specialized modes require separate evidence-backed decisions.

### RB-D004 — Existing-course improvement uses the same decision mechanism

State: **LOCKED**

Course gaps, endings, deviations and weak choices should enter the same builder workflow rather than creating separate recommendation systems.

## Environment and rating decisions

### RB-D005 — Product speed targeting uses fixed presets

State: **LOCKED**

The first product contract exposes exactly four speed presets:

- All speeds: bullet, blitz, rapid, classical and correspondence;
- Blitz and slower: blitz, rapid, classical and correspondence;
- Blitz;
- Bullet.

UltraBullet is excluded. Arbitrary upstream speed arrays remain an implementation detail, not a product target.

### RB-D006 — Combined presets use one Lichess aggregate

State: **LOCKED**

For the current population foundation, resolved speed and rating groups are sent to Lichess Explorer in one request and the returned aggregate is accepted as the target population. The response exposes effective speeds and rating groups so the population remains reproducible.

### RB-D007 — Editable or exact speed weights

State: **REJECTED**

Client-side equal weights, player-distribution weights and editable weights add complexity without demonstrated product value. Reconsider only if empirical recommendation tests show that the mixed Lichess population materially misleads V2 candidate decisions.

### RB-D008 — Reuse and version the rating-normalization domain

State: **LOCKED**

Cross-provider strength targeting is owned by the shared versioned rating-normalization domain. Consumers preserve profile IDs/versions and do not introduce feature-local conversion tables.

The active profile is `universal-online-strength` version `2026-07-lichess-bands-v1`. The former `2026-07-product-v1` profile remains historical calibration evidence and must not be silently reinterpreted.

### RB-D009 — Multi-account level uses normalized imported-game evidence

State: **LOCKED**

The factual multi-account player level is the provider/speed-normalized imported-game band distribution and dominant interval delivered by RB-001. It preserves account/provider/speed contributions, evidence period, eligible-game count and profile/policy versions.

Raw Chess.com and Lichess rating numbers are not averaged directly.

### RB-D010 — No separate durable player-level formula without evidence

State: **LOCKED**

RB-002 is complete through the RB-001 resolver. Do not add a second player-level formula, exact provider-neutral number, generic confidence score, activity caps, decay, persistence model or override foundation without a concrete consumer or measured defect.

## Data and profile decisions

### RB-D011 — Evidence layers remain separate

State: **LOCKED**

Intrinsic opening profile, target-population behavior, exact-position personal move evidence, broader Player Chess Profile conclusions and current repertoire target are distinct concepts. Builder may present them together but must not collapse them into one unexplained fit label.

### RB-D012 — Opening classification will exist

State: **LOCKED**

A side-aware intrinsic classification of named openings is delivered by RB-003 and may be consumed independently of target-population, player-performance and repertoire-target evidence.

### RB-D013 — Opening-classification method

State: **LOCKED**

Opening classification uses deterministic, versioned, ordered regex rules over generated opening names. Broad family rules provide defaults, safe lexical modifiers may add non-soundness traits, and narrower subfamily or line rules override scalar values while preserving matched-rule provenance.

Every result exposes separate White and Black profiles, explicit unknowns, stable rule IDs, rationales and confidence. Runtime LLM calls, Stockfish auditing and automatic soundness inference from words such as `Gambit` remain rejected for this workflow.

### RB-D039 — Opening coverage means rule matching, not fabricated certainty

State: **LOCKED**

RB-018 completes the pinned generated-book classification coverage track. Rule-match coverage means every pinned name has extractable characteristics and matched-rule provenance; it does not mean every dimension has equal certainty or theoretical depth.

Generated-book breadth and actual-game distribution remain separate measurements.

### RB-D046 — Static opening knowledge is separate, deterministic and side-aware

State: **LOCKED**

Opening descriptions and strategic plans are owned by a separate, independently versioned `OpeningKnowledgeService` beside opening lookup and classification.

Knowledge remains reviewed explanatory evidence. Builder consumption cannot change ranking, eligibility, session state or course writes. AI game-review grounding remains an optional non-authoritative downstream use.

### RB-D014 — Chess Profile is standalone

State: **LOCKED**

The Player Chess Profile should deliver independent value even without the Builder.

### RB-D015 — Preference and performance are separate

State: **LOCKED**

The profile must not infer that frequent choice means strong performance or that strong performance means preference.

### RB-D016 — Profile claims retain evidence

State: **LOCKED**

Sample size, analysed coverage, filters, baseline, rating context and confidence remain available behind profile conclusions.

### RB-D017 — Tags are signals, not the complete model

State: **LOCKED**

Existing opening and game-story tags may contribute, but profile conclusions cannot be unexplained tag counts.

## Recommendation and UX decisions

### RB-D018 — Explainable recommendations

State: **LOCKED**

Candidate evidence remains separated and recommendation reasons are visible. No opaque aggregate score is sufficient by itself.

### RB-D019 — Candidate choice must be visual

State: **LOCKED**

The user should see positions and consequences, not only SAN lines or a text table.

### RB-D020 — Board-first default composition

State: **LOCKED**

Revised 2026-08-09 without replacing the RB-026 Cockpit.

- the recursive Builder uses one readable primary board;
- candidates switch the board and focused evidence rather than rendering several full boards by default;
- opponent responses use an explicit preparation/selection surface and branch queue;
- branch progress remains visible;
- V2 evidence presentation does not require persistent target-fit/profile-fit badges.

The simultaneous multi-board candidate landscape remains **rejected as the default** because it is visually heavy and reduces board readability.

### RB-D021 — One setup dialog launches the routed workbench

State: **LOCKED**

Revised 2026-08-09.

Normal Builder setup is one focused dialog. Persona appears exactly once.

It captures:

- repertoire side and starting scope;
- speed preset;
- rating target;
- one persona: Balanced, Solid, Aggressive or Surprise.

Normal setup does not require an opponent-response coverage percentage or a hard maximum-theory-burden control. The recursive workflow remains on the routed workbench, not in a long-lived modal.

### RB-D022 — Deferred opponent preparation is first-class

State: **LOCKED**

The user can deliberately postpone an opponent response without the system treating the course as accidentally incomplete.

### RB-D037 — Explicit repertoire intent remains visible; broad profile fit is not a primary Builder badge

State: **LOCKED**

Revised 2026-08-09.

The selected persona and its deterministic recommendation reasons remain visible and explainable. Broad Player Chess Profile fit is no longer required as a primary candidate-alignment concept in Builder V2.

Factual personal move history is shown directly as common/rare/new, supported result context and recency. The user may still choose against any recommendation.

### RB-D038 — Coverage state is part of the opponent decision surface

State: **LOCKED**

Revised 2026-08-09.

Opponent responses expose pending, selected, deferred, ignored and completed states in the routed workbench. Cumulative selected target-population coverage is shown as **feedback produced by the selected replies**, not as a persona property or mandatory setup percentage.

### RB-D047 — Personas apply only to user moves

State: **LOCKED**

Balanced, Solid, Aggressive and Surprise interpret evidence only when the repertoire side is choosing a move. They do not classify an opponent response as desirable, aligned or conflicting.

Opponent replies are prioritized as preparation obligations through RB-D049.

### RB-D048 — User-move personas are empirical policies

State: **LOCKED**

The primary V2 user-move comparison is target-population evidence versus Masters evidence under an engine safety/cost guardrail.

- **Balanced:** peer-practical first; Masters and engine validate.
- **Solid:** stronger authority for established Master practice and objective quality.
- **Aggressive:** active/imbalanced choices with strong practical results, meaningful Master justification and bounded extra objective cost.
- **Surprise:** uncommon but viable choices with target-population overperformance relative to the same position's baseline, sufficient sample, lower Master adoption and reliable objective safety.

Opening classification and opening knowledge are secondary explanatory inputs. They do not define the persona ranking by themselves.

Exact numeric weights, shrinkage/confidence functions, candidate seeding and objective thresholds must be calibrated and versioned by RB-027 rather than locked here.

### RB-D049 — Opponent responses are preparation priorities

State: **LOCKED**

Opponent-response ordering answers: **which replies matter enough to prepare?**

Primary evidence is target-population frequency/relevance, exact-position personal encounters, objective challenge for uncommon replies and existing course coverage/gaps. Masters may provide secondary context.

Persona, target opening character, theory burden and broad Player Chess Profile fit do not determine whether an opponent reply matters.

### RB-D050 — Coverage is computed feedback, not setup intent

State: **LOCKED**

Normal setup does not expose the current 50–100% response-coverage slider or persona-specific 70/80/85 defaults.

Builder may produce a deterministic recommended response set. The UI then shows the cumulative share of target-population games represented by the actual selected replies. The user can add, remove, defer or ignore replies before accepting them.

The recommendation/stopping rule must be versioned and tested; it must not simply conceal the old fixed percentages.

### RB-D051 — Personal Builder evidence is exact-position familiarity and results

State: **LOCKED**

Builder should tell the user whether a candidate is common, rare or new in their own indexed history, with games/occurrences, score, position-relative result context when supported, and last-played recency.

Familiarity uses all eligible indexed history. Recency is a separate fact; the Player Chess Profile's default recent window does not define move familiarity.

Personal evidence is primarily informational in V2 and must not overpower the peer/Masters/engine persona policy merely because an old habit was repeated often.

### RB-D052 — Opening knowledge explains; empirical evidence recommends

State: **LOCKED**

The Builder's recommendation layer answers why a move is suitable for the selected target/persona. Opening classification and reviewed knowledge answer what kind of chess the move creates and what strategic plans/caveats matter.

Normal Builder presentation keeps opening names and strategic guidance but removes ECO codes/badges such as `A01` from the decision surface.

### RB-D053 — Preserve the Cockpit; revise its evidence hierarchy

State: **LOCKED**

RB-026's three-zone Cockpit remains the default composition. V2 keeps the primary board, candidate preview, eval bar, focused decision brief, opening plans, manual move entry, branch/action controls, queue, defer/ignore/stop, draft preview and responsive stacking.

V2 changes what the rows and focused brief foreground: peer/Masters/engine evidence and factual personal history for user moves; preparation evidence and computed coverage for opponent moves.

## Persistence and integration decisions

### RB-D023 — Reuse course reintegration patterns

State: **PROVISIONAL**

Current preview/apply and course reintegration patterns remain the preferred course-write boundary, subject to reinspection for each implementation task.

### RB-D024 — Builder-session persistence

State: **OPEN**

Do not add a database model before workflow and resume requirements demonstrate the need.

## Optional intelligence decisions

### RB-D025 — LLM is optional

State: **LOCKED**

The core roadmap does not depend on an LLM.

### RB-D026 — LLM role is read-only generated interpretation

State: **LOCKED**

Generated interpretation may consume immutable deterministic snapshots but cannot alter chess facts, candidate ranking, selected moves/responses, Builder state, preview/apply or course writes.

Candidate explanation and post-apply summary remain independent optional use cases with explicit gates and failure isolation.

### RB-D027 — Trap knowledge requires evidence and curation

State: **LOCKED**

A trap remains a versioned conditional branch with normalized trigger identity, practical temptation, bounded punishment, explicit safe alternatives, separate setup soundness, population evidence, engine/source provenance and editorial lifecycle.

Opening names/ECO are descriptive metadata, not trap identity. Production traps remain outside normal Builder V2 until separately approved.

## Rejected shortcuts

### RB-D028 — Fully automatic repertoire generation without review

State: **REJECTED**

The product should not silently select and write an entire repertoire from a hidden score.

### RB-D029 — Master games as the only practical corpus

State: **REJECTED**

Master practice is one evidence source. Peer population evidence remains required for practical targeting.

### RB-D030 — One permanent player style label

State: **REJECTED**

Player tendencies vary by period, speed, color, rating context and deliberate learning goal.

## Peer-population decisions

### RB-D031 — Lichess Explorer groups are canonical peer bands

State: **LOCKED**

The product peer-level model uses the nine Lichess Explorer rating groups as canonical bands: `<1000`, `1000–1199`, `1200–1399`, `1400–1599`, `1600–1799`, `1800–1999`, `2000–2199`, `2200–2499`, `2500+`.

Lichess ratings classify directly. Chess.com bullet, blitz and rapid receive versioned approximate mappings into the same bands.

### RB-D032 — Factual peer range comes from imported games

State: **LOCKED**

The system resolves My peers from owned rated imported standard games using the versioned RB-001 policy: recent evidence first, all eligible history when recent evidence is absent, then the generic 1400–1599 fallback.

This recent window belongs to **peer-level resolution**. It does not define Builder personal move familiarity, which follows RB-D051.

### RB-D033 — Public-game period is server-controlled

State: **LOCKED**

The Peer games UI/product API do not expose raw month controls. The rated Lichess source uses the existing cache/stale lifecycle.

### RB-D034 — Peer filters use compact selects

State: **LOCKED**

Peer targeting uses one speed preset and one rating target. Raw speed/rating checkbox matrices are not the product model.

### RB-D035 — Personal provenance is not stored in the public cache

State: **LOCKED**

Users resolving to the same effective public population share the public cache snapshot. Personal resolver evidence remains outside that public cache record.

### RB-D036 — Raw rated query contract is replaced

State: **LOCKED**

The product route uses the compact speed/rating target contract rather than retaining raw `since`, `until`, ratings and speeds as a second product path.

## Repertoire target decisions

### RB-D040 — Effective target intent and defaults remain separate

State: **LOCKED**

A repertoire target stores authoritative effective values separately from defaults/provenance. Explicit overrides do not mutate factual peer evidence or other source evidence.

Builder V2 may simplify/remove obsolete V1 objective/coverage fields through a versioned contract change; compatibility must be explicit rather than silently reinterpreting old snapshots.

### RB-D041 — Peer-derived target populations are reproducible snapshots

State: **LOCKED**

A peer-derived target stores the requested population, effective Lichess benchmark groups and factual peer-resolution snapshot, including normalization/resolver versions. `MY_PEERS_PLUS_ONE` adds one adjacent higher group and caps at `2500+`.

### RB-D042 — Persona is a versioned decision policy, not a static trait bundle

State: **LOCKED**

Revised 2026-08-09.

V1 represented persona as preferred character, minimum soundness, risk tolerance, maximum theory burden and complexity tolerance. V2 preserves persona identity/provenance but moves product authority to the empirical semantics in RB-D048.

Any retained low-level objective fields must be treated as versioned policy implementation/compatibility data, not as a reason to expose hard fit badges or setup controls that the user cannot interpret operationally.

### RB-D043 — Unknown evidence is not target intent

State: **LOCKED**

`UNKNOWN` remains valid factual evidence and must not be fabricated into certainty. Any deliberately dubious future mode requires explicit reviewed product semantics.

### RB-D044 — Target mutability and recalculation are explicit

State: **LOCKED**

Contract version, target identity and creation timestamp remain immutable. Changes to side/starting scope, speed population, rating population or persona require candidate recalculation. V2 coverage is derived from response selection rather than an authoritative setup target.

### RB-D045 — Current population source is Lichess Games

State: **LOCKED**

The current repertoire-target population source is `LICHESS_GAMES` because its benchmark-group and peer-resolution semantics are versioned and implemented. Additional providers require an explicit contract version and reviewed evidence semantics.
