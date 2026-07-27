# RB-004 — Player Chess Profile calculation

Date: 2026-07-27

Issue: [#92](https://github.com/vokerg/chess_repertoir_trainer/issues/92)

Claim PR: [#135](https://github.com/vokerg/chess_repertoir_trainer/pull/135)

Implementation PR: [#136](https://github.com/vokerg/chess_repertoir_trainer/pull/136)

Implementation branch: `rb-004/issue-92-player-chess-profile-engine`

State: review

## Outcome

RB-004 now has a deterministic, authenticated Player Chess Profile calculation with standalone API value and a shared wire contract for later RB-005 and builder consumers.

The implementation:

- filters owned imported games by account, inclusive UTC date range, RB-001 speed preset, user color, rated status, user rating, and opponent rating;
- reuses `buildImportedGameWhere` and standard-variant eligibility;
- consumes the completed RB-001/RB-002 peer-resolution result without adding a second player-level formula or persistence model;
- consumes the side-aware RB-003/RB-018 opening-classification contract without duplicating or changing its rules;
- separates opening-character exposure from performance;
- exposes selected-game baselines, analysis coverage, sample size, evidence strength, opening support, and bounded example games;
- handles no-data, small-sample, incomplete-analysis, low-confidence, unknown-dimension, and truncated-opening-group states explicitly;
- adds no schema migration, stored personality label, LLM conclusion, candidate ranking, course write, or frontend page.

## Public contract

Authenticated endpoint:

```http
GET /api/player-chess-profile
```

Shared schemas:

```text
@chess-trainer/contracts/player-chess-profile
```

Request filters:

- `accountIds`;
- date-only `from` and `to`;
- `speedPreset`: `ALL`, `BLITZ_AND_SLOWER`, `BLITZ`, or `BULLET`;
- `colors`: White and/or Black;
- `rated`;
- minimum/maximum user rating;
- minimum/maximum opponent rating;
- supporting-game limit from 1 to 10.

The default period is the inclusive three-month interval ending on the current UTC date. The default speed preset is Blitz and slower, both colors are included, and rated games are selected.

## Calculation contract

### Evidence unit

One owned `ImportedGame` row is one evidence unit. Account filtering is applied through the existing ownership-aware imported-game predicate. Cross-provider duplicate-game elimination is not added because the repository has no stable cross-provider game identity; account segmentation remains available when this distinction matters.

Only standard chess is eligible: `variant` may be null, `chess`, or `standard`.

### Preference

Preference is exposure, not demonstrated performance.

Every bounded classified opening/color group contributes the user's side profile to:

- character;
- soundness;
- theoretical status;
- theory burden;
- role.

Because character and role may be multi-valued, their exposure percentages are independent and are not expected to sum to 100%.

### Performance

Performance remains independent from preference.

For the selected game set:

```text
score percentage = (wins + 0.5 × draws) / recognized-result games
```

Each classified dimension/value group reports:

- games, analysed games, and accuracy games;
- wins, draws, and losses;
- score percentage;
- score delta from the selected-game baseline;
- opening-positive rate;
- opening-trouble rate;
- early-mistake rate;
- user-side average accuracy;
- result and analysis evidence strength;
- up to three supporting opening groups.

Opening-positive games use `OPENING_SUCCESS` or `OPENING_ADVANTAGE`. Opening-trouble games use `OPENING_DISASTER` or `OPENING_TROUBLE`. Early mistakes use `EARLY_BLUNDER` or `EARLY_MISTAKE`. These tags are supporting signals rather than an unexplained style label.

Analysis-derived rates use analysed games as the denominator. They remain unavailable when that denominator does not exist.

### Evidence strength

Result evidence:

- fewer than 5 games: `INSUFFICIENT`;
- 5–14 games: `LOW`;
- 15–39 games: `MEDIUM`;
- 40 or more games: `HIGH`.

Analysis evidence uses the same analysed-game thresholds but is forced to `INSUFFICIENT` when fewer than five games are analysed or analysis coverage is below 50% of the group.

These grades describe evidence volume and coverage. They are not significance tests and are separate from factual rating-normalization provenance.

### Conclusions

The first deterministic conclusion layer is intentionally small:

- strongest non-unknown opening-character exposure with at least five classified games;
- better or worse opening-character results only with at least ten games and a score delta of at least five percentage points;
- elevated opening trouble only with usable analysis evidence and a rate at least five percentage points above baseline;
- otherwise an explicit insufficient-data conclusion.

Conclusion wording is correlational and scoped to the selected games. It does not claim that an opening character caused rating improvement or establish one permanent player personality.

## Opening-classification boundary

Opening groups are aggregated by stored ECO, opening name, and user color.

Exact generated-book ECO/name matches use the complete generated entry. A stored name/ECO that is not an exact generated entry is evaluated through the same ordered RB-003/RB-018 rule registry and is marked with source `STORED_NAME_ECO`.

The response records:

- active classification version;
- matched-rule provenance;
- classification source;
- classified-game count;
- low-confidence game count;
- unknown-core-dimension game count.

No classification rule or result is persisted by RB-004.

## Database boundedness

The implementation uses Prisma `count`, `groupBy`, and bounded `findMany` operations.

The matching game corpus is never loaded for Node-side reduction. Opening aggregation is capped at the 100 highest-volume ECO/name/color groups plus one row for truncation detection. Follow-up grouped queries operate only on those selected identities.

The response exposes:

- named opening games;
- games represented by the bounded groups;
- omitted opening games;
- group limit;
- truncation state.

Supporting games are bounded to 1–10 recent references.

## Tests

### Shared contract

Covers:

- CSV and scalar query coercion;
- default filters;
- invalid date and rating ranges;
- complete response parsing;
- malformed response rejection.

### Deterministic service

Covers:

- default three-month range;
- sample and analysis evidence thresholds;
- normalized account ordering;
- speed-preset mapping;
- selected-game baseline;
- separate preference and performance sections;
- positive and negative score deltas;
- elevated opening-trouble conclusion;
- bounded supporting-game mapping;
- no-data outcome.

### Database-backed endpoint

Covers:

- authentication and route registration;
- account, date, speed, and color filters;
- multiple owned accounts across Lichess and Chess.com;
- wins/draws/losses and score baseline;
- opening-positive, opening-trouble, and early-mistake rates;
- bounded supporting games;
- invalid range response.

### Bounded performance check

A database-backed test creates 1,200 owned blitz games across 120 opening/color groups. It verifies:

- all 1,200 games are counted;
- only 100 groups and 1,000 games enter the bounded profile aggregation;
- 200 opening games are reported as omitted;
- truncation is explicit;
- supporting games remain bounded;
- the endpoint completes within a deliberately loose 20-second CI ceiling.

This is a synthetic boundedness/regression check, not a production latency benchmark. A populated production-environment observation remains useful after integration.

## Validation

Final implementation-head GitHub Actions run: `30287398030` / CI run #1103 — success.

Passed:

- dependency installation;
- TypeScript lint across API, web, and mobile;
- complete monorepo build;
- generated opening-classification audit;
- architecture guardrails;
- PostgreSQL migrations;
- imported-game opening-classification audit;
- complete repository test suite, including RB-004 contracts, service tests, multi-account endpoint coverage, and the 1,200-game bounded performance check.

An earlier run failed during API TypeScript lint because Prisma does not support ordering grouped rows by `_count._all` and an explicit helper return type conflicted with Prisma's generic inference. The implementation now orders by the non-null `id` count and leaves the helper result inferred. Subsequent full runs passed.

Local full-repository commands were unavailable because the execution environment could not resolve `github.com` for cloning. Connector inspection, local syntax/static checks, and GitHub Actions provide the validation evidence.

## Architecture and scope

Added:

- one feature-local API module;
- one shared HTTP contract subpath;
- route-schema OpenAPI registration;
- feature documentation and focused tests.

Not added:

- Prisma model or migration;
- background job or queue;
- stored profile snapshot;
- Angular or mobile UI;
- second rating model;
- opening-classification changes;
- target, candidate, or course-write behavior;
- LLM dependency.

## RB-005 readiness

RB-005 can proceed after RB-004 is accepted and integrated. The wire contract already exposes the filter context, coverage, baseline, profile dimensions, conclusions, supporting openings, and supporting games required for a standalone recalculable experience.

RB-005 still owns:

- visual hierarchy and wording review;
- period comparison UX;
- expandable evidence and supporting-game navigation;
- user rejection/correction interaction and whether feedback is stored;
- presentation of low-confidence, unknown-dimension, and truncated evidence;
- responsive and accessibility behavior.

No additional calculation task is required before RB-005 unless review identifies a statistical contract defect.

## Residual risks

- Sample grades are understandable deterministic evidence bands, not formal significance estimates.
- The selected-game baseline does not provide an opening-character peer-population performance benchmark because no equivalent peer profile dataset currently exists.
- Cross-provider duplicate copies can be counted more than once when multiple accounts are selected.
- Stored names outside the exact generated book rely on rule-registry matching from name/ECO metadata and expose that source explicitly.
- The 100-group cap intentionally truncates the long tail and requires consumers to show coverage rather than silently implying completeness.
- Production latency should be observed on a populated environment after integration.

## Queue impact

- RB-004 moves from `IN_PROGRESS` to `REVIEW` through PR #136.
- RB-005 remains blocked until RB-004 is accepted and integrated.
- RB-006 remains independently ready and may proceed in parallel with normal collision checks.
- RB-007 remains blocked on RB-006.
- RB-017 remains an isolated non-production pilot.
- No new RB task is required from this implementation.
