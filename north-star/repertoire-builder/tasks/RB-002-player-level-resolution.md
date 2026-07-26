# RB-002 — Promote normalized multi-account player level

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

Scope reconciled at: 2026-07-26 on branch `rb-002/crt-4-player-level-reconciliation` after reinspection of the active rating-correlation matrix and RB-001 peer resolver.

## Outcome

Promote the provider-aware, multi-account player-level calculation already delivered by RB-001 into a reusable factual product boundary.

RB-002 does **not** need to invent the rating-correlation formula. `main` already contains:

- the versioned `2026-07-lichess-bands-v1` correlation matrix across Chess.com and Lichess bullet, blitz and rapid;
- provider/speed classification through that matrix;
- game-count weighting into canonical Lichess benchmark bands;
- recent-three-month → all-history → generic fallback evidence selection;
- `dominant-contiguous-window-v1`, which selects the narrowest one-to-three-band interval covering at least 70% of evidence;
- complete band distribution and account/provider/speed contribution provenance.

The remaining task is architectural and product-facing: move that factual capability out of an Opening Explorer-specific ownership boundary, expose it independently, and make later profile and target consumers depend on the shared result.

## Important distinction

`ImportedGameQueryService.summarize` also returns `averageUserRating`. That value is a raw arithmetic average of the game-recorded ratings in the applied filter. It is useful for a single comparable pool or as a literal description of selected rows, but it is not the cross-provider player-level formula.

RB-002 must not combine Chess.com and Lichess by averaging their raw rating numbers. Cross-provider player level is represented by the normalized benchmark-band distribution and dominant interval already produced by the RB-001 resolver.

## Verified implementation baseline on `main`

### Established correlation matrix

The active profile is:

- ID: `universal-online-strength`;
- version: `2026-07-lichess-bands-v1`;
- baseline: `LICHESS_BLITZ`;
- canonical output: nine Lichess Explorer bands.

The profile contains explicit ranges for:

- `CHESS_COM_BULLET`;
- `CHESS_COM_BLITZ`;
- `CHESS_COM_RAPID`;
- `LICHESS_BULLET`;
- `LICHESS_BLITZ`;
- `LICHESS_RAPID`;
- reference-only `FIDE_STANDARD`.

The mappings are versioned approximate correlations, not exact rating-to-rating conversions.

### Delivered normalized formula

`apps/api/src/modules/opening-explorer/peer-rating-band.service.ts` already:

1. selects eligible rated standard imported games for the requested speed preset;
2. retains account, provider, speed, rating and game count;
3. determines the provider/speed pool;
4. classifies each rating through the active correlation matrix;
5. maps the grade to the canonical Lichess benchmark band;
6. weights the band distribution by game count;
7. selects the dominant interval with `dominant-contiguous-window-v1`;
8. returns the full distribution, contributions, evidence period and profile/policy versions.

Focused tests prove provider-aware behavior. For example, Lichess blitz `1650`, Chess.com blitz `1300`, and Chess.com rapid `1800` are not averaged as raw numbers; they are classified through their respective matrix columns before contributing to the normalized distribution.

### Separate raw summary metric

`averageUserRating` remains an existing imported-game summary field. Its mixed-provider fixture value `1833.3` is synthetic test data and is not evidence of the normalized player-level formula.

## Reconciled scope

### In scope

- extract or relocate the normalized player-level calculation into a shared feature module/service with no intentional formula change;
- retain the active correlation profile and resolver policy versions in every result;
- expose the factual result independently of an Opening Explorer position query, through a bounded authenticated endpoint or reusable projection;
- make Opening Explorer delegate to the shared player-level service;
- preserve the existing eligible-game, speed-preset, recency, fallback, game-count and dominant-window behavior unless a demonstrated defect requires a separately reviewed policy version;
- expose the dominant interval, complete distribution, eligible-game count, evidence period and account/provider/speed contributions;
- enrich contribution provenance with the normalized band or source rating evidence where needed for inspectability;
- make no-data and separated/conflicting distributions explicit;
- add focused extraction, contract, route and regression tests;
- document the factual result for RB-004 and RB-006 consumers.

