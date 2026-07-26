# RB-002 — Define multi-account player level resolution

Status: DONE

Priority: P0

Order: 20

Delivery class: Dual-use

Planning maturity: Resolved from merged implementation evidence

Claimed by: not separately claimed

Claim branch: not applicable

Claimed at: not applicable

Claim scope: closure reconciliation only; no additional runtime implementation

Unblocked at: 2026-07-26 after RB-001 merged through PR #84 as squash commit `49dc6499eac9998de864ccb75a607541cd945382`.

Completed at: 2026-07-26

## Outcome

The provider-aware multi-account player-level result required by this task is already delivered on `main` by RB-001.

The active runtime capability:

- uses the versioned `universal-online-strength` / `2026-07-lichess-bands-v1` correlation matrix;
- classifies Chess.com and Lichess bullet, blitz and rapid ratings through provider/speed-specific ranges;
- maps every eligible contribution into the canonical Lichess Explorer benchmark bands;
- weights the normalized distribution by imported-game count;
- uses recent-three-month evidence, then all eligible history, then a visibly labelled generic fallback;
- selects the dominant interval through `dominant-contiguous-window-v1`;
- returns the full distribution, selected groups, evidence period, eligible-game count, account/provider/speed contributions, normalization profile version and resolver policy version.

That is the inspectable multi-account player-level formula. A second “durable” formula, exact provider-neutral numerical rating, persistence model, confidence score or override model is not justified as a separate foundation task.

## Completion rationale

RB-002 was originally created before the final RB-001 scope was known. PR #84 expanded RB-001 from population presets into the complete factual peer-level boundary needed by later consumers.

The existing resolver already handles multiple owned accounts deterministically through grouped account/provider/speed/rating evidence and game-count contribution. Provider differences are handled before aggregation through the established correlation matrix; raw Chess.com and Lichess numbers are not averaged into the factual player-level result.

The separate imported-game `averageUserRating` field remains a literal summary of selected rows. It is not the cross-provider player-level formula and is not part of this completion claim.

## Delivered implementation evidence

### Rating normalization

- `apps/api/src/modules/rating-normalization/rating-normalization.config.ts`
- `apps/api/src/modules/rating-normalization/rating-normalization.service.ts`
- `apps/api/test/rating-normalization/rating-normalization.test.mjs`
- `docs/rating-normalization.md`

### Multi-account peer resolution

- `apps/api/src/modules/opening-explorer/peer-rating-band.service.ts`
- `apps/api/test/opening-explorer/peer-rating-band.service.test.mjs`
- `packages/contracts/src/opening-explorer/opening-explorer.schemas.ts`
- `apps/api/src/modules/opening-explorer/opening-explorer.service.ts`

### Delivery record

- PR: https://github.com/vokerg/chess_repertoir_trainer/pull/84
- Squash commit: `49dc6499eac9998de864ccb75a607541cd945382`
- Report: `reports/RB-001-2026-07-26-peer-population-presets.md`

## Acceptance assessment

- The implementation consumes one shared versioned normalization profile; no parallel levels table exists.
- Raw Chess.com and Lichess ratings are normalized before cross-provider aggregation.
- Every contribution retains account, provider, speed and game count.
- Recent, all-history and no-data fallback states are explicit.
- Multiple accounts contribute deterministically through grouped evidence and game counts.
- Separated populations remain visible in the complete distribution.
- The dominant peer interval is reproducible and available to Opening Explorer and later consumers.
- Normalization and resolver policy versions are returned.
- Focused tests cover multiple providers, speeds, recent/all-history/no-data fallback, matrix boundaries and divergent distributions.

## Explicit non-work

No separate RB-002 implementation is required for:

- a new correlation matrix;
- a new averaging or weighting formula;
- an exact universal numerical rating;
- a stored player-level snapshot;
- a generic confidence score;
- activity caps, decay or outlier suppression without measured defects;
- a manual repertoire target override;
- an independent player-level endpoint before a second consumer requires it.

## Follow-on ownership

- RB-004 may extract or rename the resolver contract when Player Chess Profile becomes the second factual consumer.
- RB-006 owns target snapshots and explicit user overrides without mutating factual evidence.
- Cross-account duplicate handling, account caps or richer conflict vocabulary should be added only when a concrete consumer or measured defect justifies them.
- Better rating calibration requires a new versioned normalization decision, not reopening RB-002.

## Validation

RB-001 implementation validation already passed:

- lint;
- workspace build;
- architecture guardrails;
- PostgreSQL migrations;
- complete repository tests;
- focused normalization, resolver, contract, OpenAPI and Angular tests.

This closure is documentation and issue reconciliation only; no runtime code changed.

## Completion

Report: `reports/RB-002-2026-07-26-delivered-by-rb-001.md`

Completed at: 2026-07-26
