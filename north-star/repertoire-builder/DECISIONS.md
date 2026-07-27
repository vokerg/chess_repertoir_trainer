# Repertoire Builder Decisions

Last updated: 2026-07-27

States:

- **LOCKED** — agreed foundation; change only with explicit user revision.
- **PROVISIONAL** — current direction, subject to task evidence.
- **OPEN** — intentionally unresolved.
- **REJECTED** — considered and explicitly not selected.

## Product decisions

### RB-D001 — Human-controlled repertoire architect

State: **LOCKED**

The north star is an interactive repertoire builder that proposes evidence-backed choices while leaving important decisions to the user.

### RB-D002 — Profile conclusions are advisory

State: **LOCKED**

A player profile may initialize or rank options but cannot prevent the player from choosing another repertoire character.

### RB-D003 — Multiple repertoire personas

State: **LOCKED**

The same player may create multiple courses for the same opening with different intents, including solid, sharp, dubious, low-theory or future traps-oriented variants.

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

This explicitly revises the earlier arbitrary-combination direction.

### RB-D006 — Combined presets use one Lichess aggregate

State: **LOCKED**

For the MVP, the resolved speed and rating groups are sent to Lichess Explorer in one request and the returned aggregate is accepted as the target population. The system does not fetch each speed separately or reconstruct a weighted result.

The response exposes the effective speeds and rating groups so the population remains reproducible.

### RB-D007 — Editable or exact speed weights

State: **REJECTED**

Client-side equal weights, player-distribution weights and editable weights add complexity without demonstrated product value for peer opening statistics. Reconsider only if empirical recommendation tests show that the mixed Lichess population is materially misleading.

### RB-D008 — Reuse and version the rating-normalization domain

State: **LOCKED**

Cross-provider strength targeting is owned by the shared versioned rating-normalization domain. Consumers preserve profile IDs/versions and do not introduce feature-local conversion tables.

The active profile is `universal-online-strength` version `2026-07-lichess-bands-v1`. The former `2026-07-product-v1` profile remains exported as historical calibration evidence and must not be silently reinterpreted.

### RB-D009 — Multi-account level uses normalized imported-game evidence

State: **LOCKED**

The factual multi-account player level is the provider/speed-normalized imported-game band distribution and dominant interval delivered by RB-001. It preserves account/provider/speed contributions, evidence period, eligible-game count and profile/policy versions.

Raw Chess.com and Lichess rating numbers are not averaged into this factual result.

### RB-D010 — No separate durable player-level formula without evidence

State: **LOCKED**

RB-002 is complete through the RB-001 resolver. Do not add a second formula, exact provider-neutral number, generic confidence score, activity caps, decay, persistence model or override foundation without a concrete consumer or measured defect.

Later consumers may extract or rename the existing service and contract without changing its semantics. RB-004 owns profile interpretation; RB-006 owns target snapshots and user overrides without mutating factual evidence.

## Data and profile decisions

### RB-D011 — Four evidence layers remain separate

State: **LOCKED**

Intrinsic opening profile, target-population profile, player profile and current repertoire target are distinct concepts.

### RB-D012 — Opening classification will exist

State: **LOCKED**

A side-aware intrinsic classification of named openings is delivered by RB-003 and may be consumed independently of target-population, player-performance and repertoire-target evidence.

### RB-D013 — Opening-classification method

State: **LOCKED**

Opening classification uses deterministic, versioned, ordered regex rules over generated opening names. Broad family rules provide defaults, safe lexical modifiers may add non-soundness traits, and narrower subfamily or line rules override scalar values while preserving matched-rule provenance.

Every result exposes separate White and Black profiles, explicit unknowns, stable rule IDs, rationales and confidence. The rule registry is stored separately from `openingBook.generated.ts`; it does not require one database row per generated entry.

Runtime LLM calls, Stockfish or engine-assisted classification auditing, and automatic soundness inference from words such as `Gambit` are rejected for this workflow. Initial rules are authored as reviewable source code. RB-018 may expand family coverage and actual-game calibration without changing this method.

### RB-D014 — Chess Profile is standalone

State: **LOCKED**

The Player Chess Profile should deliver independent value even before the interactive builder exists.

### RB-D015 — Preference and performance are separate

State: **LOCKED**

The profile must not infer that frequent choice means strong performance or that strong performance means preference.

### RB-D016 — Profile claims retain evidence

State: **LOCKED**

Sample size, analysed coverage, filters, baseline, rating context and confidence must remain available behind conclusions.

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

PR #110 reviewed two directions and the user selected a Direction-A-led composition:

- the recursive builder uses one readable primary board;
- candidates switch the board and focused evidence rather than rendering three full boards by default;
- opponent responses use a coverage queue rather than a dense matrix;
- branch progress remains visible;
- candidate-attached target-fit and profile-fit roles are retained.

Direction B's simultaneous candidate landscape is **rejected as the default** because it is too heavy, reduces board readability, and becomes awkward on mobile. An explicit mini-board comparison mode may be reconsidered later, but it is not required for the initial production workbench.

### RB-D021 — Setup dialog launches routed workbench

State: **LOCKED**

The builder setup is a focused dialog. It captures side, starting point, speed preset, rating target, persona/objective, and coverage/theory preferences, then closes when the user selects **Start building**.

The recursive candidate-and-coverage workflow is a routed workbench. It must not remain inside a long-lived modal. Routing supports navigation, branch progress, eventual resumability, and draft review. Persistence requirements remain open under RB-D024.

