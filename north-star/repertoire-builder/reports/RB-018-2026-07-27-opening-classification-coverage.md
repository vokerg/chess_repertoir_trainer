# RB-018 completion report — Opening classification coverage

Date: 2026-07-27

Task: `RB-018`

GitHub issue: `#116`

Pull request: `#121`

Branch: `rb-018/issue-116-opening-classification-coverage`

## Outcome

RB-018 completes the systematic regex-coverage track established by RB-003. The pinned generated opening book now has a matching deterministic rule for every current entry and unique opening name, using a much smaller ordered registry rather than one application-authored record per generated row.

The active contract is `2026-07-rules-v2`.

## Measured generated-book coverage

| Metric | RB-003 baseline | RB-018 result |
| --- | ---: | ---: |
| Generated entries | 3,733 | 3,733 |
| Matched entries | 3,468 | 3,733 |
| Entry rule-match coverage | 92.9% | 100% |
| Unique names | 3,167 | 3,167 |
| Matched unique names | 2,928 | 3,167 |
| Unique-name rule-match coverage | 92.5% | 100% |
| Active rules | 77 | 114 |

The baseline was captured from CI audit run `30272269517`. The final regression contract requires zero unmatched entries in the pinned generated book.

## Important semantic boundary

One hundred percent **rule-match coverage** does not mean every dimension is asserted with high confidence.

- Major opening families receive side-aware soundness, character, theoretical status, burden and role defaults.
- Narrow exceptions override misleading family inheritance, including Damiano, Colorado Countergambit, Ponziani Countergambit and Blumenfeld Accepted roles.
- Rare heterogeneous families may receive only safely inferable traits, low confidence and explicit `UNKNOWN` soundness.
- Runtime names outside the pinned generated source still fall back to a structurally complete unknown result.

This preserves the RB-003 anti-fabrication boundary while ensuring every current generated opening has extractable characteristics and provenance.

## Delivered

- Expanded broad family coverage for the measured backlog, led by Zukertort, Pterodactyl, generic Indian, Nimzowitsch, King's Pawn Game and Ponziani families.
- Added maintainable coverage and correction modules beside the RB-003 foundation registry.
- Added narrow side-aware gambit and dubious-line exceptions.
- Replaced alphabetic unknown samples with frequency-ranked family backlogs.
- Added generated-entry, unique-name, unknown, both-sides-known, rule-usage and unused-rule metrics.
- Added weighted backlog helpers for actual imported-game frequencies.
- Added a database-backed imported-game audit using existing `ImportedGame.openingName` and `openingEco` values.
- Added CI artifacts for generated-book and imported-game audit outputs.
- Added regression tests that fail when a pinned generated opening has no matching rule.

## Imported-game calibration

Run against a populated database:

```sh
npm run opening-book:classification-game-audit --workspace=apps/api
```

The command reports game-weighted matched coverage, useful-profile coverage, missing opening metadata and a frequency-ranked unknown-family backlog. It reads existing imported-game metadata at runtime and adds no persistence, classification table, API, queue or background job.

CI validates this integration against its migrated test database. Because CI contains no user game history, its artifact is an integration proof rather than a production-user coverage measurement. Real-user weighting is now an operational audit, not missing implementation.

## Validation

- TypeScript lint.
- Complete workspace build.
- Generated-book classification audit.
- Architecture guardrails.
- PostgreSQL migrations.
- Imported-game classification audit.
- Focused family, exception, regex-boundary and weighted-backlog tests.
- Complete repository test suite.

Final GitHub Actions run: recorded in PR #121 after completion reconciliation.

## Architecture boundaries preserved

- No manual change to `openingBook.generated.ts`.
- No one-row-per-opening database model.
- No runtime LLM or external API.
- No Stockfish or engine-assisted classification workflow.
- No public API, MCP or Angular surface.
- No Player Chess Profile aggregation or candidate ranking.

## Consumer impact

RB-004 can calculate Player Chess Profile preference evidence without a large generated-name coverage gap. It must still expose low-confidence and unknown-dimension counts and distinguish rule-match coverage from semantic certainty.

RB-006/RB-007 can consume the same intrinsic profile contract without treating the classification registry as target intent or candidate evidence.

## Residual maintenance

- Upstream opening-book updates may introduce newly unmatched names; CI and the grouped audit surface them immediately.
- The unused-rule report currently keeps intentionally reviewable rules visible, including families absent from the pinned source.
- Boundary judgments remain reviewable chess assessments and may be revised through a new rule version when concrete consumer evidence justifies it.
