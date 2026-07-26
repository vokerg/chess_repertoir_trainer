# Repertoire Builder Program Status

Last updated: 2026-07-26

## Current state

**Program state:** foundation merged; RB-001 completed on `main`; RB-002 remains the next actionable P0 task with a narrowed provider-aware player-rating scope.

**Runtime on `main`:** PR #84 provides the Lichess-benchmark profile, temporary peer resolver, preset Opening Explorer API, compact Peer games UI, tests and runtime documentation. The imported-game summary also already exposes `averageUserRating` for the complete applied game filter.

**Scope reconciliation branch:** `rb-002/crt-4-player-level-reconciliation`.

**Jira epic:** CRT-2, last known `In Progress`; current state cannot be verified through the connector.

## RB-001 delivered scope

Available on `main`:

- speed presets: All speeds, Blitz and slower, Blitz, Bullet;
- rating targets: All players, My peers, My peers and above, one explicit Lichess group;
- defaults: Blitz and slower plus My peers and above;
- no ultraBullet or public-game month controls;
- one mixed Lichess request and the existing deterministic cache architecture;
- active normalization version `2026-07-lichess-bands-v1` with nine Lichess Explorer bands;
- historical `2026-07-product-v1` profile preserved;
- Chess.com and Lichess provider/speed classification;
- recent-three-month, all-history and generic 1400–1599 peer fallback;
- `dominant-contiguous-window-v1`: shortest one-to-three-band window covering at least 70%;
- direct population and resolver provenance;
- two native filter selects and resolved-population summary;
- focused contracts, API, resolver, cache, OpenAPI and Angular tests;
- canonical rating-normalization and Opening Explorer documentation.

No database migration, new cache store, queue, background job, dependency or durable player-level model was added.

## Existing selected-game average

`ImportedGameQueryService.summarize` already calculates:

- `averageUserRating`;
- `averageOpponentRating`;
- the complete applied imported-game filter and summary breakdowns.

The raw user average is the weighted arithmetic mean of available game-recorded user ratings. It supports account, provider, speed, period and other imported-game filters and is covered by API/MCP regression tests.

This changes the RB-002 narrative: the task does not need to invent a generic user-average formula. It needs to combine the existing descriptive average with provider/speed normalization and a reproducible benchmark-band result.

## Reconciled RB-002 boundary

RB-002 now owns:

- reuse of the selected-game raw average;
- per-account/provider/speed rating evidence and sample sizes;
- provider-aware normalization into canonical Lichess bands;
- dominant peer interval, full distribution and conflict/evidence-quality semantics;
- reuse by Opening Explorer and later Chess Profile/target consumers.

The first delivery should calculate on demand. A Prisma snapshot is not required unless realistic performance, invalidation or historical-reproducibility evidence justifies it.

A repertoire-specific manual target override belongs to RB-006 and must not mutate the factual RB-002 result.

## Repository and execution state

- RB-001: `DONE`.
- CRT-3: last known `Done` after squash merge PR #84.
- RB-002: `READY`, unclaimed.
- CRT-4: last known `To Do`, but not currently verifiable.
- Reconciliation branch: `rb-002/crt-4-player-level-reconciliation`.
- RB-003 and RB-008 remain independent parallel work.

## Jira connector clarification

The Atlassian/Rovo connector was retested on 2026-07-26 and returned HTTP 403 with:

```text
The app is not installed on this instance
```

This points to an Atlassian app installation/site-connection problem, not merely missing CRT project permissions. Granting user-level Jira permissions does not install the connector app on the Atlassian site.

No Jira issue was inspected or updated in this reconciliation. RB-002 remains unclaimed until Jira connectivity is restored or the program explicitly adopts a GitHub-native execution tracker.

## Validation

Performed for this reconciliation:

- inspected current `main` commit and recent pull-request state;
- inspected the imported-game summary service and database aggregate formula;
- inspected the summary regression test and MCP exposure;
- reinspected RB-001 normalization and peer-resolution boundaries;
- retested Atlassian search and recorded the exact connector error;
- created the reconciliation branch and updated planning documentation.

Skipped:

- application build;
- tests;
- lint;
- architecture checks;
- browser validation.

Reason: this branch changes planning documentation only.

## Residual risks

- A mixed-provider raw average can be misread as provider-neutral strength unless context is explicit.
- Chess.com band boundaries remain rounded product mappings, not exact conversions.
- One mixed Lichess query deliberately ignores normal speed-rating disparity.
- The full normalized distribution remains necessary because one dominant interval can hide separated populations.
- Classical and correspondence do not contribute personal rating evidence.
- The generic fallback must remain visibly labelled.
- The temporary resolver does not independently deduplicate copies across owned accounts.
- Jira and repository execution metadata may drift while the Atlassian app is unavailable.

## Queue recommendation

Keep RB-002 at order 20 and P0, but implement the smaller provider-aware composition rather than a new average formula or assumed persistence model.

Separately decide whether execution coordination stays in Jira or migrates to GitHub Issues/Projects with GitHub Actions used for automation and policy checks. GitHub Actions alone is not a task tracker.