### RB-D022 — Deferred coverage is first-class

State: **LOCKED**

The user can deliberately postpone an opponent response without the system treating the course as accidentally incomplete.

### RB-D037 — Target intent remains visible when profile advice disagrees

State: **LOCKED**

Candidate presentation shows factual evidence, profile fit and selected-target fit as separate concepts. When profile advice and explicit repertoire intent disagree, the target remains authoritative for the current build while the disagreement stays visible and explainable.

Final copy and statistical confidence still depend on RB-004/RB-006 contracts, but the conceptual separation is settled.

### RB-D038 — Coverage state is part of the decision surface

State: **LOCKED**

Opponent responses expose explicit pending, selected, deferred, ignored and completed states in the routed workbench. A queue is the default presentation. Cumulative first-pass coverage may be shown when RB-007 relevance evidence and RB-009 session rules define stable semantics.

## Persistence and integration decisions

### RB-D023 — Reuse course reintegration patterns

State: **PROVISIONAL**

Current analysis-tree preview and course reintegration are the preferred starting pattern, subject to reinspection when the implementation task begins.

### RB-D024 — Builder-session persistence

State: **OPEN**

Do not add a database model before the workflow and resume requirements are demonstrated.

## Optional intelligence decisions

### RB-D025 — LLM is optional

State: **LOCKED**

The core roadmap does not depend on an LLM.

### RB-D026 — LLM role

State: **OPEN**

Explanation, summarization, naming or conversational orchestration may be useful, but factual authority and write behavior require separate review.

### RB-D027 — Trap knowledge requires evidence and curation

State: **LOCKED**

RB-014 established, and the user approved, that a trap is represented as a versioned conditional branch with:

- normalized trigger-position and move identity;
- a practically tempting opponent response;
- bounded punishment;
- explicit safe defenses or refutations;
- setup soundness kept separate from practical temptation;
- rating/speed population evidence;
- engine profile and source provenance;
- editorial review and lifecycle state.

Opening names and ECO are descriptive metadata, not trap identity. Related non-identical occurrences may share a trap family.

Suitable reusable source inputs are CC0 Lichess games, puzzles, evaluated positions, and `lichess-org/chess-openings`, plus original application analysis and copy. Public studies, videos, blogs, books, and unlicensed collections are discovery leads only and must not be bulk imported.

The approved next step is RB-017: one bounded 20–50 example source-controlled data/validator pilot. It may add deterministic validation, versioned evidence snapshots, review output, tests, and documentation. It may not add a production database, public endpoint, API/MCP contract, Angular UI, course write, or RB-006/RB-007 contract change.

Any production traps capability requires a new user decision after the pilot report.

## Rejected shortcuts

### RB-D028 — Fully automatic repertoire generation without review

State: **REJECTED**

The product should not silently select and write an entire repertoire from a hidden score.

### RB-D029 — Master games as the only practical corpus

State: **REJECTED**

Master practice is one evidence source. Peer population and personal games are required for practical targeting.

### RB-D030 — One permanent player style label

State: **REJECTED**

Player tendencies vary by period, speed, color, rating context and deliberate learning goal.

## Peer-population decisions

### RB-D031 — Lichess Explorer groups are canonical peer bands

State: **LOCKED**

The product peer-level model uses the nine Lichess Explorer rating groups as canonical bands: `<1000`, `1000–1199`, `1200–1399`, `1400–1599`, `1600–1799`, `1800–1999`, `2000–2199`, `2200–2499`, `2500+`.

Lichess ratings classify directly. Chess.com bullet, blitz and rapid receive versioned approximate mappings into the same bands. Normal speed-specific rating disparity is accepted for the first combined population model.

### RB-D032 — Factual peer range comes from imported games

State: **LOCKED**

The system resolves My peers from owned rated imported standard games:

1. eligible ratings from the last three months;
2. all eligible history when recent evidence is absent;
3. the `1400–1599` band as the generic fallback containing rating 1500.

Resolver policy `dominant-contiguous-window-v1` evaluates contiguous windows of one, two or three groups and selects the narrowest window containing at least 70% of eligible games. Qualifying ties prefer more games and then the lower starting group. When no window reaches 70%, the highest-mass window wins, followed by narrower and lower tie-breaks.

The full distribution and provider/account/speed contributions remain visible. This resolver is the completed factual multi-account player-level boundary. Policy changes require demonstrated defects and explicit versioning.

### RB-D033 — Public-game period is server-controlled

State: **LOCKED**

The Peer games UI and product API do not expose `since`/`until` month controls. The rated Lichess source remains unrestricted by month and uses the existing 30-day cache/stale-fallback lifecycle.

### RB-D034 — Peer filters use two compact selects

State: **LOCKED**

The Peer games filter surface contains one speed-preset dropdown and one rating-target dropdown. The defaults are **Blitz and slower** and **My peers and above**. Raw month inputs and speed/rating checkbox matrices are removed.

### RB-D035 — Personal provenance is not stored in the public cache

State: **LOCKED**

The shared cache key is derived from the effective sorted rating groups and speeds. Users resolving to the same effective population share one public cache snapshot. Personal evidence period, distribution and contributions are attached after cache access and are never written into the system-wide public snapshot.

### RB-D036 — Raw rated query contract is replaced

State: **LOCKED**

The product route accepts only `fen`, `speedPreset`, `ratingTarget` and conditional `ratingGroup`. The prior `since`, `until`, raw `ratings` and raw `speeds` parameters are not retained as a second public path.
