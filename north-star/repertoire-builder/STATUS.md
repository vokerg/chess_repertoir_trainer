# Repertoire Builder Program Status

Last updated: 2026-07-26

## Current state

**Program state:** foundation merged; RB-001 and RB-002 are complete on `main`; RB-003 remains the unresolved P0 foundation; RB-008 is the next actionable issue in queue order.

**Runtime on `main`:** squash commit `49dc6499eac9998de864ccb75a607541cd945382` from PR #84 provides the Lichess-benchmark profile, provider-aware multi-account peer resolver, preset Opening Explorer API, compact Peer games UI, tests and runtime documentation.

**GitHub program tracker:** [#105 — Repertoire Builder North Star program](https://github.com/vokerg/chess_repertoir_trainer/issues/105), open.

## RB-001 and RB-002 delivered scope

Available on `main`:

- speed presets: All speeds, Blitz and slower, Blitz, Bullet;
- rating targets: All players, My peers, My peers and above, one explicit Lichess group;
- defaults: Blitz and slower plus My peers and above;
- no ultraBullet or public-game month controls;
- one mixed Lichess request and the existing deterministic cache architecture;
- active normalization version `2026-07-lichess-bands-v1` with nine Lichess Explorer bands;
- historical `2026-07-product-v1` profile preserved;
- Chess.com and Lichess provider/speed classification through the established correlation matrix;
- multi-account game-count-weighted normalized band distribution;
- recent-three-month, all-history and generic 1400–1599 fallback;
- `dominant-contiguous-window-v1`: shortest one-to-three-band window covering at least 70%;
- full distribution, selected groups, eligible-game count, evidence period and account/provider/speed contributions;
- direct population and resolver provenance;
- two native filter selects and resolved-population summary;
- focused contracts, API, resolver, cache, OpenAPI and Angular tests;
- canonical rating-normalization and Opening Explorer documentation.

RB-002 is closed as delivered by this merged RB-001 implementation. A separate durable formula, exact universal number, persistence model, confidence score or override foundation is not justified without a concrete consumer or measured defect.

No database migration, new cache store, queue, background job, dependency, durable player-level model or per-speed weighting was added.

## Repository and GitHub issue state

- RB-001: `DONE`.
- [Issue #89](https://github.com/vokerg/chess_repertoir_trainer/issues/89): closed as completed after squash merge PR #84.
- RB-002: `DONE` through RB-001 delivery evidence.
- [Issue #90](https://github.com/vokerg/chess_repertoir_trainer/issues/90): closes as completed with the RB-002 closure documentation PR.
- RB-003 / [issue #91](https://github.com/vokerg/chess_repertoir_trainer/issues/91): `PROPOSED`, P0, independent and still requires scope discovery.
- RB-008 / [issue #96](https://github.com/vokerg/chess_repertoir_trainer/issues/96): `READY` and next actionable in queue order.
- RB-014 / [issue #102](https://github.com/vokerg/chess_repertoir_trainer/issues/102): remains an independent P2 research stream.
- Jira coordination for the program is retired; `CRT-2` through `CRT-18` are historical migration records.

Completion reports:

- `reports/RB-001-2026-07-26-peer-population-presets.md`
- `reports/RB-002-2026-07-26-delivered-by-rb-001.md`

## Dependency impact

- RB-004 no longer waits for RB-002; it remains blocked on RB-003.
- RB-006 no longer waits for RB-002; it remains blocked on RB-003 and requires input from RB-008.
- RB-007 no longer waits for RB-002; it remains blocked on RB-003 and RB-006.
- Later consumers may extract or rename the peer resolver when they become a genuine second consumer, without changing the factual formula.

## Validation

GitHub Actions run `30211739445` passed on RB-001 implementation head `ba164767f139b8b7efa522edb050d2ca983a6171`:

- lint;
- workspace build;
- architecture guardrails;
- PostgreSQL migrations;
- complete repository tests.

Final PR-head CI run `30212157700` also passed before merge. The user accepted the delivery and requested the squash merge.

The RB-002 closure is documentation and issue reconciliation only; runtime validation is inherited from PR #84.

## Residual risks

- Chess.com band boundaries are rounded product mappings, not exact conversions.
- One mixed Lichess query deliberately ignores normal speed-rating disparity.
- The full distribution remains visible because one dominant interval can hide separated populations.
- Classical and correspondence do not contribute personal rating evidence.
- The generic fallback must remain visibly labelled.
- Duplicate copies across owned accounts may contribute more than once.
- The resolver remains named and located under Opening Explorer until a second consumer justifies extraction.
- The active default-profile change affects every current normalization consumer.

## Queue recommendation

Claim RB-008 / [#96](https://github.com/vokerg/chess_repertoir_trainer/issues/96) next because it is the first `READY` issue after the completed foundations. RB-003 remains the higher-priority unresolved foundation but is intentionally `PROPOSED` and requires separate discovery before execution. No new task or priority change is recommended.
