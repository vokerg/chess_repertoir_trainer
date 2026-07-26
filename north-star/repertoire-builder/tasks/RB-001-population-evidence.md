# RB-001 — Integrate speed/rating population evidence and weighting

Status: BLOCKED

Priority: P0

Order: 10

Delivery class: Dual-use

Planning maturity: Outlined

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

## Outcome

Provide one reusable, typed source of opening-position population evidence that can answer which moves are played and how they score for:

- one selected speed;
- any non-empty combination of bullet, blitz, rapid, and classical;
- controlled General mode;
- a source rating range or normalized-grade target;
- a clearly identified provider/population source.

The same capability should improve opening analysis now and later supply the repertoire builder.

## Why this task exists

The user is implementing Lichess top-move extraction by speed and rating in parallel. The north-star plan must consume that work rather than create a duplicate population explorer.

The builder cannot make practical recommendations from master games alone. It needs to know what opponents at the selected speeds and ratings actually play, how common each continuation is, and where population behavior changes.

## Current repo anchors to inspect

Reinspect current versions of:

- `apps/api/src/modules/masters-explorer/`;
- `packages/contracts/src/masters-explorer/`;
- `apps/api/src/modules/imported-games/opening-analysis.service.ts`;
- opening-analysis routes, repositories, and Angular data access;
- the parallel population-explorer branch or PR;
- any cache or source metadata introduced by that work;
- rating-normalization contracts if the explorer already uses them.

Do not assume the masters explorer is the correct module boundary for population data merely because its response is similar.

## Dependencies

Blocked until:

- the parallel implementation branch or PR is identified;
- its exact contract, source limits, cache behavior, and supported filters are inspected.

May run in parallel with:

- RB-002 player-level resolution;
- RB-003 opening classification;
- RB-008 visual prototype using mock evidence.

## In scope

- inspect and document the parallel implementation rather than reimplementing it;
- define or adapt shared Zod contracts for population position evidence when used across API and web;
- preserve source metadata, rating range, speeds, sample sizes, WDL, move UCI/SAN, and cache/freshness metadata where available;
- support arbitrary non-empty speed combinations;
- define controlled weighting for combined speeds and General mode;
- make weighting explicit in request/response or derived configuration rather than hidden;
- define sparse/no-data behavior;
- expose per-speed components when an aggregate is returned so the aggregate remains explainable;
- ensure population evidence can be consumed independently by opening analysis and future builder services;
- add focused API/domain tests and update canonical docs affected by the actual implementation.

## Out of scope

- implementing a second Lichess extractor;
- candidate ranking or repertoire recommendation policy;
- player-profile calculation;
- opening classification;
- builder session state;
- final population UI redesign unless required by the integration slice;
- adding another external provider without a separate task.

## Open questions to resolve

- What speed and rating filters does the source actually support?
- Is classical available and calibrated separately?
- How are source ranges mapped to normalized grades?
- Are combinations aggregated at query time, service time, or UI time?
- What default weights are useful: equal, player-distribution, or another policy?
- How is General mode defined and versioned?
- Should users see or edit weights?
- How are small samples and missing speed buckets represented?
- Is a provider-general abstraction needed now or should the contract remain source-explicit?

## Acceptance criteria

- A single position can be queried for one speed and for at least one multi-speed combination.
- General mode cannot be implemented as an undocumented raw merge.
- Responses retain selected speeds, rating target/range, source identity, data period when available, sample size, and per-move evidence.
- Aggregated results expose enough component data to explain why a move ranks as common.
- Missing or unsupported data is explicit.
- Existing masters evidence remains a distinct source.
- Opening analysis can consume the new evidence without builder-specific imports.
- Shared DTOs use `packages/contracts` when crossing workspace boundaries.
- Fastify route schemas carry intentional OpenAPI metadata and responses.
- Repository/database work remains bounded and source caching follows the nearest verified pattern.
- Focused tests cover single speed, combined speeds, weighting, sparse data, and invalid input.

## Required validation

Expected after scope is known:

- relevant contract build/tests;
- API build and focused population-explorer tests;
- web build/tests if Angular consumers change;
- architecture checks when new module boundaries or shared contracts are introduced.

## Completion updates

The report must:

- identify the parallel branch/PR integrated;
- document supported and unsupported speeds/rating filters;
- record the weighting decision or leave an explicit follow-up task;
- assess RB-002, RB-004, RB-006, and RB-007 dependencies;
- recommend queue changes if classical or normalized-grade support is delayed.

## Completion

Report: none

Completed at: none
