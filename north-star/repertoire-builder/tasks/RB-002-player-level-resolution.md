# RB-002 — Define multi-account player level resolution

Status: BLOCKED

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

A user may have several accounts on the same or different providers. Selecting one arbitrary account or averaging raw ratings across providers would be misleading. The repository's rating-normalization work provides a shared grade vocabulary, but it does not by itself define the user's level across accounts, recency, periods, and speeds.

## Current repo anchors to inspect

Reinspect:

- PR #76 or its merged successor under `modules/rating-normalization` and `packages/contracts`;
- account models, ownership, and account-list endpoints;
- `accountRatingStatsService.ts` and rating-history services;
- imported-game rating fields and provider/speed normalization;
- account detail and performance-by-rating UI/store patterns;
- current date-period filter helpers and account selection components.

## Dependencies

Blocked until the rating-normalization implementation is available on the approved working base or its branch is explicitly selected as the task base.

May run in parallel with RB-001 and RB-003.

RB-004 and RB-006 depend on the result.

## In scope

- define the input account set and account inclusion/exclusion behavior;
- decide whether the primary output is per speed, overall, or both;
- define which rating observation is used for a selected period;
- handle multiple accounts for the same provider and speed;
- map source ratings to versioned normalized grades;
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
- changing provider ratings or rating-normalization boundaries without evidence and a separate decision;
- silently merging accounts the user does not own;
- LLM-generated level assessment.

## Formula questions this task must resolve

- One level per speed, one overall level, or both?
- Latest recorded rating versus median/weighted rating over the selected period?
- How many games are needed before an account contributes strongly?
- How quickly does stale rating evidence decay?
- Should multiple accounts at the same speed be combined, or should the most active/recent account dominate?
- How are accounts intentionally used for experimentation or sandbagged ratings handled without unsupported accusations?
- How are normalized-grade soft-padding values used near boundaries?
- Is confidence based on games, recency, grade agreement, or all three?
- How does a custom account selection differ from the default player level?

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

- contracts build/tests if a shared schema is added;
- API build and focused rating/player-level tests;
- web tests if account contribution presentation is included;
- architecture checks for new module registration.

## Completion updates

The report must record:

- the chosen formula and rejected alternatives;
- confidence semantics;
- period and speed behavior;
- override boundary;
- impact on RB-004 and RB-006;
- whether follow-up calibration tasks are needed.

## Completion

Report: none

Completed at: none
