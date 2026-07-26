# RB-002 reconciliation — established correlation matrix and execution tracking

Date: 2026-07-26

Task: `RB-002`

Mapped Jira: `CRT-4`

Branch: `rb-002/crt-4-player-level-reconciliation`

Target branch: `main`

This is a scope and coordination reconciliation report, not an RB-002 completion report or implementation claim.

## Purpose

Reinspect the latest `main` implementation before starting RB-002, verify the previously agreed rating-correlation matrix and player-level formula, narrow the remaining task to productization of that existing capability, and clarify why Jira is unavailable through the current connector.

## Corrected finding: the normalized formula already exists

The active profile `universal-online-strength` / `2026-07-lichess-bands-v1` is an executable, versioned correlation matrix, not merely a reference table.

It defines explicit ranges for Chess.com and Lichess bullet, blitz and rapid and maps them into the nine canonical Lichess Explorer benchmark bands. The matrix is implemented in `rating-normalization.config.ts`, consumed through `classifyRating`, documented in `docs/rating-normalization.md`, and protected by exact-boundary tests.

RB-001 also already implemented the multi-account normalized aggregation formula in `peer-rating-band.service.ts`:

1. select eligible rated standard imported games for the requested speed preset;
2. retain account, provider, speed, game-recorded user rating and game count;
3. resolve the provider/speed rating pool;
4. classify each rating through the active correlation matrix;
5. map the resulting grade to its canonical Lichess benchmark band;
6. weight the band distribution by game count;
7. use recent-three-month evidence, then all history, then a generic fallback;
8. select the dominant interval with `dominant-contiguous-window-v1`;
9. return the complete distribution, selected groups, contributions, evidence period and profile/policy versions.

Therefore RB-002 does not own invention of the correlation, normalization, recency, game-count weighting or dominant-window formula. Those parts are already delivered and tested on `main`.

## Focused test evidence

The resolver regression test combines:

- Lichess blitz `1650`, six games;
- Chess.com blitz `1300`, four games;
- Chess.com rapid `1800`, two games.

These values are not averaged as raw numbers. Each is classified through its own provider/speed matrix column. The first two contribute ten games to canonical band `1600–1799`; Chess.com rapid `1800` contributes two games to `2000–2199`; the selected dominant group is `1600–1799`.

This directly verifies that the agreed correlation matrix is part of the runtime formula.

## Separate raw summary metric

`ImportedGameQueryService.summarize` also returns `averageUserRating`:

```text
sum(non-null game-recorded user ratings) / count(non-null game-recorded user ratings)
```

That field is a literal summary of the applied imported-game rows. The mixed-provider fixture value `1833.3` is synthetic test data derived from raw ratings `1600`, `1800`, and `2100`.

It does **not** test or represent the provider-normalized player-level formula. Using that fixture as the central RB-002 baseline was misleading in the first reconciliation pass.

The imported-game raw average may remain useful when its provider/speed context is clear, but it must not be combined with the normalized peer-level formula or presented as an exact universal rating.

## Reconciled RB-002 scope

The bounded implementation should now:

1. extract or relocate the existing normalized resolver from Opening Explorer-specific ownership into a shared player-level feature boundary;
2. expose the factual result independently of an Opening Explorer position query;
3. make Opening Explorer delegate to the shared service without semantic drift;
4. preserve the active matrix, supported speed presets, eligible evidence, three-month/all-history/default fallback, game-count weighting and dominant-window policy;
5. preserve profile and policy versions;
6. expose the dominant interval, complete distribution, evidence period, eligible-game count and account/provider/speed contributions;
7. add only the minimum contribution/conflict provenance required by later profile and target consumers;
8. add extraction, contract, route and regression tests.

The bounded implementation should not:

- invent a new correlation matrix;
- invent a new averaging or weighting formula;
- convert ratings into an exact provider-neutral number;
- center the player-level result on mixed-provider `averageUserRating`;
- add a Prisma snapshot by default;
- add custom activity caps or decay without demonstrated evidence;
- store a repertoire-target override.

Manual repertoire-target overrides belong to RB-006 and may reference the factual result without mutating it.

## Remaining decisions

