# RB-001 peer population presets completion report

Date: 2026-07-26

Status: complete and merged to `main`.

Task: RB-001

Jira: CRT-3

Branch: `north-star/rb-001-peer-presets-replan`

PR: https://github.com/vokerg/chess_repertoir_trainer/pull/84

Squash commit: `49dc6499eac9998de864ccb75a607541cd945382`

## Purpose

Turn the merged raw rated-Lichess Explorer integration into one compact, explainable peer-population capability reusable by Opening Analysis and the future repertoire builder.

## Delivered scope

### Product population presets

Speed presets:

- `ALL` — bullet, blitz, rapid, classical, correspondence;
- `BLITZ_AND_SLOWER` — blitz, rapid, classical, correspondence;
- `BLITZ`;
- `BULLET`.

Rating targets:

- `ALL`;
- `MY_PEERS`;
- `MY_PEERS_PLUS_ONE`;
- `GROUP` with one explicit Lichess group.

Defaults:

- `BLITZ_AND_SLOWER`;
- `MY_PEERS_PLUS_ONE`.

UltraBullet, arbitrary product-facing arrays, raw rating-group multi-selects and client-selected public-game months were removed from the product contract and UI.

### Rating normalization

Active profile:

- ID: `universal-online-strength`;
- version: `2026-07-lichess-bands-v1`;
- baseline: `LICHESS_BLITZ`;
- canonical bands: the nine Lichess Explorer groups.

The former `2026-07-product-v1` profile is retained as `LEGACY_RATING_NORMALIZATION_PROFILE` rather than silently mutated.

Chess.com mappings were derived from the previous same-speed calibration anchors, interpolated to Lichess Explorer boundaries and rounded to practical ten-point product values:

| Lichess band | Chess.com blitz min | Chess.com bullet min | Chess.com rapid min |
|---|---:|---:|---:|
| `<1000` | 0 | 0 | 0 |
| 1000–1199 | 500 | 520 | 630 |
| 1200–1399 | 700 | 710 | 760 |
| 1400–1599 | 960 | 960 | 960 |
| 1600–1799 | 1270 | 1210 | 1230 |
| 1800–1999 | 1570 | 1470 | 1510 |
| 2000–2199 | 1880 | 1730 | 1780 |
| 2200–2499 | 2180 | 1990 | 2040 |
| `2500+` | 2640 | 2360 | 2340 |

These are versioned approximate product mappings, not exact rating conversions.

### Temporary peer resolver

Service: `apps/api/src/modules/opening-explorer/peer-rating-band.service.ts`.

Eligible evidence:

- owned imported games;
- rated;
- standard/chess or variant-null;
- supported personal speed for the selected preset;
- known user color and game-recorded user rating.

Period fallback:

1. last three months;
2. all eligible history;
3. generic 1400–1599 fallback.

Resolver policy:

- version: `dominant-contiguous-window-v1`;
- distribution: all nine Lichess groups;
- candidate windows: one, two or three contiguous groups;
- target coverage: 70%;
- selection: narrowest qualifying window;
- qualifying tie-break: more games, then lower starting group;
- no qualifying window: highest mass, then narrower, then lower.

Returned provenance:

- evidence period;
- eligible game count;
- complete group distribution;
- selected peer groups;
- provider/account/speed contributions;
- normalization profile ID/version;
- resolver policy version.

### Opening Explorer and cache

The authenticated route now accepts only:

- `fen`;
- `speedPreset`;
- `ratingTarget`;
- `ratingGroup` when target is `GROUP`.

The service resolves one canonical speed list and rating-group list, sends one mixed Lichess request and reuses the existing shared cache repository.

The effective cache key retains the previous empty-month `since|until|ratings|speeds` layout, allowing compatible old mixed cache rows to remain reusable. Personal resolver provenance is attached after cache access and is never persisted in the system-wide public snapshot.

No database migration, new cache table, Redis entry, queue, scheduled job or dependency was introduced.

### Frontend

The existing Peer games widget retains its collapsible filter affordance but now displays two native selects:

- Time controls;
- Player level.

It displays the effective population and whether peer evidence came from the recent period, all history or the generic fallback. The widget continues to omit top-game presentation.

## Files and architecture areas changed

### Shared contracts

