# Rating normalization

## Role

This document is the canonical decision and usage guide for the app's cross-pool rating bands.

The executable profiles and helpers are defined in:

- `apps/api/src/modules/rating-normalization/rating-normalization.config.ts`
- `apps/api/src/modules/rating-normalization/rating-normalization.service.ts`
- `packages/contracts/src/rating-normalization/rating-normalization.schemas.ts`

`GET /api/rating-normalization/default` exposes the active profile. The performance-by-rating lab renders the active profile as a reference table. Opening Explorer peer targeting also classifies imported-game ratings through this domain before selecting Lichess population groups.

When this document and the executable profile disagree, treat code and tests as runtime truth and correct this document in the same change.

## Active profile

- Profile ID: `universal-online-strength`
- Version: `2026-07-lichess-bands-v1`
- Baseline pool: Lichess Blitz
- Online pools: Chess.com and Lichess bullet, blitz and rapid
- OTB reference: FIDE Standard
- Range semantics: `minInclusive` and `maxExclusive`; the final band is open-ended

The active nine bands match the rating groups accepted by Lichess Opening Explorer. They are coarse population filters, not titles, exact conversions, or claims that a player's ability changes materially at a one-point boundary.

## Active ranges

| Band | Chess.com blitz | Chess.com bullet | Chess.com rapid | Lichess blitz | Lichess bullet | Lichess rapid | FIDE Standard OTB |
|---|---:|---:|---:|---:|---:|---:|---:|
| `<1000` | `<500` | `<520` | `<630` | `<1000` | `<1000` | `<1000` | Not calibrated |
| 1000–1199 | 500–699 | 520–709 | 630–759 | 1000–1199 | 1000–1199 | 1000–1199 | Not calibrated |
| 1200–1399 | 700–959 | 710–959 | 760–959 | 1200–1399 | 1200–1399 | 1200–1399 | Not calibrated |
| 1400–1599 | 960–1269 | 960–1209 | 960–1229 | 1400–1599 | 1400–1599 | 1400–1599 | 1660–1679 |
| 1600–1799 | 1270–1569 | 1210–1469 | 1230–1509 | 1600–1799 | 1600–1799 | 1600–1799 | 1680–1769 |
| 1800–1999 | 1570–1879 | 1470–1729 | 1510–1779 | 1800–1999 | 1800–1999 | 1800–1999 | 1770–1904 |
| 2000–2199 | 1880–2179 | 1730–1989 | 1780–2039 | 2000–2199 | 2000–2199 | 2000–2199 | 1905–2069 |
| 2200–2499 | 2180–2639 | 1990–2359 | 2040–2339 | 2200–2499 | 2200–2499 | 2200–2499 | 2070–2319 |
| `2500+` | `2640+` | `2360+` | `2340+` | `2500+` | `2500+` | `2500+` | `2320+` |

## How the active profile was derived

The empirical starting point remains the July 2026 ChessGoals comparison, which uses Chess.com Blitz as its published baseline and provides cross-pool anchors:

- <https://chessgoals.com/rating-comparison/>
- <https://chessgoals.com/rating-comparison-explained/>

The active profile is a deliberate product projection from those anchors:

1. The canonical boundaries are fixed to the nine Lichess Explorer groups.
2. Lichess bullet, blitz and rapid classify directly into the same Lichess group for population targeting. This deliberately ignores normal speed-specific rating disparity for the first peer-population delivery.
3. Chess.com bullet, blitz and rapid boundaries are approximate same-speed mappings derived from the previous calibrated profile, interpolated to the Lichess group boundaries and rounded to practical ten-point values.
4. FIDE remains reference-only and is not used as imported-game population evidence.

The source metadata labels the Lichess-group alignment as `PRODUCT_ADJUSTMENT`. The profile does not claim that the rounded boundaries are empirical ten-point conversions.

## Confidence and soft padding

| Pool | Confidence | Soft padding |
|---|---|---:|
| Lichess blitz | High | 0 |
| Lichess bullet | Low | 0 |
| Lichess rapid | Medium | 0 |
| Chess.com blitz | Medium | 70 |
| Chess.com bullet | Low | 115 |
| Chess.com rapid | Medium | 90 |
| FIDE Standard | Low | 75 |