- shared module and endpoint ownership;
- whether one requested preset result is sufficient or a compact multi-preset result is useful;
- whether all owned accounts or only active accounts remain the default input set;
- whether cross-account copies of the same physical game must be deduplicated now or tracked as a follow-up limitation;
- minimum evidence-quality/conflict vocabulary derived from existing period and distribution fields;
- minimum contribution detail needed for inspectability;
- whether realistic query cost ever justifies persistence.

These questions do not reopen the established matrix or normalized aggregation policy.

## Jira clarification

The Atlassian/Rovo connector was retested with a direct search for CRT-4 and returned HTTP 403:

```text
The app is not installed on this instance
```

Interpretation:

- this is not evidence that the user lacks permission to the CRT project;
- user permission grants cannot install the Rovo/ChatGPT app on the Atlassian site;
- an Atlassian site administrator must install/approve the app or reconnect the site integration;
- the current session cannot discover the cloud ID or inspect/update Jira issues.

No Jira issue was inspected, assigned, commented on or transitioned in this reconciliation.

RB-002 remains `READY` and unclaimed. The branch is a documentation reconciliation branch, not an implementation claim.

## GitHub-native alternative

GitHub Actions alone is not a task tracker. A complete GitHub-native replacement would use:

- GitHub Issues for one execution item per RB task;
- GitHub Projects for status, priority, order, assignee and roadmap views;
- branches and pull requests for implementation/review state;
- GitHub Actions for automated policy checks and validation.

Migration is not performed in this report. Creating duplicate GitHub issues before an explicit cutover decision would recreate the synchronization problem.

## Files inspected

- `apps/api/src/modules/rating-normalization/rating-normalization.config.ts`
- `apps/api/src/modules/rating-normalization/rating-normalization.service.ts`
- `apps/api/test/rating-normalization/rating-normalization.test.mjs`
- `docs/rating-normalization.md`
- `apps/api/src/modules/opening-explorer/peer-rating-band.service.ts`
- `apps/api/test/opening-explorer/peer-rating-band.service.test.mjs`
- `north-star/repertoire-builder/reports/RB-001-2026-07-26-peer-population-presets.md`
- `apps/api/src/modules/imported-games/imported-game-query.service.ts`
- `apps/api/test/imported-games/imported-game-summary.test.mjs`
- current RB-002 planning and coordination documents;
- recent repository commits and pull-request state.

## Documentation changed

- `tasks/RB-002-player-level-resolution.md`;
- `TASKS.md`;
- planning documents describing the corrected boundary;
- `JIRA.md`;
- this report.

## Validation

Performed:

- direct repository inspection through the GitHub connector;
- verified the complete active correlation matrix and derivation notes;
- verified exact matrix-boundary tests;
- traced `classifyRating` into the peer resolver;
- verified provider/speed-specific normalization before aggregation;
- verified game-count weighting and dominant-window selection;
- distinguished the synthetic mixed-provider raw-average fixture from normalized resolver evidence;
- created the reconciliation branch from current `main`;
- retested Atlassian search and recorded the exact error.

Skipped:

- build;
- tests;
- lint;
- architecture checks;
- migrations;
- browser validation.

Reason: runtime application code was not changed.

## Residual risks

- The current normalized resolver is owned by the Opening Explorer module despite being a broader player-level capability.
- Contribution rows expose game counts but not the exact normalized group or source-rating summary per contribution.
- Cross-account copies of the same physical game may influence the current resolver more than once.
- Account activity inclusion is implicit rather than a documented shared player-level policy.
- Jira and repository execution state may drift while the Atlassian app is unavailable.

## Queue and roadmap impact

- RB-002 remains order 20, P0 and `READY`.
- The task is substantially smaller than previously described: it promotes an existing formula rather than designing one.
- RB-004 and RB-006 remain blocked on the independently reusable product boundary, not on new calibration work.
- No new product task is required.
- No task order or priority change is recommended.
- Execution-tracker migration remains a separate coordination decision.

## Recommended next checkpoint

Choose the execution-tracker direction before substantive implementation:

1. restore/install the Atlassian app and reconcile CRT-4; or
2. explicitly approve migration to GitHub Issues/Projects, define the cutover rules, and use Actions only for automation/enforcement.

After tracker reconciliation, claim RB-002 for the bounded extraction and independent exposure of the existing normalized player-level formula.
