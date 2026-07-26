# Rating normalization

## Role

This document is the canonical decision and usage guide for the app's cross-pool rating grades.

The executable profile is defined in:

- `apps/api/src/modules/rating-normalization/rating-normalization.config.ts`
- `apps/api/src/modules/rating-normalization/rating-normalization.service.ts`
- `packages/contracts/src/rating-normalization/rating-normalization.schemas.ts`

The API exposes the active profile through `GET /api/rating-normalization/default`. The performance-by-rating lab renders it as a reference table, but the profile is intended to be reusable by later comparison, recommendation, filtering, and reporting features.

When this document and the executable profile disagree, treat the code and tests as runtime truth and correct this document in the same change.

## Current profile

- Profile ID: `universal-online-strength`
- Version: `2026-07-product-v1`
- Baseline pool: Chess.com Blitz
- Online pools: Chess.com and Lichess bullet, blitz, and rapid
- OTB reference: FIDE Standard
- Range semantics: `minInclusive` and `maxExclusive`; the final grade is open-ended

The 13 grades are product-facing strength bands. They are not official titles, exact rating conversions, or claims that a player changes materially at a single-point boundary.

## Current ranges

| Grade | Chess.com blitz | Chess.com bullet | Chess.com rapid | Lichess blitz | Lichess bullet | Lichess rapid | FIDE Standard OTB |
|---|---:|---:|---:|---:|---:|---:|---:|
| Foundational | `<500` | `<550` | `<815` | `<1000` | `<1060` | `<1290` | Not calibrated |
| Novice | 500–699 | 550–684 | 815–994 | 1000–1199 | 1060–1179 | 1290–1424 | Not calibrated |
| Lower beginner | 700–899 | 685–839 | 995–1169 | 1200–1359 | 1180–1304 | 1425–1554 | Not calibrated |
| Upper beginner | 900–1099 | 840–1009 | 1170–1339 | 1360–1489 | 1305–1444 | 1555–1679 | Not calibrated |
| Lower intermediate | 1100–1299 | 1010–1194 | 1340–1499 | 1490–1619 | 1445–1584 | 1680–1794 | 1660–1684 |
| Intermediate | 1300–1499 | 1195–1384 | 1500–1654 | 1620–1754 | 1585–1734 | 1795–1904 | 1685–1739 |
| Upper intermediate | 1500–1699 | 1385–1589 | 1655–1799 | 1755–1884 | 1735–1889 | 1905–2014 | 1740–1819 |
| Advanced club | 1700–1899 | 1590–1794 | 1800–1934 | 1885–2014 | 1890–2049 | 2015–2114 | 1820–1914 |
| Strong club | 1900–2099 | 1795–2004 | 1935–2054 | 2015–2144 | 2050–2214 | 2115–2214 | 1915–2019 |
| Expert | 2100–2299 | 2005–2214 | 2055–2164 | 2145–2274 | 2215–2379 | 2215–2309 | 2020–2134 |
| Master-track | 2300–2499 | 2215–2424 | 2165–2259 | 2275–2409 | 2380–2549 | 2310–2399 | 2135–2244 |
| Master-level | 2500–2699 | 2425–2629 | 2260–2339 | 2410–2539 | 2550–2714 | 2400–2489 | 2245–2349 |
| Elite | `2700+` | `2630+` | `2340+` | `2540+` | `2715+` | `2490+` | `2350+` |

## Evidence and deliberate product choices

The empirical starting point is the July 2026 ChessGoals rating comparison, which uses Chess.com blitz as its baseline and maps active players across online pools and FIDE Standard:

- <https://chessgoals.com/rating-comparison/>
- <https://chessgoals.com/rating-comparison-explained/>

The table is a product normalization profile derived from that comparison, not a claim that every individual player has an exact equivalent rating in another pool. The profile's source metadata distinguishes empirical inputs from deliberate product adjustments.

The profile does not claim ten-point conversion precision. Its `softPadding` metadata records a practical ambiguity width for each non-baseline pool:

| Pool | Confidence | Soft padding |
|---|---|---:|
| Chess.com blitz | High | 0 |
| Chess.com bullet | Low | 135 |
| Chess.com rapid | Medium | 115 |
| Lichess blitz | Medium | 70 |
| Lichess bullet | Low | 115 |
| Lichess rapid | Medium | 90 |
| FIDE Standard | Low | 75 |

