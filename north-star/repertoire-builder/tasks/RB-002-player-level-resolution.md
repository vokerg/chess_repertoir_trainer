# RB-002 — Define multi-account player level resolution

Status: READY

Priority: P0

Order: 20

Delivery class: Dual-use

Planning maturity: Outlined

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

## Outcome

Create a reusable and inspectable calculation that resolves a player's current level from multiple Chess.com and Lichess accounts, potentially with different ratings by speed, into normalized rating-grade evidence suitable for:

- Chess Profile comparisons;
- own-level population targeting;
- own-level plus one or more grades;
- standalone account and performance views.

The calculation must show its inputs, confidence, and limitations and allow a builder target to override it.

## Why this task exists

A user may have several accounts on the same or different providers. Selecting one arbitrary account or averaging raw ratings across providers would be misleading. The merged rating-normalization domain provides the shared grade vocabulary and cross-pool ranges, but it does not by itself define the user's level across accounts, recency, periods, and speeds.

## Verified implementation baseline on `main`

PR #76 is merged and provides:

- shared `@chess-trainer/contracts/rating-normalization` schemas;
- a versioned profile with stable grade IDs and 13 contiguous product-facing strength bands;
- calibrated Chess.com and Lichess bullet, blitz, and rapid pools;
- FIDE Standard as reference-only, with unsupported lower ranges represented as `null`;
- profile ID, version, source metadata, confidence, and per-pool soft padding;
- `classifyRating(pool, rating)` for mapping one source rating to one normalized grade;
- `getRatingRange(profile, gradeId, pool)` for mapping a grade back to a supported source range;
- `GET /api/rating-normalization/default` with Fastify/OpenAPI schemas;
- a performance-by-rating lab reference table;
- focused API boundary and Angular store tests;
- canonical usage and versioning rules in `docs/rating-normalization.md`.

The active profile is `universal-online-strength`, version `2026-07-product-v1`, with Chess.com Blitz as the baseline pool.

## What PR #76 does not provide

- account selection or ownership projection;
- multiple-account aggregation;
- rating observation recency or period selection;
- activity/volume weighting;
- per-speed or overall player-level resolution;
- confidence derived from account evidence;
- excluded-account reasons;
- no-data or conflicting-data resolution;
- a player-level endpoint or consumer-facing override projection.

Therefore PR #76 removes the task's prerequisite blocker but does not complete RB-002.

## Current repo anchors to inspect

Reinspect current versions of:

- `docs/rating-normalization.md`;
- `packages/contracts/src/rating-normalization/`;
- `apps/api/src/modules/rating-normalization/`;
- `apps/api/test/rating-normalization/rating-normalization.test.mjs`;
- account models, ownership, and account-list endpoints;
- `accountRatingStatsService.ts` and rating-history services;
- imported-game rating fields and provider/speed normalization;
- account detail and performance-by-rating UI/store patterns;
- current date-period filter helpers and account selection components.

## Dependencies

No prerequisite blocker remains: PR #76 is available on `main` and is the required normalization baseline.

May run in parallel with RB-001 and RB-003.

RB-004 and RB-006 depend on the result.

## In scope

- define the input account set and account inclusion/exclusion behavior;
- decide whether the primary output is per speed, overall, or both;
- define which rating observation is used for a selected period;
- handle multiple accounts for the same provider and speed;
- map source ratings through the merged versioned normalization profile;
- define recency, volume, inactivity, and outlier treatment;
- produce confidence and contribution details;
- return source accounts, selected ratings, grades, weights, and exclusions;
- support no-data and partial-data states;
- define an explicit override shape for consumers without necessarily persisting the override in this task;
- implement a reusable service and shared contract if used by both API and web;
- provide a bounded endpoint or integrate with an existing account projection based on inspected architecture;
- add tests covering realistic multi-account combinations.

## Out of scope

- population move extraction;
- player style/profile conclusions;
- builder target persistence;
- changing rating-normalization boundaries without evidence, profile versioning, and a separate decision;
- silently merging accounts the user does not own;
- exact rating-to-rating conversion across pools;
- LLM-generated level assessment.

## Formula questions this task must resolve

- One level per speed, one overall level, or both?
- Latest recorded rating versus median/weighted rating over the selected period?
- How many games are needed before an account contributes strongly?
- How quickly does stale rating evidence decay?
- Should multiple accounts at the same speed be combined, or should the most active/recent account dominate?
- How are accounts intentionally used for experimentation or sandbagged ratings handled without unsupported accusations?
- How are the merged profile's soft-padding values used near grade boundaries?
- Is confidence based on games, recency, grade agreement, source-profile confidence, or all of them?
- How does a custom account selection differ from the default player level?
- How are one or more grades above the resolved level translated into provider- and speed-specific source ranges?

## Acceptance criteria

- Raw ratings from different providers are never directly averaged without normalization.
- The result identifies the rating-normalization profile and version used.
- Every contributing account and speed has visible source rating, observation date/period, normalized grade, and contribution.
- Excluded or stale accounts include reasons.
- Multiple accounts on one provider are handled deterministically.
- No-data and conflicting-data outcomes are explicit.
- A caller can obtain an own-level range and translate one or more grades above it back to supported source ranges.
- The user can override the resolved target later without mutating the factual calculation.
- The implementation is reusable outside the repertoire builder.
- Focused tests cover one account, multiple providers, multiple same-provider accounts, different speeds, stale data, sparse data, boundary ratings, and no data.

## Required validation

- contracts build/tests if a shared player-level schema is added;
- API build and focused rating/player-level tests;
- web tests if account contribution presentation is included;
- architecture checks for new module registration.

## Completion updates

The report must record:

- the chosen formula and rejected alternatives;
- confidence semantics;
- period and speed behavior;
- override boundary;
- exact use of the merged rating-normalization profile and soft padding;
- impact on RB-001, RB-004, and RB-006;
- whether follow-up calibration tasks are needed.

## Completion

Report: none

Completed at: none
