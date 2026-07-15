# Masters Explorer

The Masters Explorer is a backend position-data capability backed by the public Lichess Masters opening explorer.

## Endpoint

```http
GET /api/masters-explorer?fen=<fen>
```

The route requires normal application authentication. The returned data and persistent cache are system-wide rather than user-owned.

`fen` accepts a legal full FEN or the `startpos` alias. Positions are normalized through the shared position-key infrastructure so equivalent FENs reuse one cache entry.

## Fixed dataset profile

The first profile is deliberately server-controlled:

- source: `LICHESS_MASTERS`;
- profile version: `1`;
- games since: `2000`;
- games until: the current UTC calendar year;
- next moves: `12`;
- top game references: `15`;
- cache lifetime: `30 days`.

Clients cannot currently vary these parameters. Changing the profile semantics requires incrementing the profile version.

## Cache flow

1. Validate and canonicalize the requested FEN.
2. Normalize it to the canonical `Position` row.
3. Read `MastersExplorerCache` for the position, source, and profile version.
4. Return a valid unexpired row as `HIT`.
5. For missing, expired, or previous-year data, request Lichess Masters.
6. Validate and map the upstream response, persist it, then return `REFRESHED`.
7. If Lichess is unavailable and a valid old row exists, return that unchanged snapshot as `STALE`.
8. If no usable row exists, return `503 MASTERS_EXPLORER_UNAVAILABLE`.

The current-year check forces a refresh after January 1 even when a row has not reached its normal expiry date.

Concurrent requests for the same uncached position share one in-process promise. Outbound Lichess Masters requests are serialized. A Lichess HTTP 429 starts a one-minute client-side backoff window.

## Stored snapshot

Each cache row stores a validated JSON snapshot containing:

- opening ECO and name when available;
- absolute White-win, draw, and Black-win counts for the position;
- common next moves with SAN, UCI, average rating, result counts, opening metadata, and an optional representative game reference;
- up to 15 top game references for the position.

Percentages are derived by consumers and are not persisted. Game PGNs are not fetched or stored by this foundation slice.

The cache row also records source/profile provenance, query years and limits, `fetchedAt`, and `expiresAt`.

## Non-goals

This foundation does not yet:

- add an Angular or mobile consumer;
- compare Masters statistics with imported games or courses;
- expose arbitrary year ranges or limits;
- download or persist master-game PGNs;
- add scheduled refresh jobs, Redis, or a queue.