### Lichess blitz low-end adjustment

The current empirical comparison places 500 Chess.com blitz around 1090 Lichess blitz. The product deliberately uses **1000 Lichess blitz** as the first boundary and smooths the next two ranges:

- Foundational: `<1000`
- Novice: `1000–1199`
- Lower beginner: `1200–1359`

Reasons:

- the first empirical row is a low-end edge rather than a well-supported full-tail mapping;
- the reported uncertainty is much wider than ten points;
- previous yearly estimates were closer to 1000;
- a round product boundary avoids false precision;
- the adjustment avoids classifying established 1000–1089 Lichess blitz players in the bottom grade.

This is encoded as source role `PRODUCT_ADJUSTMENT`, not presented as an empirical fact.

### Bullet caveat

Bullet has the lowest confidence among the online pools. Fast-time-control skill depends heavily on mouse speed, premoving, clock technique, connection quality, and pool participation. Do not infer a player's rapid, blitz, or OTB strength from bullet alone. Near a bullet boundary, adjacent grades are both plausible within the configured soft padding.

The current bullet ranges remain the empirical profile values. Any future adjustment must be versioned and supported by a separate analysis rather than silently changing the table.

### FIDE Standard caveat

FIDE Standard is **reference-only**:

- it is not an imported-game provider or performance report type;
- it must not be included in online-game SQL grouping;
- it is not calibrated for the first four grades;
- `null` means “Not calibrated”, not zero or “below 1660”;
- published FIDE ratings have participation, federation, age, recency, and post-2024 rating-reform effects that do not exist in the same way online.

The first calibrated point is 1100 Chess.com blitz to approximately 1660 FIDE Standard. The narrow lower FIDE bands are much smaller than the uncertainty window and should be treated as reference anchors, not precise player partitions.

## Usage rules

1. Use stable grade IDs for storage and behavior; labels are display copy.
2. Use half-open intervals in code. For example, `1000 <= rating < 1200` is Novice in Lichess blitz.
3. Use the API profile rather than duplicating ranges in Angular or feature-local constants.
4. Keep FIDE out of imported online-game report types and provider enums.
5. Display unsupported ranges as `Not calibrated`.
6. For similarity or recommendation features, use `softPadding` to consider an adjacent grade near a boundary.
7. Do not convert one rating into an exact rating in another pool. Prefer grade membership or approximate ranges.
8. Persist the profile ID and version with any durable derived result that must remain historically reproducible.

## Storage and configurability

The profile currently lives in source configuration behind a service boundary. This is intentional:

- there is one global profile;
- changes require research, review, tests, and a release;
- source control provides a clear history;
- there is no current administrator or user editing workflow.

Do not add a database table merely to make the current profile “configurable”. Move profile storage to the database only when one of these requirements becomes real:

- multiple active or selectable profiles;
- runtime administration without deployment;
- user-specific profiles;
- historical reports pinned to stored profile versions;
- scheduled ingestion of independently maintained calibration datasets.

If persistence is introduced, keep the existing contract and service API. Prefer a versioned validated JSON profile over one row per range unless querying individual ranges becomes a demonstrated requirement.

## Change procedure

A change to any grade, label, range, confidence, padding, or source must:

1. create a new profile version;
2. update the API configuration and this document together;
3. preserve stable grade IDs unless the concept itself changes;
4. update exact-boundary tests, including the value immediately below and at each changed boundary;
5. validate online pools for complete, contiguous, non-overlapping coverage;
6. keep reference-only gaps explicit as `null`;
7. describe empirical changes separately from product adjustments in the pull request;
8. consider whether durable consumers need to retain the previous profile version.

## Agent entry points

Before changing rating normalization, inspect:

- `docs/rating-normalization.md`
- `packages/contracts/src/rating-normalization/rating-normalization.schemas.ts`
- `apps/api/src/modules/rating-normalization/rating-normalization.config.ts`
- `apps/api/src/modules/rating-normalization/rating-normalization.service.ts`
- `apps/api/src/modules/rating-normalization/rating-normalization.routes.ts`
- `apps/api/test/rating-normalization/rating-normalization.test.mjs`
- the consuming frontend store, API service, component, and tests under `apps/web/src/app/features/lab/experiments/performance-by-rating/`

Do not infer that the profile is used for normalized game aggregation merely because it is rendered in the lab. Check the current repository behavior before proposing or implementing such use.
