# RB-002 — Define provider-aware multi-account player rating

Status: READY

Priority: P0

Order: 20

Delivery class: Dual-use

Planning maturity: Outlined

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

Unblocked at: 2026-07-26 after RB-001 merged through PR #84 as squash commit `49dc6499eac9998de864ccb75a607541cd945382`.

Scope reconciled at: 2026-07-26 on branch `rb-002/crt-4-player-level-reconciliation` after inspecting the existing imported-game summary rating formula on `main`.

## Outcome

Create a reusable and inspectable provider-aware player-rating projection from multiple owned Chess.com and Lichess accounts.

The repository already calculates `averageUserRating` for an arbitrary imported-game filter as the game-count-weighted arithmetic mean of available game-recorded user ratings. RB-002 must reuse that descriptive metric rather than create a second generic average-rating formula.

The remaining product outcome is to make the rating evidence safe for cross-provider use:

- retain the familiar raw average inside each comparable provider/speed/account context;
- normalize provider/speed evidence into the Lichess-benchmark bands introduced by RB-001 before combining it;
- expose one reproducible dominant peer interval with complete provenance and conflict information;
- make the result consumable by Opening Explorer, Chess Profile and repertoire-target defaults.

The initial delivery is reproducible on demand. Persistence is not required unless implementation evidence demonstrates a concrete invalidation, performance or historical-snapshot need.

## Why this task exists

A user may have several accounts on the same or different providers, with different ratings and activity by speed.

Two useful concepts already exist and must remain distinct:

1. **Selected-game average rating** — `ImportedGameQueryService.summarize` returns `averageUserRating` for the selected imported games. This is useful descriptive evidence and already supports account, period, provider, speed and other game filters.
2. **Cross-provider peer level** — raw Chess.com and Lichess numbers are not directly comparable. The shared rating-normalization profile and RB-001 peer resolver map provider/speed evidence into canonical Lichess Explorer bands.

RB-002 composes these existing boundaries. It does not replace the imported-game summary and does not invent an exact universal rating number.

## Verified implementation baseline on `main`

### Imported-game summary

`apps/api/src/modules/imported-games/imported-game-query.service.ts` already:

- calculates `averageUserRating` and `averageOpponentRating` from database aggregate rows;
- uses a weighted average so White- and Black-side aggregate groups contribute according to the number of non-null ratings;
- returns the result for the complete applied imported-game filter;
- supports multiple accounts and providers through the existing imported-game filter contract;
- is covered by `apps/api/test/imported-games/imported-game-summary.test.mjs`;
- is also exposed through the imported-game summary MCP tool.

The existing mixed-provider number is descriptive of the selected rows. It must not be presented as an exact provider-neutral strength rating.

### RB-001 normalization and peer resolution

PR #84 provides:

- active rating-normalization profile `universal-online-strength` / `2026-07-lichess-bands-v1`;
- nine canonical Lichess Explorer peer bands;
- versioned Chess.com bullet, blitz and rapid mappings into those bands;
- provider/speed-aware resolver policy `dominant-contiguous-window-v1`;
- recent-three-month → all-history → generic fallback evidence selection;
- complete distribution, selected groups, account/provider/speed contributions and policy/profile provenance;
- fixed Opening Explorer peer-population presets and direct effective-filter provenance.

### Existing account projections

The repository stores per-account rating/performance projections for bullet, blitz and rapid and refreshes them after provider imports. RB-002 may reuse these views where they reduce repeated work, but it must not add persistence merely because a storage pattern exists.

## Reconciled scope

### In scope

- reuse the existing selected-game `averageUserRating` formula as the descriptive raw-rating metric;
- expose per-account/provider/speed average rating, rated-game count and evidence period where useful;
- reuse or extract the RB-001 provider/speed classification and dominant-band policy as the shared factual level boundary;
- define the default owned-account input set, using active owned accounts unless an existing explicit account filter is supplied;
- preserve the existing recent-three-month → all-history → generic fallback unless focused tests demonstrate a concrete defect;
- represent an overall result as normalized band distribution and dominant interval, not an exact cross-provider average;
- preserve normalization profile ID/version and resolver policy version;
- return source accounts, provider/speed pools, raw averages, sample sizes, normalized bands, contributions, exclusions and reasons;
- make sparse, stale, mixed and conflicting evidence explicit;
- provide a reusable service/contract and bounded endpoint or projection based on the inspected architecture;
- make Opening Explorer consume the shared projection rather than retain a second factual formula;
- add focused multi-account and boundary tests.

### Explicitly not required for the first delivery

- a new Prisma model or stored player-level snapshot;
- a second generic average-rating calculation;
- an exact provider-neutral numerical rating;
- custom recency decay, activity caps or statistical weighting without evidence that the existing game-count formula is misleading;
- a stored user override.

