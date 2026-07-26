# RB-002 reconciliation — existing average rating and execution tracking

Date: 2026-07-26

Task: `RB-002`

Mapped Jira: `CRT-4`

Branch: `rb-002/crt-4-player-level-reconciliation`

Target branch: `main`

This is a scope and coordination reconciliation report, not an RB-002 completion report or implementation claim.

## Purpose

Reinspect the latest `main` implementation before starting RB-002, determine whether the repository already defines the user's average rating, narrow the remaining player-level scope, and clarify why Jira is unavailable through the current connector.

## Finding: the raw average formula already exists

`apps/api/src/modules/imported-games/imported-game-query.service.ts` already returns `averageUserRating` from the imported-game summary.

The formula is:

```text
sum(non-null game-recorded user ratings) / count(non-null game-recorded user ratings)
```

Implementation properties:

- the user's rating is selected from White or Black according to `userColor`;
- White- and Black-side database aggregate groups are recombined with their rating counts, so the result is correctly weighted;
- the result is rounded to one decimal place;
- the complete imported-game filter applies, including accounts, providers, speeds and dates;
- the same summary also returns `averageOpponentRating` and other breakdowns;
- the summary is available through the HTTP service and MCP tool;
- `apps/api/test/imported-games/imported-game-summary.test.mjs` verifies a multi-account, multi-provider result.

Therefore RB-002 must not introduce another generic user-average formula.

## Important semantic boundary

The existing raw average answers:

> What was my average recorded rating in this selected set of games?

It does not safely answer:

> What is my exact provider-neutral chess strength?

The current regression fixture intentionally mixes Lichess and Chess.com rows. Its expected `averageUserRating` is a direct arithmetic average of the selected raw ratings. That is valid as a description of those rows, but Chess.com and Lichess ratings cannot be interpreted as the same numerical scale.

The repository already has the second required boundary:

- active normalization profile `universal-online-strength` / `2026-07-lichess-bands-v1`;
- provider/speed-aware classification into the nine Lichess Explorer benchmark bands;
- RB-001 `dominant-contiguous-window-v1` band-distribution resolver.

RB-002 is therefore a composition task, not a new rating-formula task.

## Reconciled RB-002 scope

The bounded implementation should:

1. reuse `averageUserRating` as the descriptive raw metric;
2. expose account/provider/speed context and rated-game sample size;
3. classify cross-provider evidence through the active normalization profile;
4. retain the full normalized band distribution;
5. resolve the dominant peer interval through the existing RB-001 policy;
6. expose stale, sparse and conflicting evidence honestly;
7. make Opening Explorer and later Chess Profile/target consumers use the shared projection.

The bounded implementation should not:

- invent another generic raw average;
- return an exact provider-neutral numerical rating;
- add a Prisma snapshot by default;
- add custom weighting, activity caps or decay without evidence;
- store a repertoire-target override.

The first result should be reproducible on demand from existing database aggregates and indexed imported games. Persistence remains available later if realistic performance or historical snapshot requirements justify it.

Manual repertoire-target overrides move clearly to RB-006. They may reference or snapshot factual RB-002 evidence but cannot mutate it.

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

This option has a strong architectural advantage for this repository because repository, branch, issue, PR and CI access would share one permission model and connector.

Migration is not performed in this report. Creating duplicate GitHub issues before an explicit cutover decision would recreate the synchronization problem.

## Files inspected

- `apps/api/src/modules/imported-games/imported-game-query.service.ts`
- `apps/api/test/imported-games/imported-game-summary.test.mjs`
- `apps/api/src/modules/opening-explorer/peer-rating-band.service.ts`
- `apps/api/test/opening-explorer/peer-rating-band.service.test.mjs`
- `apps/api/src/modules/rating-normalization/rating-normalization.service.ts`
- `apps/api/src/modules/rating-normalization/rating-normalization.config.ts`
- `docs/rating-normalization.md`
- `north-star/repertoire-builder/tasks/RB-002-player-level-resolution.md`
- `north-star/repertoire-builder/TASKS.md`
- `north-star/repertoire-builder/STATUS.md`
- `north-star/repertoire-builder/ROADMAP.md`
- `north-star/repertoire-builder/DECISIONS.md`
- `north-star/repertoire-builder/OPEN_QUESTIONS.md`
- `north-star/repertoire-builder/JIRA.md`
- recent repository commits and pull-request state.

## Documentation changed

- `tasks/RB-002-player-level-resolution.md`
- `TASKS.md`
- `STATUS.md`
- `ROADMAP.md`
- `DECISIONS.md`
- `OPEN_QUESTIONS.md`
- `JIRA.md`
- this report.

## Validation

Performed:

- direct repository inspection through the GitHub connector;
- verified the exact average formula and weighted recombination;
- verified multi-account/multi-provider regression coverage;
- verified the active normalization and RB-001 resolver boundary;
- checked recent branches and pull requests for conflicting RB-002 work;
- created the reconciliation branch from current `main`;
- retested Atlassian search and recorded the exact error;
- re-read changed planning documents through the GitHub API after writing.

Skipped:

- build;
- tests;
- lint;
- architecture checks;
- migrations;
- browser validation.

Reason: runtime application code was not changed.

## Residual risks

- Existing consumers may display a mixed-provider raw average without enough context.
- Cross-account copies of the same physical game may influence the current temporary resolver more than once.
- The most useful evidence-quality vocabulary remains unresolved.
- A dedicated endpoint versus extending the imported-game summary remains an implementation decision.
- Jira and repository execution state may drift while the Atlassian app is unavailable.
- A GitHub migration would require explicit handling of Jira history and dependency links.

## Queue and roadmap impact

- RB-002 remains order 20, P0 and `READY`.
- The task is smaller and better grounded in existing code.
- RB-004 and RB-006 remain blocked on the reusable provider-aware result.
- No new product task is required.
- No task order or priority change is recommended.
- Execution-tracker migration is a separate coordination decision.

## Recommended next checkpoint

Choose the execution-tracker direction before substantive RB-002 implementation:

1. restore/install the Atlassian app and reconcile CRT-4; or
2. explicitly approve migration to GitHub Issues/Projects, define the cutover rules, and use Actions only for automation/enforcement.

After tracker reconciliation, claim RB-002 for the bounded on-demand provider-aware player-rating composition.
