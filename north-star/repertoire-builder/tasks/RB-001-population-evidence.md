# RB-001 — Deliver Lichess-aligned peer population presets

Status: READY

Priority: P0

Order: 10

Delivery class: Dual-use

Planning maturity: Detailed

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

## Outcome

Turn the merged rated Lichess Opening Explorer into one concise, reusable peer-population capability for Opening Analysis and the future repertoire builder.

The product-facing API and widget should expose:

- one fixed speed preset;
- one rating target;
- server-controlled source-period and cache policy;
- the resolved Lichess speeds and rating groups used for the query;
- position and move popularity/results from one mixed Lichess response.

The task deliberately does not build a client-side per-speed weighting system. The required north-star value is a credible, reproducible population of similar or slightly stronger players, not a statistically reconstructed blend of separate speed datasets.

## Why this task exists

PR #80 merged the reusable `opening-explorer` backend, shared contracts, cache, Lichess client and Peer games widget. Its current UI exposes raw month, rating-group and speed checkboxes, while the service caches each complete filter combination as one profile.

That flexibility is more complex than the product needs. The north-star builder needs compact target presets and a reusable way to resolve “players like me” into the exact coarse rating groups accepted by Lichess Explorer.

The task should extend PR #80 rather than create a second extractor, cache or population service.

## Product decisions for this delivery

### Speed presets

Expose exactly these product presets:

| API value | UI label | Lichess speeds |
| --- | --- | --- |
| `ALL` | All speeds | bullet, blitz, rapid, classical, correspondence |
| `BLITZ_AND_SLOWER` | Blitz and slower | blitz, rapid, classical, correspondence |
| `BLITZ` | Blitz | blitz |
| `BULLET` | Bullet | bullet |

Rules:

- `ultraBullet` is unsupported by the product and must not appear in the API or UI;
- arbitrary speed arrays remain an upstream implementation capability, not a product-facing target;
- the default is `BLITZ_AND_SLOWER`.

### Rating targets

Expose one compact target selector with:

- `ALL` — every Lichess Explorer rating group;
- `MY_PEERS` — the user's resolved dominant contiguous peer band;
- `MY_PEERS_PLUS_ONE` — the resolved peer band plus exactly one adjacent higher Lichess group when available; UI label: **My peers and above**;
- `GROUP` — one explicit Lichess Explorer group selected from `<1000`, `1000–1199`, `1200–1399`, `1400–1599`, `1600–1799`, `1800–1999`, `2000–2199`, `2200–2499`, or `2500+`.

The default is `MY_PEERS_PLUS_ONE`.

## Lichess-benchmark rating bands

The current 13-grade normalization profile is not aligned with the discrete groups accepted by Lichess Explorer. This delivery must create a new version of the existing rating-normalization profile whose canonical online bands are the nine Lichess Explorer groups:

- `<1000`;
- `1000–1199`;
- `1200–1399`;
- `1400–1599`;
- `1600–1799`;
- `1800–1999`;
- `2000–2199`;
- `2200–2499`;
- `2500+`.

Lichess ratings classify directly into those bands. Chess.com bullet, blitz and rapid ratings must map into the same benchmark bands through versioned approximate source ranges derived from the existing calibration evidence. The delivery may ignore normal bullet/blitz/rapid disparity when constructing one Lichess population query, but it must not compare raw Chess.com ratings directly with raw Lichess ratings.

Do not mutate profile `2026-07-product-v1` silently. Introduce a new profile version, preserve historical profile metadata, update exact-boundary tests, and update `docs/rating-normalization.md` in the implementation change.

## Temporary peer-band resolver

Provide a reusable service/helper that resolves a user's population band on demand until the durable player-level/profile work is delivered.

### Evidence selection

Use owned imported standard games and the user's game-recorded rating.

Relevant personal rating speeds by selected preset:

- `ALL`: bullet, blitz and rapid;
- `BLITZ_AND_SLOWER`: blitz and rapid;
- `BLITZ`: blitz;
- `BULLET`: bullet.

Classical and correspondence may be queried from Lichess, but they do not contribute personal rating evidence until the repository has a supported personal rating source for them.

### Period fallback

1. Use eligible games from the last three months.
2. If none exist, use all eligible imported history.
3. If no usable rating evidence exists, use the `1400–1599` benchmark band as the generic fallback containing rating 1500.

### Dominant range

Convert every eligible game-recorded rating into the new Lichess-benchmark band using provider and speed context. Resolve a deterministic dominant contiguous interval from the resulting band distribution so one isolated or low-volume rating does not automatically stretch the population across every intervening group.

The exact coverage threshold and tie-break rules must be versioned constants, documented in the completion report, and covered by tests. The resolver must return enough provenance to inspect:

- evidence period used: recent three months, all history, or generic fallback;
- contributing providers, accounts and speeds;
- eligible game count;
- band distribution;
- selected contiguous groups;
- normalization profile ID/version;
- resolver policy version.

