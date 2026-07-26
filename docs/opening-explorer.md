# Opening Explorer

The opening-explorer backend exposes position statistics from two public Lichess datasets. The datasets have separate API endpoints and fixed profiles, while sharing validation, normalized-position persistence, cache behavior, credential access, outbound throttling, and response contracts.

## Public endpoints

```http
GET /api/masters-explorer?fen=<fen>
GET /api/lichess-games-explorer?fen=<fen>&since=<YYYY-MM>&until=<YYYY-MM>&ratings=<csv>&speeds=<csv>
```

The endpoints are intentionally distinct:

- `/api/masters-explorer` returns only the Lichess Masters dataset;
- `/api/lichess-games-explorer` returns aggregated rated games from a client-selected or unrestricted Lichess population.

Both routes require normal application authentication. Returned data and persistent cache rows are system-wide rather than user-owned.

`fen` accepts a legal full FEN or the `startpos` alias. Positions are normalized through the shared position-key infrastructure so equivalent FENs reuse the same canonical position row.

## Module ownership and naming

Shared implementation belongs to `apps/api/src/modules/opening-explorer` and shared wire schemas belong to `@chess-trainer/contracts/opening-explorer`.

Dataset-specific names are retained only at the public boundary and for profile-specific services:

- `MastersExplorerService` backs `/api/masters-explorer`;
- `LichessGamesExplorerService` backs `/api/lichess-games-explorer`.

Both are configured instances of the same cached opening-explorer service. The Masters Angular widget remains Masters-specific because it consumes only the Masters endpoint.

The deployed Prisma model and table remain named `MastersExplorerCache` for storage compatibility. That legacy persistence name is isolated inside `opening-explorer.repository.prisma.ts`; it is not part of the service, contract, route, or module taxonomy. No data migration is required for this integration.

## Dataset profiles

The Masters profile is server-controlled. Rated-game clients may optionally restrict month range, rating groups, and speeds. Omitted rated-game parameters mean no restriction; filtered cache profiles are derived deterministically from the canonical parameter combination.

### Lichess Masters

- source: `LICHESS_MASTERS`;
- profile version: `1` for the unrestricted population and a deterministic filter-profile version otherwise;
- games since: `2000`;
- games until: the current UTC calendar year;
- next moves: `12`;
- top game references: `15`;
- cache lifetime: `30 days`.

### Rated Lichess games

- source: `LICHESS_GAMES`;
- profile version: `1`;
- games since/until: unrestricted by default, optionally bounded by `YYYY-MM`;
- rating groups: every Lichess explorer bucket (`0` through `2500+`);
- speeds: ultraBullet, bullet, blitz, rapid, classical, and correspondence;
- next moves: `12`;
- top game references: `0`;
- cache lifetime: `30 days`.

The cache table records year-level provenance. For `LICHESS_GAMES`, `source + profileVersion` identifies the canonical month, rating, and speed combination.

## Cache flow

1. Validate and canonicalize the requested FEN.
2. Normalize it to the canonical `Position` row.
3. Read the shared cache for the position, source, and profile version.
4. Return a valid unexpired row as `HIT`.
5. For missing, expired, or previous-year data, request the selected Lichess explorer dataset.
6. Validate and map the upstream response, persist it, then return `REFRESHED`.
7. If Lichess is unavailable and a valid old row exists, return that unchanged snapshot as `STALE`.
8. If no usable row exists, return the dataset-specific `503` error.

The current-year check forces a refresh after January 1 even when a row has not reached its normal expiry date.

Concurrent requests for the same uncached position and dataset share one in-process promise. Masters and rated-game requests also share one serialized outbound Lichess queue. A Lichess HTTP 429 starts a shared one-minute client-side backoff window.

## Stored snapshot

Each cache row stores a validated JSON snapshot containing:

- opening ECO and name when available;
- absolute White-win, draw, and Black-win counts for the position;
- common next moves with SAN, UCI, average rating, result counts, opening metadata, and an optional representative game reference;
- dataset-specific top game references.

Percentages are derived by consumers and are not persisted. Game PGNs are not fetched or stored.

The cache row also records source/profile provenance, query years and limits, `fetchedAt`, and `expiresAt`.

## Current product usage

The Masters endpoint is consumed by the existing Masters explorer widget. The reusable Peer games Angular widget consumes the rated-games endpoint and is first composed by Opening analysis behind its own header toggle. It exposes every population parameter supported by this integration and intentionally omits top-game presentation.

## Non-goals

This integration does not:

- compare either public dataset with imported games or courses;
- expose result filters or caller-controlled move limits;
- download or persist public game PGNs;
- add scheduled refresh jobs, Redis, or a queue beyond the existing in-process request serialization.
