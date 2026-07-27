# RB-018 — Complete opening classification coverage

Status: DONE

Priority: P1

Order: 35

Delivery class: Dual-use

Planning maturity: Agreed

GitHub issue: `#116`

Claimed by: ChatGPT session

Claim branch: `rb-018/issue-116-opening-classification-coverage-claim`

Implementation branch: `rb-018/issue-116-opening-classification-coverage`

Pull request: `#121`

Claimed at: 2026-07-27

Started at: 2026-07-27

Completed at: 2026-07-27

Claim scope: complete the deterministic opening-classification coverage track without changing the RB-003 contract. The work covers maintainable family-rule organization, a grouped and prioritized unknown-name audit, representative family/subfamily/exception rules and tests, generated-entry and unique-name coverage reporting, and actual imported-game-weighted coverage where the current assignment data makes that possible. It excludes Stockfish, runtime AI, persistence, API/UI work, background jobs, generated-book edits, and Player Chess Profile aggregation.

## Outcome

The active `2026-07-rules-v2` registry provides deterministic rule-match coverage for all 3,733 entries and all 3,167 unique names in the pinned generated opening book through 114 ordered rules.

Coverage is obtained through broad family inheritance and narrow overrides, not one application-authored record per generated row. Rare heterogeneous families deliberately retain low confidence or explicit `UNKNOWN` dimensions where stronger claims would be fabricated.

## Why this task exists

RB-003 established the deterministic vocabulary, rule ordering, side-aware output, provenance, confidence, and audit boundary. It intentionally did not attempt to classify every generated opening variation.

The generated book contains thousands of deeply named entries that inherit from a much smaller number of family and subfamily regex rules. RB-018 completed that systematic expansion and maintenance process without introducing per-entry storage or runtime AI.

## Delivered

- Kept the implementation regex-based, deterministic, ordered and versioned.
- Split coverage expansion and corrected regex replacements into maintainable rule modules.
- Replaced alphabetic unknown examples with a frequency-ranked family backlog.
- Expanded all measured unmatched generated families, prioritizing the largest gaps first.
- Added broad family rules and narrow exceptions where inheritance would misrepresent soundness or gambit roles.
- Preserved independent White and Black assessments.
- Added generated-entry, unique-name, unknown, both-sides-known, rule-usage and unused-rule metrics.
- Added frequency-weighted backlog support and a database-backed imported-game coverage audit.
- Added representative family, exception, regex-boundary and complete pinned-book regression tests.
- Added CI artifacts for both generated-book and imported-game audit outputs.

## Coverage interpretation

- Pinned generated-book rule-match coverage is 100%.
- Rule matching means extractable characteristics and provenance are available for every current generated name.
- It does not mean every dimension is high-confidence: rare groups may retain `UNKNOWN` soundness and low confidence.
- Runtime names outside the pinned source still receive the explicit unknown fallback.
- Actual user-game weighting can be measured against any populated environment without new persistence.

## Commands

```sh
npm run opening-book:classification-audit --workspace=apps/api
npm run opening-book:classification-game-audit --workspace=apps/api
```

## Dependencies and consumer impact

- RB-003 / issue #91 is merged and remains the stable method contract.
- RB-004 may consume the completed coverage but must preserve low-confidence and unknown-dimension counts.
- RB-005 may present profile conclusions once RB-004 defines evidence and confidence semantics.
- RB-006/RB-007 may consume intrinsic opening characteristics without conflating them with target intent or candidate ranking.

## Boundaries preserved

- No Stockfish or engine-assisted auditing.
- No runtime LLM calls.
- No database classification table or one row per generated opening.
- No manual edits to `openingBook.generated.ts`.
- No public API, MCP or Angular presentation.
- No Player Chess Profile aggregation or repertoire candidate ranking.
- No queue or background job.

## Validation

- TypeScript lint.
- Complete workspace build.
- Generated-book classification audit.
- Architecture guardrails.
- PostgreSQL migrations.
- Imported-game classification audit.
- Focused opening-classification tests.
- Complete repository CI.

## Completion

Report: `reports/RB-018-2026-07-27-opening-classification-coverage.md`

Completed at: 2026-07-27
