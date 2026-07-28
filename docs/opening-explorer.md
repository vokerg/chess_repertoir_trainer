# Opening Explorer

The opening-explorer backend exposes position statistics from two public Lichess datasets. Masters and rated-game evidence remain separate endpoints while sharing validation, normalized-position persistence, cache behavior, credential access, outbound throttling and response contracts.

## Public endpoints

```http
GET /api/masters-explorer?fen=<fen>
GET /api/lichess-games-explorer?fen=<fen>&speedPreset=<preset>&ratingTarget=<target>&ratingGroup=<group>
```

Both routes require normal application authentication. Public position snapshots and cache rows are system-wide. The rated endpoint may use the authenticated user's imported games to resolve `MY_PEERS`, but it does not store personal evidence in the shared cache.

`fen` accepts a legal full FEN or the `startpos` alias. Positions are normalized through the shared position-key infrastructure so equivalent FENs reuse the same canonical position row.

## Endpoint separation

- `/api/masters-explorer` returns only the Lichess Masters dataset.
- `/api/lichess-games-explorer` returns one aggregated rated-game population selected through fixed product presets.

Masters remains a factual reference source. Rated games represent the practical player population. They are not merged into one hidden dataset.

## Module ownership

Shared implementation belongs to `apps/api/src/modules/opening-explorer`. Shared wire schemas belong to `@chess-trainer/contracts/opening-explorer`.

Important files:

- `opening-explorer.routes.ts` — authenticated HTTP/OpenAPI boundary;
- `opening-explorer.service.ts` — preset resolution and cached fetch orchestration;
- `peer-rating-band.service.ts` — temporary imported-game peer-band resolution;
- `lichess-opening-explorer.client.ts` — serialized Lichess requests and 429 backoff;
- `opening-explorer.repository.prisma.ts` — shared position/cache persistence.

The deployed Prisma model/table remains named `MastersExplorerCache` for storage compatibility. That legacy name is isolated inside the repository. RB-001 does not require a migration or new cache table.

## Masters profile

- source: `LICHESS_MASTERS`;
- games since: 2000;
- games until: current UTC year;
- next moves: 12;
- top game references: 15;
- cache lifetime: 30 days;
- query: FEN only.

Masters behavior is unchanged by peer-population presets.

## Rated-game product contract

### Speed presets

| API value | UI label | Effective Lichess speeds | Personal rating evidence speeds |
|---|---|---|---|
| `ALL` | All speeds | bullet, blitz, rapid, classical, correspondence | bullet, blitz, rapid |
| `BLITZ_AND_SLOWER` | Blitz and slower | blitz, rapid, classical, correspondence | blitz, rapid |
| `BLITZ` | Blitz | blitz | blitz |
| `BULLET` | Bullet | bullet | bullet |

Default: `BLITZ_AND_SLOWER`.

UltraBullet remains supported by the low-level Lichess client type for historical/internal compatibility, but it is not accepted by the product query or shown in the UI.

Classical and correspondence can be included in the public population query. They do not contribute to personal peer resolution because imported-game rating evidence currently supports bullet, blitz and rapid only.

### Rating targets

| API value | UI label | Effective groups |
|---|---|---|
| `ALL` | All players | every Lichess Explorer group |
| `MY_PEERS` | My peers | dominant contiguous groups from personal rating evidence |
| `MY_PEERS_PLUS_ONE` | My peers and above | peer groups plus exactly one adjacent higher group when available |
| `GROUP` | explicit group label | one supplied `ratingGroup` |

Default: `MY_PEERS_PLUS_ONE`.

Valid explicit groups are:

- `0` — `<1000`;
- `1000` — 1000–1199;
- `1200` — 1200–1399;
- `1400` — 1400–1599;
- `1600` — 1600–1799;
- `1800` — 1800–1999;
- `2000` — 2000–2199;
- `2200` — 2200–2499;
- `2500` — 2500+.

`ratingGroup` is required only when `ratingTarget=GROUP` and rejected for every other target.

## Temporary peer-band resolver

`peer-rating-band.service.ts` supplies the bounded factual resolver required by Opening Analysis until RB-002 delivers a durable player-level projection.

### Eligible evidence

The resolver uses owned imported games that are:

- rated;
- standard/chess variant or variant-null;
- within the preset's supported personal speeds;
- associated with a known user color and recorded user rating.

It groups evidence in SQL by account, provider, speed, user color and recorded rating. A bounded account lookup adds owned usernames. Each rating is classified through the active rating-normalization profile using provider and speed context.

### Period fallback

1. Eligible games ending within the last three months.
2. All eligible imported history when the recent period has no usable games.
3. Generic group `1400` (1400–1599) when no usable rating evidence exists.