### Explicitly not required for the first delivery

- a new rating-correlation matrix;
- a new averaging or weighting formula;
- an exact provider-neutral numeric rating;
- a Prisma player-level snapshot;
- custom decay, caps or statistical weighting;
- a stored user override;
- an Angular player-level page.

A repertoire-specific target override belongs to RB-006 and must not mutate the factual player-level result.

## Current formula to preserve

### Evidence

- owned imported games;
- rated;
- standard/chess or variant-null;
- supported personal speed for the selected preset;
- known user color;
- non-null game-recorded user rating.

### Provider correlation

For each evidence row:

1. resolve `provider + speed` to a rating pool;
2. call `classifyRating(pool, rating, activeProfile)`;
3. map the grade to its `LICHESS_BLITZ.minInclusive` benchmark group;
4. add the row's game count to that group.

### Dominant interval

- consider every contiguous window of one, two or three benchmark groups;
- target at least 70% of eligible games;
- select the narrowest qualifying window;
- break qualifying ties by more games, then lower starting group;
- when no window reaches 70%, select highest mass, then narrower, then lower;
- always retain the full distribution.

### Period fallback

1. last three months;
2. all eligible history when recent evidence is empty;
3. visibly labelled generic `1400–1599` fallback when no eligible evidence exists.

## Remaining design decisions

- shared module and endpoint ownership;
- whether to expose only the requested preset result or also a compact set of preset/per-speed results;
- whether all owned accounts or only active accounts remain the default input set;
- whether cross-account copies of the same physical game require deduplication in this task or a follow-up;
- minimal evidence-quality/conflict vocabulary derived from existing distribution and period fields;
- whether contribution rows should expose raw rating ranges, averages, normalized bands, or a bounded combination;
- whether any realistic query cost justifies later persistence.

These decisions must not reopen the established correlation matrix or dominant-window formula without explicit evidence and a new version.

## Acceptance criteria

- The active rating-correlation matrix is reused unchanged; no feature-local conversion table is added.
- The shared player-level service reproduces the existing RB-001 normalized distribution and selected groups for identical evidence.
- Raw Chess.com and Lichess ratings are never directly averaged to produce player level.
- Every result identifies normalization profile and resolver policy versions.
- Every result exposes evidence period, eligible-game count, complete distribution and dominant interval.
- Account/provider/speed contributions remain inspectable.
- Opening Explorer consumes the shared result rather than owning a second formula.
- No-data and materially separated distributions remain visible.
- Focused tests cover one account, multiple providers, multiple same-provider accounts, different speeds, exact matrix boundaries, recent/all-history fallback, separated populations and no data.
- No persistence or override mechanism is added without demonstrated need.

## Required validation

- contracts build/tests if a shared schema is added;
- API build and focused player-level tests;
- existing rating-normalization boundary tests;
- existing Opening Explorer resolver and route tests;
- architecture checks for module registration and dependency direction;
- storage migration tests only if persistence becomes separately justified.

## Jira synchronization state

The Atlassian connector was retested on 2026-07-26 and returned HTTP 403 with the explicit detail `The app is not installed on this instance`.

This is an Atlassian app installation/site-connection failure, not evidence that the user lacks CRT project permissions. This session cannot inspect or update CRT-4.

RB-002 remains `READY` and unclaimed until Jira connectivity is restored or the program explicitly adopts a GitHub-native execution tracker.

## Completion updates

The completion report must record:

- how the RB-001 correlation matrix and normalized formula were promoted without semantic drift;
- the final shared module/contract/endpoint ownership;
- any contribution or evidence-quality fields added;
- account inclusion and duplicate-game decisions;
- whether persistence remained unnecessary;
- impact on Opening Explorer, RB-004 and RB-006;
- whether any separately versioned calibration or formula task is required.

## Completion

Report: none

Completed at: none
