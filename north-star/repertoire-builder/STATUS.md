# Repertoire Builder Program Status

Last updated: 2026-07-26

## Current state

**Program state:** foundation merged; RB-001 implementation complete and in review on PR #84.

**Runtime on `main`:** PR #80 still provides the raw rated-Lichess filters and PR #76 still provides normalization version `2026-07-product-v1`. PR #84 is not merged.

**Review delivery:** PR #84 contains the Lichess-benchmark profile, peer resolver, preset Opening Explorer API, compact Peer games UI, tests and runtime documentation.

**Jira epic:** CRT-2, `In Progress`.

## RB-001 review scope

Implemented on PR #84:

- speed presets: All speeds, Blitz and slower, Blitz, Bullet;
- rating targets: All players, My peers, My peers and above, one explicit Lichess group;
- defaults: Blitz and slower plus My peers and above;
- no ultraBullet or public-game month controls;
- one mixed Lichess request and the existing deterministic cache architecture;
- active normalization version `2026-07-lichess-bands-v1` with nine Lichess Explorer bands;
- historical `2026-07-product-v1` profile preserved;
- Chess.com and Lichess provider/speed classification;
- recent-three-month, all-history and generic 1400–1599 peer fallback;
- `dominant-contiguous-window-v1`: shortest one-to-three-band window covering at least 70%;
- direct population and resolver provenance;
- two native filter selects and resolved-population summary;
- focused contracts, API, resolver, cache, OpenAPI and Angular tests;
- canonical rating-normalization and Opening Explorer documentation.

No database migration, new cache store, queue, background job, dependency, durable player-level model or per-speed weighting was added.

## Repository and Jira state

- RB-001: `REVIEW`.
- CRT-3: `In Review` with PR #84.
- RB-002 / CRT-4: remains `BLOCKED` / `To Do` until RB-001 is accepted and merged.
- RB-003 and RB-008 remain independent parallel work.

Completion report:

- `reports/RB-001-2026-07-26-peer-population-presets.md`

## Validation

GitHub Actions run `30211739445` passed on implementation head `ba164767f139b8b7efa522edb050d2ca983a6171`:

- lint;
- workspace build;
- architecture guardrails;
- PostgreSQL migrations;
- complete repository tests.

Latest commits after that run are planning/report synchronization only. Browser-level visual review was unavailable in the connector-only environment and remains a human review item.

No merge to `main` has been performed.

## Residual risks

- Chess.com band boundaries are rounded product mappings, not exact conversions.
- One mixed Lichess query deliberately ignores normal speed-rating disparity.
- The full distribution remains visible because one dominant interval can hide separated populations.
- Classical and correspondence do not contribute personal rating evidence.
- The generic fallback must remain visibly labelled.
- The temporary resolver does not independently deduplicate copies across owned accounts.
- The active default-profile change affects every current normalization consumer.

## Queue recommendation

Review and merge RB-001 first. Unblock RB-002 only after accepted post-merge synchronization. No other task order or priority change is recommended.