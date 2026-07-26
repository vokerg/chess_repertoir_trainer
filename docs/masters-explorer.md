# Lichess Opening Explorer

The opening-explorer backend exposes position statistics from two public Lichess datasets while sharing the same normalized-position cache infrastructure.

## Endpoints

```http
GET /api/masters-explorer?fen=<fen>
GET /api/lichess-games-explorer?fen=<fen>
```

Both routes require normal application authentication. Returned data and persistent cache rows are system-wide rather than user-owned.

`fen` accepts a legal full FEN or the `startpos` alias. Positions are normalized through the shared position-key infrastructure so equivalent FENs reuse the same canonical position row.

## Fixed dataset profiles

Profiles are deliberately server-controlled. Clients cannot currently vary their parameters. Changing profile semantics requires incrementing the corresponding profile version.

### Lichess Masters

- source: `LICHESS_MASTERS`;
- profile version: `1`;
- games since: `2000`;
- games until: the current UTC calendar year;
- next moves: `12`;
- top game references: `15`;
- cache lifetime: `30 days`.

### Rated Lichess games

- source: `LICHESS_GAMES`;
- profile version: `1`;
- games since: `2000-01`;
- games until: December of the current UTC calendar year;
- rating groups: every Lichess explorer bucket (`0` through `2500+`);
- speeds: ultraBullet, bullet, blitz, rapid, classical, and correspondence;
- next moves: `12`;
- top game references: `4`;
- cache lifetime: `30 days`.

The cache table records year-level provenance. For `LICHESS_GAMES`, `source + profileVersion` defines the exact month, rating, and speed semantics listed above.

## Cache flow

1. Validate and canonicalize the requested FEN.
2. Normalize it to the canonical `Position` row.
3. Read `MastersExplorerCache` for the position, source, and profile version.
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

## Non-goals

This integration does not yet:

- add an Angular or mobile consumer for rated Lichess data;
- compare either public dataset with imported games or courses;
- expose arbitrary year, month, rating, speed, or result limits;
- download or persist public game PGNs;
- add scheduled refresh jobs, Redis, or a queue beyond the existing in-process request serialization.