- `packages/contracts/src/opening-explorer/opening-explorer.schemas.ts`
- `packages/contracts/test/opening-explorer-contract.test.mjs`

### Rating normalization

- `apps/api/src/modules/rating-normalization/rating-normalization.config.ts`
- `apps/api/test/rating-normalization/rating-normalization.test.mjs`
- `docs/rating-normalization.md`

### Opening Explorer API/domain

- `apps/api/src/modules/opening-explorer/peer-rating-band.service.ts`
- `apps/api/src/modules/opening-explorer/opening-explorer.service.ts`
- `apps/api/src/modules/opening-explorer/opening-explorer.routes.ts`
- `apps/api/test/opening-explorer/peer-rating-band.service.test.mjs`
- `apps/api/test/opening-explorer/lichess-games-explorer.service.test.mjs`
- `apps/api/test/openapi/opening-explorer-openapi.test.mjs`
- `docs/opening-explorer.md`

### Angular

- `apps/web/src/app/shared/lichess-games-explorer/lichess-games-explorer.models.ts`
- `apps/web/src/app/shared/lichess-games-explorer/lichess-games-explorer-api.service.ts`
- `apps/web/src/app/shared/lichess-games-explorer/lichess-games-explorer-widget.component.ts`
- `apps/web/src/app/shared/lichess-games-explorer/lichess-games-explorer-widget.component.html`
- `apps/web/src/app/shared/lichess-games-explorer/lichess-games-explorer-widget.component.css`
- `apps/web/src/app/shared/lichess-games-explorer/lichess-games-explorer-widget.component.spec.ts`

### North Star/Jira coordination

Planning, task, status, roadmap, decision, open-question and dependency documents were synchronized on PR #84. After merge, RB-001/CRT-3 were completed and RB-002/CRT-4 was unblocked.

## Validation

Full GitHub Actions CI passed on implementation head `ba164767f139b8b7efa522edb050d2ca983a6171`, run `30211739445`:

- `npm run lint`;
- `npm run build`;
- `npm run check:architecture`;
- database migrations against PostgreSQL 16;
- complete repository `npm test`.

Final PR-head CI run `30212157700` also passed before the squash merge.

Focused coverage added or updated:

- contract defaults, explicit groups and invalid combinations;
- exact boundaries for every active Lichess group and representative Chess.com/FIDE boundaries;
- recent/all/default peer fallback;
- provider/speed conversion;
- dominant contiguous windows and separated distributions;
- explicit group and top-band behavior;
- cache hit, refresh, stale fallback, unavailable source and concurrent request deduplication;
- OpenAPI/route query validation;
- Angular default population, both selects and resolved summary.

Browser-level visual inspection was not available in the connector-only execution environment. The Angular build and component tests passed, and the user accepted the result and requested the squash merge.

## Limitations and residual risks

- Chess.com boundaries are rounded product mappings and should be reviewed when better empirical calibration is available.
- The mixed Lichess query deliberately ignores normal bullet/blitz/rapid rating disparity.
- The three-band resolver cap can omit a genuine broadly distributed population; the full distribution remains visible.
- Classical and correspondence contribute public games but not personal rating evidence.
- The generic fallback is product default evidence, not a factual player measurement.
- Imported copies of the same game across different owned accounts are not independently deduplicated in the temporary resolver.
- The active default normalization profile changes what the performance-by-rating lab displays.

## North-star impact

RB-001 now supplies a reusable, versioned target-population boundary:

- RB-002 can reuse the benchmark profile and resolver policy for durable player-level work;
- RB-004 can consume the eventual durable factual level and compare profile results against the same population vocabulary;
- RB-006 can model the fixed speed/rating preset contract without embedding query logic;
- RB-007 can consume direct effective-population provenance rather than opaque cache profile IDs.

## Jira and queue impact

- CRT-3: Done.
- RB-001: DONE.
- CRT-4: To Do and unblocked.
- RB-002: READY and the next actionable P0 task.
- No new RB task or Jira issue is required.
- No task order or priority change is recommended.

## Roadmap assessment

The revised roadmap remains valid. RB-002 is now the next critical-path task. RB-003, RB-008 and RB-014 remain independent parallel work.

## Completion state

Completed on 2026-07-26 through squash merge PR #84 as commit `49dc6499eac9998de864ccb75a607541cd945382`, followed by repository and Jira synchronization.