A repertoire-specific manual rating target belongs to RB-006. It may reference or snapshot the factual RB-002 result without mutating it.

## Out of scope

- changing the Lichess-benchmark bands introduced by RB-001 without a new versioned calibration decision;
- population move extraction or additional Lichess Opening Explorer calls;
- candidate ranking;
- player style/profile conclusions;
- builder session state;
- silently including accounts the user does not own;
- exact rating-to-rating conversion across providers;
- LLM-generated level assessment;
- an Angular player-level page in the initial bounded delivery.

## Formula direction

### Descriptive average

For one applied imported-game filter:

```text
averageUserRating = sum(all non-null game-recorded user ratings) / count(non-null user ratings)
```

The implementation already calculates this from bounded database aggregates and rounds to one decimal place. White and Black games use the rating belonging to the authenticated user's color.

This value remains valid as a description of the selected rows. When the filter mixes providers or speed pools, the UI/API must not label the raw number as a provider-neutral chess strength.

### Provider-aware peer interval

Cross-provider combination uses the active normalization profile:

1. retain provider, speed, account and rating evidence;
2. classify evidence into canonical Lichess benchmark bands using the existing rating-normalization service;
3. build the complete band distribution;
4. apply `dominant-contiguous-window-v1` to select the dominant interval;
5. expose the full distribution when the selected interval hides separated or conflicting populations.

The raw average explains the source evidence. The normalized distribution determines the provider-aware peer interval.

### Evidence period and fallback

Keep the RB-001 factual policy for the bounded delivery:

1. eligible evidence from the last three months;
2. all eligible history when no recent evidence exists;
3. visibly labelled generic `1400–1599` fallback when no eligible evidence exists.

### Persistence

Default decision: calculate reproducibly on demand from indexed imported-game evidence and existing aggregates.

Add persistence only when one of these is demonstrated:

- the query is too expensive under realistic data volume;
- a consumer requires a historical factual snapshot;
- invalidation semantics are clearer than on-demand calculation;
- RB-006 needs to freeze evidence for a resumable target/draft.

## Acceptance criteria

- The existing imported-game `averageUserRating` formula is reused rather than duplicated.
- Raw Chess.com and Lichess ratings are never treated as one exact universal rating.
- Raw average rating remains available with its applied account/provider/speed/period context.
- Every contributing account/speed has visible provider, sample size, raw average or source evidence, normalized band and contribution.
- The implementation consumes the RB-001 Lichess-benchmark profile and resolver boundary; no parallel levels table exists.
- Inactive, unsupported, missing-rating or stale evidence includes explicit reasons.
- Multiple accounts on one provider are handled deterministically through the existing filtered-game aggregation and visible contributions.
- No-data and conflicting-data outcomes are explicit.
- A reproducible dominant peer interval is available to Opening Explorer and later profile/target consumers.
- The result identifies normalization and resolver policy versions.
- A later repertoire-target override cannot mutate factual player-rating evidence.
- Focused tests cover one account, multiple providers, multiple same-provider accounts, different speeds, filtered averages, stale data, sparse data, divergent ratings, boundary values and no data.

## Required validation

- imported-game summary regression tests;
- contracts build/tests if a shared player-rating schema is added;
- API build and focused rating/player-level tests;
- Opening Explorer resolver and route tests;
- storage migration/repository tests only if persistence is justified and introduced;
- web tests only if presentation is included;
- architecture checks for new module registration or shared-boundary extraction.

## Jira synchronization state

The Atlassian connector was retested on 2026-07-26 and returned HTTP 403 with the explicit detail `The app is not installed on this instance`.

This is not evidence that the user lacks CRT project permissions. It means the ChatGPT Atlassian/Rovo app is not installed or connected for the target Atlassian site, so this session cannot inspect or update CRT-4.

RB-002 remains `READY` and unclaimed until one of the following happens:

- Atlassian app installation/connectivity is restored and CRT-4 is reconciled;
- the program explicitly migrates execution tracking to a GitHub-native workflow.

Required Jira checklist if Jira remains the execution mirror:

- verify CRT-4 remains under CRT-2;
- verify current status, priority, assignee and dependency links;
- add this scope reconciliation and branch reference;
- record the eventual claim branch before substantive implementation.

## Completion updates

The completion report must record:

- how the existing imported-game average formula was reused;
- how raw averages and normalized peer bands are distinguished;
- the chosen account/period/contribution behavior and rejected alternatives;
- evidence quality and conflict semantics;
- whether persistence remained unnecessary or became justified;
- the override boundary with RB-006;
- impact on RB-001, RB-004 and RB-006;
- whether additional calibration tasks are required.

## Completion

Report: none

Completed at: none
