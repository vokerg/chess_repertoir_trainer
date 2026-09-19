# RB-002 completion report — delivered by RB-001

Date: 2026-07-26

Task: RB-002

GitHub issue: #90

Status: complete through existing merged implementation evidence

Closure branch: `docs/rb-002-close-as-delivered`

## Purpose

Reinspect current `main` after the GitHub Issues migration and determine whether RB-002 still requires a separate implementation.

## Finding

It does not.

PR #84 delivered the complete factual player-level boundary that RB-002 was intended to establish:

- a versioned provider/speed correlation matrix;
- provider-aware classification for Chess.com and Lichess bullet, blitz and rapid;
- normalization into the nine canonical Lichess Explorer bands;
- multi-account evidence grouped by account/provider/speed/rating;
- game-count-weighted normalized distribution;
- recent-three-month, all-history and generic fallback states;
- deterministic dominant contiguous interval selection;
- full distribution, contribution, evidence-period and version provenance.

The runtime formula is not the mixed-provider `averageUserRating` summary. Raw ratings are classified through their provider/speed matrix columns before they contribute to the player-level distribution.

## Why no further implementation is justified

The remaining scope previously attached to RB-002 consisted primarily of speculative persistence, confidence, caps, decay, outlier handling, overrides and an independent endpoint.

None is required by the current factual consumer:

- Opening Explorer already consumes the resolver directly;
- the result is reproducible on demand;
- there is no measured query-performance or invalidation problem;
- no second consumer currently requires a separately named endpoint or module;
- manual target overrides belong to RB-006;
- richer Player Chess Profile semantics belong to RB-004;
- duplicate-game or activity-cap changes require evidence of a real defect before changing the versioned policy.

Creating a second formula or persisted projection would duplicate an established boundary and add premature state.

## Runtime evidence inspected

- `apps/api/src/modules/rating-normalization/rating-normalization.config.ts`
- `apps/api/src/modules/rating-normalization/rating-normalization.service.ts`
- `apps/api/test/rating-normalization/rating-normalization.test.mjs`
- `docs/rating-normalization.md`
- `apps/api/src/modules/opening-explorer/peer-rating-band.service.ts`
- `apps/api/test/opening-explorer/peer-rating-band.service.test.mjs`
- `apps/api/src/modules/opening-explorer/opening-explorer.service.ts`
- `packages/contracts/src/opening-explorer/opening-explorer.schemas.ts`
- `apps/api/src/modules/imported-games/imported-game-query.service.ts`
- `apps/api/test/imported-games/imported-game-summary.test.mjs`

## Existing delivery record

- RB-001 issue: #89
- Implementation PR: #84
- Squash commit: `49dc6499eac9998de864ccb75a607541cd945382`
- Implementation report: `reports/RB-001-2026-07-26-peer-population-presets.md`
- Full implementation CI passed before merge.

## Documentation reconciliation

This closure updates:

- `tasks/RB-002-player-level-resolution.md`;
- `TASKS.md`;
- `STATUS.md`;
- `ROADMAP.md`;
- `DECISIONS.md`;
- `OPEN_QUESTIONS.md`;
- this report.

The documents now record RB-002 as completed through RB-001 rather than as a separate implementation gate.

## Issue and queue impact

- Issue #90 should close as completed after this documentation PR is squash-merged.
- Program tracker #105 should mark #90 complete.
- RB-004 and RB-006 are no longer blocked on RB-002; both remain blocked on their other documented dependencies.
- RB-003 remains P0 but intentionally `PROPOSED`.
- RB-008 / issue #96 is the next actionable task in queue order.
- No new issue is required.

## Validation

Performed:

- inspected current `main` after GitHub Issues migration PR #106;
- inspected issue #90 and program tracker #105;
- traced the active matrix through `classifyRating` into the peer resolver;
- verified provider/speed normalization occurs before aggregation;
- verified multi-account/provider/speed resolver tests;
- distinguished the raw imported-game average fixture from normalized player-level evidence;
- reviewed the North Star task, queue, status, roadmap, decisions and open questions.

Skipped:

- build;
- lint;
- tests;
- migrations;
- browser validation.

Reason: this closure changes documentation and issue state only. Runtime implementation and validation are inherited from accepted PR #84.

## Residual risks

- the resolver remains named and located under Opening Explorer despite being reusable factual logic;
- contribution rows do not expose every possible explanatory detail;
- duplicate copies across owned accounts may contribute more than once;
- the correlation matrix is approximate and versioned rather than an exact conversion.

These are documented limitations, not evidence that a separate RB-002 implementation is currently needed.

## Completion state

RB-002 is complete. Future extraction or policy revision belongs to the first consumer or measured defect that requires it and must preserve or explicitly version the existing formula.
