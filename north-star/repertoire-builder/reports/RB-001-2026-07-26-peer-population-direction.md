# RB-001 peer-population direction revision

Date: 2026-07-26

Status: planning reconciliation only; not an RB-001 completion report.

Jira: CRT-3, with dependency impact on CRT-4, CRT-8 and the CRT-2 epic.

Branch: `north-star/rb-001-peer-presets-replan`

## Purpose

Record the user-approved simplification of rated Lichess population targeting before RB-001 implementation begins.

The previous plan required arbitrary speed combinations, controlled General weighting, separate per-speed component evidence and continuous normalized-range projection into Lichess rating groups. Discussion and inspection showed that this would create significant API, cache and explainability complexity for limited practical precision.

The revised direction uses compact product presets, one mixed Lichess response and rating bands aligned directly with the groups supported by Lichess Explorer.

## Decisions recorded

### Speed targeting

The product exposes:

- `ALL` — bullet, blitz, rapid, classical and correspondence;
- `BLITZ_AND_SLOWER` — blitz, rapid, classical and correspondence;
- `BLITZ`;
- `BULLET`.

UltraBullet is excluded. Default: `BLITZ_AND_SLOWER`, displayed as **Blitz and slower**.

Arbitrary upstream speed arrays remain possible internally, but they are not a product-facing target contract.

### Rating targeting

The product exposes:

- `ALL`;
- `MY_PEERS`;
- `MY_PEERS_PLUS_ONE`, displayed as **My peers and above**;
- one explicit Lichess Explorer rating group.

Default: `MY_PEERS_PLUS_ONE`.

### Population aggregation and cache

The application resolves one speed preset and one rating target into canonical Lichess speeds/groups, sends one upstream request and stores the returned mixed snapshot through the existing deterministic filter-profile cache.

Separate per-speed calls, atomic component caches, editable weights and reconstructed weighted aggregates are rejected for the MVP.

### Rating benchmark

The product-level peer bands will be the nine Lichess Explorer rating groups:

- `<1000`;
- `1000–1199`;
- `1200–1399`;
- `1400–1599`;
- `1600–1799`;
- `1800–1999`;
- `2000–2199`;
- `2200–2499`;
- `2500+`.

Lichess ratings classify directly. Chess.com bullet, blitz and rapid ratings require versioned approximate mappings into the same bands.

The current normalization profile `2026-07-product-v1` must not be silently changed. RB-001 introduces a new profile version and updates code, tests and `docs/rating-normalization.md` during implementation.

### Temporary peer resolver

RB-001 provides an on-demand reusable resolver using owned imported standard games and game-recorded ratings:

1. evidence from the last three months;
2. all eligible history when recent evidence is absent;
3. `1400–1599` as the generic fallback containing rating 1500.

The selected speed preset determines which personal rating speeds contribute. Classical and correspondence may be queried from Lichess but do not contribute personal rating evidence until a supported personal source exists.

The resolver selects a dominant contiguous interval from the normalized band distribution. The exact coverage threshold, volume treatment and tie-break policy remain implementation questions; they must be versioned, visible in provenance and tested.

RB-001 does not add durable player-level storage. RB-002 later owns durable multi-account projection, confidence, exclusions, persistence/snapshot and overrides while reusing the RB-001 profile/resolver boundary.

### Frontend

The Peer games filter keeps the current collapsible affordance but replaces month inputs and speed/rating checkbox matrices with two compact native selects:

- speed preset;
- rating target.

The public rated-game period is server-controlled. The existing approximately monthly cache/stale-fallback lifecycle remains the baseline.

## Architecture impact

The revised task continues to reuse:

- `apps/api/src/modules/opening-explorer/` for routing, service orchestration, Lichess access and cache behavior;
- `packages/contracts/src/opening-explorer/` for shared request/response schemas;
- `apps/api/src/modules/rating-normalization/` and its shared contracts for provider-aware band classification;
- imported-game game-recorded ratings and existing account rating/performance projections for evidence;
- the existing Peer games Angular widget rather than a new population UI feature.

No new provider, extractor, cache table, queue, background job or persistence model is approved by this revision.

## Planning and dependency impact

- RB-001 remains order 10, P0 and `READY`, with revised title/scope.
- RB-002 changes from `READY` to `BLOCKED` on the RB-001 benchmark profile/resolver boundary.
- RB-006 uses fixed speed/rating presets rather than arbitrary weighted combinations.
- RB-004 consumes RB-002 factual player level rather than recalculating it.
- RB-010 represents the target presets in the MVP setup.
- CRT-3 should block CRT-4 in Jira.
- Jira workflow statuses remain unchanged because this is planning coordination, not an implementation claim.

## Repository files changed by this reconciliation

- `north-star/repertoire-builder/README.md`
- `north-star/repertoire-builder/FOUNDATION.md`
- `north-star/repertoire-builder/NORTH_STAR.md`
- `north-star/repertoire-builder/FEATURES.md`
- `north-star/repertoire-builder/ROADMAP.md`
- `north-star/repertoire-builder/TASKS.md`
- `north-star/repertoire-builder/STATUS.md`
- `north-star/repertoire-builder/DECISIONS.md`
- `north-star/repertoire-builder/OPEN_QUESTIONS.md`
- `north-star/repertoire-builder/AGENTS.md`
- `north-star/repertoire-builder/tasks/RB-001-population-evidence.md`
- `north-star/repertoire-builder/tasks/RB-002-player-level-resolution.md`
- `north-star/repertoire-builder/tasks/RB-004-player-chess-profile-engine.md`
- `north-star/repertoire-builder/tasks/RB-006-repertoire-target-contract.md`
- `north-star/repertoire-builder/tasks/RB-010-interactive-builder-mvp.md`

Historical reconciliation reports are not rewritten; this report records the later direction change explicitly.

## Validation performed

- inspected the current Opening Explorer contracts, service, Lichess client, cache repository and Peer games Angular widget;
- verified the current complete-filter mixed cache behavior and 30-day TTL/stale fallback;
- inspected the current rating-normalization profile, helper service and canonical documentation;
- inspected game-recorded rating and three-month/all-history account projection patterns;
- inspected affected North Star task, roadmap, decision and status documents;
- inspected Jira CRT-2, CRT-3, CRT-4, CRT-6 and CRT-8 descriptions and dependencies.

## Validation not performed

- no runtime application code changed;
- no build, unit/integration test, lint, architecture or browser validation was run;
- no database migration was created;
- no Jira workflow transition was made.

## Residual risks and implementation questions

- Chess.com benchmark boundaries require careful calibration and a new profile version;
- the dominant interval policy may hide real divergent high-volume ratings if chosen poorly;
- duplicates across owned accounts must not distort the band distribution;
- correspondence/classical lack supported personal rating evidence;
- a generic fallback must be visibly identified as fallback evidence;
- backward compatibility for the current raw query contract needs an explicit implementation decision;
- runtime documentation must be updated only when the implementation lands.

## Queue recommendation

Proceed with RB-001 first. Keep RB-002 blocked until the new profile and shared peer resolver contract are available. No other task order or priority change is recommended.
