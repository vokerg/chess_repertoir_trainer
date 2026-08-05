# RB-024 implementation report — AI game review opening-plan grounding

Date: 2026-08-03

Task: `RB-024`

GitHub issue: `#243`

Pull request: `#268`

Branch: `rb-024/issue-243-game-review-opening-grounding`

Delivery class: AI consumer integration

Status: Complete review package

## Outcome

Grounded the existing explicit, feature-gated imported-game AI review with bounded reviewed opening knowledge from RB-022.

The implementation:

- replays the stored PGN server-side and resolves the deepest available opening identity from moves;
- falls back to the imported game's stored ECO/name when a move-based match is unavailable;
- resolves classification and knowledge through the existing authoritative opening services;
- projects only the imported game's user side;
- bounds provider context to three plans, four conditions/caveats per plan and twelve matched knowledge rule IDs;
- exposes the projection as a typed context-builder result;
- includes knowledge version, matched IDs and plan content in the existing review input hash;
- adds grounding version 2 to invalidate pre-reconciliation artifacts while preserving the public schema and prompt-version metadata;
- validates structured plan references before accepting generated opening claims;
- constructs the public opening assessment from reviewed text and validated structured claims rather than provider prose;
- verifies prompt, model, analysis-run and complete input-hash identity before returning a persisted review.

No new endpoint, migration, background generation, runtime web lookup, Builder state, ranking input or course write was added.

## Authoritative opening path

`buildGameReviewContext` derives the UCI sequence while replaying the PGN that was already required for SAN reconstruction.

The selected opening entry is passed through:

1. `OpeningClassificationService.classify`;
2. `OpeningKnowledgeService.resolve`;
3. White/Black selection using the imported game's `userColor`.

Only reviewed data returned by `OpeningKnowledgeService` enters the provider context or public opening assessment. Missing opening identity and missing reviewed knowledge remain explicit deterministic fallbacks.

## Generated-claim reconciliation

The provider returns up to three internal opening-plan references. Each contains an exact supplied plan ID, authoritative ply and `ALIGNED` or `MISSED_OPPORTUNITY` claim.

The server rejects a review when:

- the plan ID was not supplied;
- the ply does not exist;
- a user-side plan is attached to an opponent move;
- a missed-opportunity claim lacks meaningful score-loss or move-classification support;
- the same plan and ply are repeated or assigned contradictory claim types.

Provider-authored `openingAssessment` text is ignored. The server renders the public assessment from:

- reviewed strategic summary or short description;
- reviewed plan title and summary;
- authoritative move number, side and SAN;
- validated claim type.

When reviewed knowledge is unavailable, the public response uses a deterministic no-guidance statement. The public `GAME_REVIEW` response remains schema version 1 because its wire shape is unchanged.

## Stored-review identity

The previous implementation stored an input hash but returned saved reviews without checking it.

RB-024 now re-reads the current completed analysis, rebuilds the deterministic review context and compares:

- response schema version;
- prompt version;
- configured model;
- analysis-run identity;
- grounding version;
- complete authoritative input hash.

Legacy rows with no analysis-run identity and any stale or mismatched artifact return `review: null`. This does not invoke the provider. Generation remains an explicit user action.

## Self-review findings and corrections

Implementation and final self-review identified and corrected five issues:

1. persisted review identity was stored but not verified on read;
2. user-side plans initially could be referenced against an opponent move;
3. Prisma correctly exposes legacy nullable `analysisRunId` values, while the first adapter type incorrectly assumed a value was always present;
4. validated structured references did not prevent free-form provider opening prose from inventing theory;
5. duplicate or contradictory references for the same plan and ply could produce inconsistent assessment text.

The branch was also rebuilt on the current `main` after four unrelated web/onboarding commits advanced the base.

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
- rejection of duplicate or contradictory claims;
- removal of fabricated provider opening prose;
- deterministic unavailable-knowledge public prose;
- persistence metadata and single-current-artifact behavior;
- provider error behavior through the existing OpenAI-compatible client tests.

## Validation status

The complete CI workflow is the merge gate for the final exact head recorded on PR #268. It covers:

- lint;
- full monorepo build;
- opening classification and knowledge audits;
- architecture guardrails;
- database migrations;
- imported-game classification and knowledge audits;
- complete repository test suite.

A live configured provider was not available in the execution environment. Provider request shape and failure isolation are covered by deterministic client/service tests; no deployment flag was enabled.
