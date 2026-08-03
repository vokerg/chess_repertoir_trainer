# RB-024 implementation report — AI game review opening-plan grounding

Date: 2026-08-03

Task: `RB-024`

GitHub issue: `#243`

Pull request: `#268`

Branch: `rb-024/issue-243-game-review-opening-grounding`

Delivery class: AI consumer integration

Status: Review package

## Outcome

Grounded the existing explicit, feature-gated imported-game AI review with bounded reviewed opening knowledge from RB-022.

The implementation:

- replays the stored PGN server-side and resolves the deepest available opening identity from moves;
- falls back to the imported game's stored ECO/name when a move-based match is unavailable;
- resolves classification and knowledge through the existing authoritative opening services;
- projects only the imported game's user side;
- bounds provider context to three plans, four conditions/caveats per plan and twelve matched knowledge rule IDs;
- includes knowledge version, matched IDs and plan content in the existing review input hash;
- increments the internal game-review prompt version while preserving the external response schema;
- validates structured plan references before accepting generated opening claims;
- verifies prompt, model, analysis-run and complete input-hash identity before returning a persisted review.

No new endpoint, migration, background generation, runtime web lookup, Builder state, ranking input or course write was added.

## Authoritative opening path

`buildGameReviewContext` derives the UCI sequence while replaying the PGN that was already required for SAN reconstruction.

The selected opening entry is passed through:

1. `OpeningClassificationService.classify`;
2. `OpeningKnowledgeService.resolve`;
3. White/Black selection using the imported game's `userColor`.

Only reviewed data returned by `OpeningKnowledgeService` enters the provider context. Missing opening identity and missing reviewed knowledge remain explicit deterministic fallbacks; the provider is forbidden from supplying substitute opening theory.

## Generated-claim reconciliation

The provider returns up to three internal opening-plan references. Each contains an exact supplied plan ID, authoritative ply and `ALIGNED` or `MISSED_OPPORTUNITY` claim.

The server rejects a review when:

- the plan ID was not supplied;
- the ply does not exist;
- a user-side plan is attached to an opponent move;
- a missed-opportunity claim lacks meaningful score-loss or move-classification support.

The validated references remain internal reconciliation data. The public `GAME_REVIEW` response remains schema version 1 because its wire shape is unchanged.

## Stored-review identity

The previous implementation stored an input hash but returned saved reviews without checking it.

RB-024 now re-reads the current completed analysis, rebuilds the deterministic review context and compares:

- response schema version;
- prompt version;
- configured model;
- analysis-run identity;
- complete authoritative input hash.

Legacy rows with no analysis-run identity and any stale or mismatched artifact return `review: null`. This does not invoke the provider. Generation remains an explicit user action.

## Self-review findings and corrections

Implementation review identified and corrected three issues before the review package was finalized:

1. persisted review identity was stored but not verified on read;
2. user-side plans initially could be referenced against an opponent move;
3. Prisma correctly exposes legacy nullable `analysisRunId` values, while the first adapter type incorrectly assumed a value was always present.

The final behavior treats legacy/null identity as stale and keeps all claim validation server-side.

## Regression coverage

Focused tests cover:

- White and Black side-specific plan projection;
- PGN-based narrow Najdorf English Attack identity;
- stored ECO/name fallback;
- missing opening and missing reviewed knowledge;
- bounded context and knowledge version identity;
- valid generation and authoritative turning-point reconciliation;
- stale stored-review invalidation when side/context changes;
- unsupported plan IDs;
- unsupported missed-opportunity claims;
- rejection of a user-side plan attached to an opponent move;
- persistence metadata and single-current-artifact behavior;
- provider error behavior through the existing OpenAI-compatible client tests.

## Validation status

Implementation head `5f89753ecf9d5b72d99bef29b9748eaaf0e4294f` passed complete CI run #1836. The synchronized review-package head passed the same complete CI workflow before PR #268 was marked ready; the exact head and run are recorded on the pull request.

The workflow covers:

- lint;
- full monorepo build;
- opening classification and knowledge audits;
- architecture guardrails;
- database migrations;
- imported-game classification and knowledge audits;
- complete repository test suite.

A live configured provider was not available in the execution environment. Provider request shape and failure isolation are covered by deterministic client/service tests; no deployment flag was enabled.