Zero padding on Lichess pools means the active product band boundary is the exact Explorer filter boundary. It does not mean cross-speed equivalence is exact. Bullet remains the least reliable indicator of broader playing strength.

## Opening Explorer peer targeting

The temporary peer resolver classifies each eligible imported-game rating using provider and speed context:

- Lichess account + bullet game → `LICHESS_BULLET`;
- Lichess account + blitz game → `LICHESS_BLITZ`;
- Lichess account + rapid game → `LICHESS_RAPID`;
- Chess.com account + equivalent speed → the matching `CHESS_COM_*` pool.

The returned grade maps directly to the corresponding Lichess Explorer group through the grade's `LICHESS_BLITZ.minInclusive` value. The resolver retains the active profile ID/version in its provenance.

The active profile does not itself resolve which accounts, periods, or speeds should dominate. That policy belongs to `peer-rating-band.service.ts` for the temporary Opening Explorer use case and later to RB-002 for durable player-level projection.

## Preserved legacy profile

The previous 13-grade profile is retained in code as `LEGACY_RATING_NORMALIZATION_PROFILE`:

- Version: `2026-07-product-v1`
- Baseline: Chess.com Blitz
- Purpose: historical calibration evidence and compatibility reference

It is no longer returned by `GET /api/rating-normalization/default`. Durable data that was derived from it must preserve its version rather than being silently reinterpreted through the active profile.

## Caveats

### Bullet

Bullet performance depends heavily on mouse speed, premoving, clock technique, connection quality and pool participation. Do not infer rapid, blitz or OTB strength from bullet alone. The temporary peer resolver may use bullet when the selected product preset is Bullet or All speeds, but its contribution remains visible.

### Speed disparity

The active Lichess bands intentionally use one group vocabulary across bullet, blitz and rapid because the Lichess Explorer endpoint accepts one shared rating-group list for a mixed speed query. This is an MVP population-filter decision, not a claim that a rating of 1800 has identical meaning in all three pools.

### FIDE Standard

FIDE Standard is reference-only:

- it is not an imported-game provider or performance report type;
- it must not be included in online-game SQL grouping;
- `null` means Not calibrated;
- narrow lower reference bands should not be treated as precise player partitions.

## Usage rules

1. Use stable band IDs for behavior and storage; labels are display copy.
2. Use half-open intervals in code.
3. Use the API profile rather than duplicating ranges in Angular or feature-local constants.
4. Keep FIDE out of imported online-game report types and provider enums.
5. Display unsupported ranges as `Not calibrated`.
6. Preserve profile ID/version with durable derived results.
7. Do not convert a rating into an exact rating in another pool. Classify into a band or expose an approximate source range.
8. Keep factual rating classification separate from profile recommendations and explicit repertoire-target overrides.

## Storage and configurability

Profiles live in source configuration behind a service boundary. This remains intentional:

- one profile is active globally;
- historical versions can remain exported for compatibility;
- changes require research, review, tests and a release;
- there is no runtime administrator or user editing workflow.

Do not add a database table only to make the current profile configurable. Introduce persistence when multiple active profiles, runtime administration, user-specific profiles, stored historical snapshots, or scheduled external calibration ingestion becomes a real requirement.

## Change procedure

A change to any band, range, confidence, padding or source must:

1. create a new profile version;
2. update configuration, exact-boundary tests and this document together;
3. preserve prior versions when durable consumers may reference them;
4. validate every online pool for complete, contiguous, non-overlapping coverage;
5. keep reference-only gaps explicit as `null`;
6. distinguish empirical inputs from product adjustments;
7. review all consumers of the active default profile.

## Agent entry points

Before changing rating normalization, inspect:

- `docs/rating-normalization.md`
- `packages/contracts/src/rating-normalization/rating-normalization.schemas.ts`
- `apps/api/src/modules/rating-normalization/rating-normalization.config.ts`
- `apps/api/src/modules/rating-normalization/rating-normalization.service.ts`
- `apps/api/src/modules/rating-normalization/rating-normalization.routes.ts`
- `apps/api/test/rating-normalization/rating-normalization.test.mjs`
- `apps/api/src/modules/opening-explorer/peer-rating-band.service.ts`
- the performance-by-rating Angular consumer and tests.