# RB-001 — Deliver Lichess-aligned peer population presets

Status: REVIEW

Priority: P0

Order: 10

Delivery class: Dual-use

Planning maturity: Detailed

Claimed by: ChatGPT

Claim branch: `north-star/rb-001-peer-presets-replan`

Claimed at: 2026-07-26

Claim scope: implement the versioned Lichess-benchmark rating profile, temporary peer-band resolver, compact Opening Explorer preset contract, mixed-query provenance, two-select Peer games UI, focused tests, runtime documentation, and completion synchronization for CRT-3 / RB-001.

Implementation started: 2026-07-26 at runtime commit `bd822d8d6d59fb274f8a0418e0adfb3879675f73`; Jira CRT-3 transitioned to `In Progress`.

Review ready: 2026-07-26 after full CI run `30211739445` passed lint, build, architecture guardrails, migrations and the complete test suite.

## Outcome

Turn the merged rated Lichess Opening Explorer into one concise, reusable peer-population capability for Opening Analysis and the future repertoire builder.

The product-facing API and widget expose:

- one fixed speed preset;
- one rating target;
- server-controlled source-period and cache policy;
- the resolved Lichess speeds and rating groups used for the query;
- position and move popularity/results from one mixed Lichess response.

The task deliberately does not build a client-side per-speed weighting system. The required north-star value is a credible, reproducible population of similar or slightly stronger players, not a statistically reconstructed blend of separate speed datasets.

## Why this task exists

PR #80 merged the reusable `opening-explorer` backend, shared contracts, cache, Lichess client and Peer games widget. Its previous UI exposed raw month, rating-group and speed checkboxes, while the service cached each complete filter combination as one profile.

That flexibility was more complex than the product needed. The north-star builder needs compact target presets and a reusable way to resolve “players like me” into the exact coarse rating groups accepted by Lichess Explorer.

The task extends PR #80 rather than creating a second extractor, cache or population service.

## Product decisions delivered

### Speed presets

| API value | UI label | Lichess speeds |
| --- | --- | --- |
| `ALL` | All speeds | bullet, blitz, rapid, classical, correspondence |
| `BLITZ_AND_SLOWER` | Blitz and slower | blitz, rapid, classical, correspondence |
| `BLITZ` | Blitz | blitz |
| `BULLET` | Bullet | bullet |

Rules:

- `ultraBullet` is unsupported by the product and absent from the product API/UI;
- arbitrary speed arrays remain a low-level upstream capability, not a product target;
- the default is `BLITZ_AND_SLOWER`.

### Rating targets

The compact target selector exposes:

- `ALL` — every Lichess Explorer rating group;
- `MY_PEERS` — the user's resolved dominant contiguous peer band;
- `MY_PEERS_PLUS_ONE` — the resolved peer band plus exactly one adjacent higher group when available; UI label **My peers and above**;
- `GROUP` — one explicit Lichess Explorer group.

The default is `MY_PEERS_PLUS_ONE`.

## Lichess-benchmark rating bands

The active rating-normalization profile is `universal-online-strength` version `2026-07-lichess-bands-v1` with these canonical online bands:

- `<1000`;
- `1000–1199`;
- `1200–1399`;
- `1400–1599`;
- `1600–1799`;
- `1800–1999`;
- `2000–2199`;
- `2200–2499`;
- `2500+`.

Lichess ratings classify directly. Chess.com bullet, blitz and rapid map into the same bands through versioned approximate source ranges derived from the previous calibration evidence. Normal bullet/blitz/rapid disparity is deliberately ignored for one mixed Lichess population query, but raw Chess.com ratings are never compared directly with raw Lichess ratings.

The previous `2026-07-product-v1` profile remains preserved as `LEGACY_RATING_NORMALIZATION_PROFILE`.

## Temporary peer-band resolver

A reusable resolver derives a user's population band on demand until durable RB-002 player-level work is delivered.

### Evidence selection

It uses owned rated imported standard games and the user's game-recorded rating.

Personal evidence speeds by selected preset:

- `ALL`: bullet, blitz and rapid;
- `BLITZ_AND_SLOWER`: blitz and rapid;
- `BLITZ`: blitz;
- `BULLET`: bullet.

Classical and correspondence may be queried from Lichess but do not contribute personal rating evidence.

### Period fallback

1. Eligible games from the last three months.
2. All eligible imported history when recent evidence is absent.
3. The `1400–1599` benchmark band as a visible generic fallback.

### Dominant range

Resolver policy `dominant-contiguous-window-v1`:

- considers contiguous windows of one, two or three groups;
- selects the narrowest window containing at least 70% of eligible games;
- qualifying ties prefer more games and then the lower starting group;
- when no window reaches 70%, the highest-mass window wins, followed by narrower and lower tie-breaks.

The resolver returns:

- evidence period;
- contributing providers, accounts and speeds;
- eligible game count;
- complete band distribution;
- selected contiguous groups;
- normalization profile ID/version;
- resolver policy version.

RB-001 adds no durable player-profile storage. RB-002 must reuse this boundary and own any persisted player-level snapshot, confidence, exclusions and override behavior.

## API and cache shape

The product query contains:

- `fen`;
- `speedPreset`;
- `ratingTarget`;
- `ratingGroup` only when `ratingTarget=GROUP`.

The authenticated API resolves the preset and target into one canonical Lichess speed/rating list, then makes one mixed Lichess Explorer request.

The existing cache model remains:

- one cache row per normalized position, source and deterministic effective profile;
- one stored mixed public snapshot, not separate per-speed components;
- 30-day TTL and stale fallback;
- no Redis, scheduled refresh, queue or new cache table.

The response directly exposes requested and effective population provenance. Personal resolver provenance is attached after shared cache access and is not persisted.

## Frontend scope delivered

The existing collapsible Peer games filter now contains two compact native selects:

1. Time controls;
2. Player level.

Defaults:

- speed: **Blitz and slower**;
- rating: **My peers and above**.

No `since`/`until` controls are exposed. A resolved-population summary identifies effective groups and recent/all-history/fallback evidence.

## Acceptance criteria status

- API speed presets and ultraBullet exclusion: complete.
- Rating targets and explicit group validation: complete.
- Defaults: complete.
- Two compact selects replacing month/checkbox controls: complete.
- One mixed Lichess request: complete.
- Existing cache architecture and direct provenance: complete.
- New versioned normalization profile and Chess.com mappings: complete.
- Recent/all/default peer fallback: complete.
- Exactly one higher adjacent group for `MY_PEERS_PLUS_ONE`: complete.
- Resolver provenance: complete.
- Masters behavior/source separation: unchanged and covered by full regression tests.
- Focused provider, preset, fallback, divergence, explicit, top-band, cache, stale and invalid-input tests: complete.
- Canonical runtime documentation: complete.

## Validation

GitHub Actions CI run `30211739445` passed on implementation head `ba164767f139b8b7efa522edb050d2ca983a6171`:

- lint;
- contracts/API/web builds;
- architecture guardrails;
- PostgreSQL migrations;
- complete repository test suite.

Browser-level visual review was not available in the connector-only execution environment. Angular build and component tests passed; visual inspection remains a review item.

## Planning reconciliation

Previous baseline report: `reports/RB-001-2026-07-26-peer-games-reconciliation.md`

Revised direction report: `reports/RB-001-2026-07-26-peer-population-direction.md`

Implementation completion report: `reports/RB-001-2026-07-26-peer-population-presets.md`

PR: https://github.com/vokerg/chess_repertoir_trainer/pull/84

## Completion

Report: `reports/RB-001-2026-07-26-peer-population-presets.md`

Completed at: none — pending review and merge.