The response identifies the chosen period as `RECENT_THREE_MONTHS`, `ALL_HISTORY` or `GENERIC_FALLBACK`.

### Dominant contiguous interval

Resolver policy version: `dominant-contiguous-window-v1`.

- Build the full nine-group game distribution.
- Consider contiguous windows of one, two or three groups.
- Select the narrowest window containing at least 70% of eligible games.
- Break ties by more games, then the lower starting group.
- When no three-group window reaches 70%, select the highest-mass window, preferring a narrower and then lower window on ties.

This prevents one isolated rating from stretching peers across every intervening group while allowing adjacent high-volume bands to form one peer interval.

Resolver provenance includes:

- evidence period;
- eligible game count;
- complete band distribution;
- selected peer groups;
- account/provider/speed contributions;
- normalization profile ID/version;
- resolver policy version.

RB-001 does not persist this personal resolution. RB-002 must reuse the profile and policy boundary if it later stores or snapshots a durable player level.

## Rated request and cache flow

1. Validate the preset/target query.
2. Resolve the effective Lichess speed list.
3. Resolve rating groups directly or through the authenticated user's peer evidence.
4. Build the canonical effective profile key from no month bounds, sorted rating groups and sorted speeds.
5. Canonicalize and normalize the FEN.
6. Read the shared cache for normalized position, source and deterministic profile version.
7. Return an unexpired compatible row as `HIT`.
8. Otherwise make one mixed Lichess Explorer request for the effective groups/speeds.
9. Validate and store the public snapshot, then return `REFRESHED`.
10. If Lichess fails and an old compatible row exists, return it as `STALE`; otherwise return the rated-source 503 error.

The canonical profile key intentionally retains the previous `since|until|ratings|speeds` format with empty month fields. Existing cache rows for the same unrestricted-month effective population can therefore be reused. Different users whose peer resolution produces the same effective speed/rating lists share the same public cache row.

The response attaches personal request/resolver provenance after reading the public cache. Personal contribution data is never written into the shared snapshot.

## Cache characteristics

- source: `LICHESS_GAMES`;
- source period: server-controlled/unrestricted by month;
- one mixed snapshot per normalized position and effective population;
- next moves: 12;
- top game references: 0;
- cache lifetime: 30 days;
- current-year compatibility check retained;
- concurrent misses for the same effective profile share one in-process promise;
- Masters and rated requests share one serialized outbound Lichess queue;
- HTTP 429 starts the existing shared one-minute client backoff.

There are no separate per-speed component caches, reconstructed weighted aggregates, Redis entries, background refresh jobs or new persistence models.

## Response provenance

Rated responses include `population`:

```json
{
  "requested": {
    "speedPreset": "BLITZ_AND_SLOWER",
    "ratingTarget": "MY_PEERS_PLUS_ONE",
    "ratingGroup": null
  },
  "effective": {
    "speeds": ["blitz", "classical", "correspondence", "rapid"],
    "ratingGroups": [1400, 1600]
  },
  "peerResolution": {
    "evidencePeriod": "RECENT_THREE_MONTHS",
    "eligibleGames": 42,
    "selectedGroups": [1400],
    "distribution": [],
    "contributions": [],
    "normalizationProfile": {
      "id": "universal-online-strength",
      "version": "2026-07-lichess-bands-v1"
    },
    "resolverPolicyVersion": "dominant-contiguous-window-v1"
  }
}
```

`peerResolution` is null for `ALL` and explicit `GROUP` targets. Masters responses omit `population`.

## Stored public snapshot

Each cache row stores only validated public Lichess data:

- opening ECO and name when available;
- absolute White-win, draw and Black-win counts;
- common next moves with SAN, UCI, average rating, result counts and opening metadata;
- dataset-specific representative/top-game references;
- source/profile, years, limits and cache timestamps.

Percentages are derived by consumers. Game PGNs and personal resolver evidence are not persisted.

## Frontend usage

The reusable Peer games widget is composed by Opening Analysis behind its existing header toggle. Its collapsed filter panel now contains two native selects:

- Time controls;
- Player level.

Defaults are Blitz and slower plus My peers and above. The widget displays the resolved effective population and whether peer evidence was recent, all-history, or a default estimate. It intentionally does not display top games.

## Non-goals

This implementation does not:

- weight separate speed datasets;
- expose arbitrary speed/rating multi-selects;
- expose client-selected public-game month ranges;
- persist a durable player level;
- compare public evidence with courses or personal move results;
- expose result filters or caller-controlled move limits;
- download public game PGNs;
- add a new queue, cache store or scheduled refresh process.