RB-001 does not add durable player-profile storage. RB-002 must later reuse this shared resolver boundary and own any persisted player-level snapshot, confidence, exclusions and override behavior.

## API and cache shape

Replace the product-facing raw filter combination with a concise target contract, conceptually:

- `fen`;
- `speedPreset`;
- `ratingTarget`;
- an explicit `ratingGroup` only when `ratingTarget=GROUP`.

The authenticated API resolves the preset and target into one canonical list of Lichess speeds and rating groups, then makes one mixed Lichess Explorer request.

Keep the existing cache model:

- one cache row per normalized position, source and deterministic resolved profile;
- one stored mixed snapshot, not separate per-speed components;
- current 30-day TTL and stale fallback unless implementation evidence justifies a small adjustment;
- no Redis, scheduled refresh, queue or new cache table.

The response must directly expose the requested preset/target and the effective speeds/rating groups, instead of leaving them recoverable only from an opaque numeric `profileVersion`.

## Frontend scope

Keep the existing collapsible Peer games filter affordance, but replace the current checkboxes and month inputs with two compact native dropdowns:

1. speed preset;
2. rating target, including the explicit Lichess groups.

Defaults:

- speed: **Blitz and slower**;
- rating: **My peers and above**.

Do not expose `since`/`until` controls. The public Lichess source period is server-controlled, as it is for Masters. Show a short resolved-population summary when useful, for example `Blitz and slower · 1600–1999 · recent peer evidence`.

## In scope

- extend the current Opening Explorer contracts, route, service and Angular widget;
- add versioned speed-preset and rating-target contracts;
- add the Lichess-benchmark normalization profile version and Chess.com mappings;
- implement the temporary peer-band resolver with the stated fallback order;
- resolve one mixed upstream request and reuse the current mixed cache profile;
- expose direct request and effective-population provenance;
- remove product-facing month inputs, speed checkboxes and rating-group checkboxes;
- exclude ultraBullet;
- keep Masters behavior separate and unchanged;
- update `docs/rating-normalization.md`, `docs/opening-explorer.md` and focused OpenAPI/examples in the implementation change;
- add focused contract, resolver, service, cache and widget tests.

## Out of scope

- separate upstream calls per speed;
- client-side speed weighting or editable weights;
- per-speed component decomposition of one aggregate;
- arbitrary product-facing speed combinations;
- arbitrary product-facing multi-select rating groups;
- client-selected public-game month ranges;
- durable player-level/profile persistence;
- full RB-002 multi-account confidence and override semantics;
- candidate ranking or repertoire recommendation policy;
- a second Lichess extractor or cache system.

## Acceptance criteria

- The API accepts `ALL`, `BLITZ_AND_SLOWER`, `BLITZ` and `BULLET` speed presets, with no ultraBullet option.
- The API accepts `ALL`, `MY_PEERS`, `MY_PEERS_PLUS_ONE` and one explicit Lichess benchmark group.
- Defaults are `BLITZ_AND_SLOWER` and `MY_PEERS_PLUS_ONE`.
- The current month, speed and rating checkbox controls are replaced by two compact selects.
- Lichess Explorer receives one mixed request using the resolved speeds and rating groups.
- Existing mixed cache entries remain the architectural pattern; the response exposes their effective filters directly.
- A new versioned normalization profile uses Lichess Explorer groups as canonical peer bands and maps supported Chess.com pools into them.
- `MY_PEERS` uses recent three-month imported-game evidence, falls back to all history, then to `1400–1599`.
- `MY_PEERS_PLUS_ONE` adds exactly one higher adjacent group when available.
- Resolver provenance identifies evidence period, game count, providers/accounts/speeds, distribution and policy/profile versions.
- Masters behavior and source separation are unchanged.
- Tests cover provider conversion, speed presets, recent/all/default fallback, divergent ratings, explicit groups, top-band behavior, caching, stale fallback and invalid input.
- Canonical rating-normalization and Opening Explorer documentation is updated with the final implemented policies.

## Required validation

- rating-normalization contract/API tests and exact-boundary tests;
- Opening Explorer contract build and focused API/service/repository tests;
- Angular widget/store tests and web build;
- architecture checks for changed shared contracts and module boundaries;
- regression coverage proving Masters behavior remains distinct and unchanged.

## Completion updates

The completion report must record:

- the new normalization profile ID/version and Chess.com mapping source;
- the dominant-range threshold and tie-break policy;
- final API enum names and defaults;
- final speed-to-personal-evidence mapping;
- cache profile/provenance behavior;
- documentation and migration impact;
- the reusable boundary handed to RB-002, RB-004, RB-006 and RB-007.

## Planning reconciliation

Previous baseline report: `reports/RB-001-2026-07-26-peer-games-reconciliation.md`

Revised direction report: `reports/RB-001-2026-07-26-peer-population-direction.md`

Planning PR: https://github.com/vokerg/chess_repertoir_trainer/pull/84

Neither report is an RB-001 completion report.

## Completion

Report: none

Completed at: none
