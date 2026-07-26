# Repertoire Builder Program Status

Last updated: 2026-07-26

## Current state

**Program state:** foundation merged; RB-001 completed on `main`; RB-002 is the next actionable P0 task.

**Runtime on `main`:** squash commit `49dc6499eac9998de864ccb75a607541cd945382` from PR #84 now provides the Lichess-benchmark profile, temporary peer resolver, preset Opening Explorer API, compact Peer games UI, tests and runtime documentation.

**GitHub program tracker:** [#105 — Repertoire Builder North Star program](https://github.com/vokerg/chess_repertoir_trainer/issues/105), open.

## RB-001 delivered scope

Available on `main`:

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

## Repository and GitHub issue state

- RB-001: `DONE`.
- [Issue #89](https://github.com/vokerg/chess_repertoir_trainer/issues/89): closed as completed after squash merge PR #84.
- RB-002: `READY`.
- [Issue #90](https://github.com/vokerg/chess_repertoir_trainer/issues/90): open, unblocked, and ready to be claimed.
- RB-003 and RB-008 remain independent parallel work in [#91](https://github.com/vokerg/chess_repertoir_trainer/issues/91) and [#96](https://github.com/vokerg/chess_repertoir_trainer/issues/96).
- Jira coordination for the program is retired; `CRT-2` through `CRT-18` are historical migration records.

Completion report:

- `reports/RB-001-2026-07-26-peer-population-presets.md`

## Validation

GitHub Actions run `30211739445` passed on implementation head `ba164767f139b8b7efa522edb050d2ca983a6171`:

- lint;
- workspace build;
- architecture guardrails;
- PostgreSQL migrations;
- complete repository tests.

Final PR-head CI run `30212157700` also passed before merge. The user accepted the delivery and requested the squash merge.

## Residual risks

- Chess.com band boundaries are rounded product mappings, not exact conversions.
- One mixed Lichess query deliberately ignores normal speed-rating disparity.
- The full distribution remains visible because one dominant interval can hide separated populations.
- Classical and correspondence do not contribute personal rating evidence.
- The generic fallback must remain visibly labelled.
- The temporary resolver does not independently deduplicate copies across owned accounts.
- The active default-profile change affects every current normalization consumer.

## Queue recommendation

Claim RB-002 / [#90](https://github.com/vokerg/chess_repertoir_trainer/issues/90) next for the durable multi-account player-level projection. RB-003, RB-008 and RB-014 remain valid independent work streams. No task order or priority change is recommended.