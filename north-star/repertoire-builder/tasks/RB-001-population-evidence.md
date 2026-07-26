# RB-001 — Integrate speed/rating population evidence and weighting

Status: READY

Priority: P0

Order: 10

Delivery class: Dual-use

Planning maturity: Detailed

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

The rated Lichess Peer games integration has now been merged to `main` through [PR #80](https://github.com/vokerg/chess_repertoir_trainer/pull/80). The north-star program must extend that implementation rather than create a duplicate population explorer.

The builder cannot make practical recommendations from master games alone. It needs to know what opponents at the selected speeds and ratings actually play, how common each continuation is, and where population behavior changes. The merged implementation establishes the reusable retrieval, caching, contract, and Opening Analysis consumption foundation, but it does not yet define the product-level weighting and explainability semantics required by this task.

## Current implementation baseline on `main`

PR #80 provides:

- shared backend ownership under `apps/api/src/modules/opening-explorer/`;
- shared cross-workspace schemas under `packages/contracts/src/opening-explorer/`;
- distinct authenticated endpoints for Masters and rated Lichess games;
- optional rated-game month, rating-group, and speed filters;
- arbitrary non-empty combinations of supported Lichess speed buckets;
- all Lichess Explorer rating groups from unrestricted through `2500+`;
- source identity, position and move W/D/L counts, SAN/UCI, average rating, opening metadata, cache state, and source/profile metadata;
- normalized-position cache reuse, stale fallback, request deduplication, shared throttling, and HTTP 429 backoff;
- Fastify/Zod/OpenAPI registration and focused contract, service, repository, and Angular tests;
- a reusable Peer games Angular widget composed by Opening Analysis behind its own header toggle.

Supported upstream speeds are `ultraBullet`, `bullet`, `blitz`, `rapid`, `classical`, and `correspondence`. The north-star target remains explicitly focused on arbitrary non-empty combinations of bullet, blitz, rapid, and classical; extra upstream buckets must not silently redefine the product target.

## Current repo anchors to inspect

Reinspect current versions of:

- `apps/api/src/modules/opening-explorer/`;
- `packages/contracts/src/opening-explorer/`;
- `apps/web/src/app/shared/lichess-games-explorer/`;
- `apps/web/src/app/features/opening-analysis/`;
- `docs/opening-explorer.md`;
- `apps/api/src/modules/imported-games/opening-analysis.service.ts`;
- rating-normalization contracts and services once RB-002 resolves their working-base status;
- cache profile serialization and source metadata before changing response provenance.

Do not reintroduce `masters-explorer` as the shared module boundary. Masters and rated Lichess games are separate evidence sources implemented through the shared Opening Explorer module.

## Dependencies

The former blocker is resolved:

- the parallel implementation is identified as PR #80;
- its contract, source limits, cache behavior, supported filters, API, tests, documentation, and Angular consumer have been inspected on `main`.

The task can now be claimed and started.

The normalized-grade targeting slice still depends on RB-002 player-level resolution and the verified rating-normalization domain. Work on filter provenance, weighting semantics, per-speed explainability, and sparse-data behavior can proceed independently.

May run in parallel with:

- RB-002 player-level resolution;
- RB-003 opening classification;
- RB-008 visual prototype using the verified Peer games contract plus explicit mock extensions for unresolved weighting evidence.

## In scope

- extend the merged Opening Explorer integration rather than reimplementing it;
- retain shared Zod contracts for population position evidence crossing API and web boundaries;
- preserve source metadata, selected rating range/groups, selected speeds, sample sizes, WDL, move UCI/SAN, and cache/freshness metadata;
- support arbitrary non-empty combinations of bullet, blitz, rapid, and classical;
- define controlled weighting for combined speeds and General mode;
- make weighting explicit in request, response, or a versioned derived configuration rather than hidden;
- expose per-speed components, or an equivalently explainable decomposition, when a weighted aggregate is returned;
- map normalized-grade targets to source rating groups after RB-002 defines the shared semantics;
- define sparse, missing, and unsupported-data behavior;
- keep population evidence independently consumable by Opening Analysis and future builder services;
- add focused API/domain tests and update canonical documentation affected by the final implementation.

## Out of scope

- implementing a second Lichess extractor;
- replacing the merged cache, client, route, or Angular widget without a verified need;
- candidate ranking or repertoire recommendation policy;
- player-profile calculation;
- opening classification;
- builder session state;
- final population UI redesign unless required by the integration slice;
- adding another external provider without a separate task.

## Resolved implementation facts

- The provider is Lichess and the rated-game source is identified as `LICHESS_GAMES`.
- The source supports optional month bounds, all Lichess Explorer rating buckets, and six upstream speed buckets.
- Multiple selected speeds are currently sent as one Lichess Explorer request and returned as one raw aggregate.
- Masters evidence remains a distinct `LICHESS_MASTERS` source and endpoint.
- Opening Analysis already consumes the rated-game evidence through the Peer games widget.
- Shared cache profiles are derived deterministically from canonical filter combinations.
- The current response identifies source and profile version but does not directly expose the selected month, rating, and speed filters.

## Open questions to resolve

- How are source rating groups mapped to normalized grades?
- What default weights are useful: equal, player-distribution, or another policy?
- How is General mode defined and versioned?
- Should users see or edit weights, or choose understandable presets?
- Should controlled combinations request each speed separately and aggregate in the service, or can another explainable upstream strategy preserve components?
- How should small samples and missing speed buckets affect weighting?
- What exact response provenance should expose selected month, rating, and speed filters?
- Is a provider-general abstraction needed after Lichess semantics are complete, or should the contract remain source-explicit?

## Acceptance progress

Already met by PR #80:

- A single position can be queried for one speed and for a multi-speed combination.
- Existing Masters evidence remains a distinct source.
- Opening Analysis consumes the new evidence without builder-specific imports.
- Shared DTOs use `packages/contracts` across workspace boundaries.
- Fastify route schemas carry intentional OpenAPI metadata and response schemas.
- Repository and cache work follows the verified normalized-position and Opening Explorer patterns.
- Focused tests cover current query validation, client, cache, service, repository, contract, OpenAPI, store, and widget behavior.

Still required before `DONE`:

- General mode cannot be an undocumented raw merge.
- Weighting for combined speeds is explicit and versioned.
- Weighted aggregates expose enough component evidence to explain why a move ranks as common.
- Responses retain selected speeds, rating target/range, source identity, data period, sample size, and per-move evidence directly rather than only through an opaque profile version.
- Missing, sparse, or unsupported data is explicit.
- Normalized-grade targeting is integrated through the shared rating-normalization/player-level semantics.
- Focused tests cover weighting, component explainability, sparse data, filter provenance, normalized-grade mapping, and invalid input.

## Required validation

Expected for the remaining delivery:

- relevant contract build/tests;
- API build and focused Opening Explorer tests;
- web build/tests if the Peer games consumer changes;
- architecture checks for any changed shared contract or module boundary;
- regression coverage proving Masters behavior remains distinct and unchanged.

## Completion updates

The completion report must:

- identify PR #80 as the merged implementation baseline;
- document supported and unsupported speeds/rating filters;
- record the weighting and General-mode decision;
- document response-level provenance and sparse-data behavior;
- assess RB-002, RB-004, RB-006, and RB-007 dependencies;
- recommend queue changes if normalized-grade support is delayed.

## Reconciliation

Report: `reports/RB-001-2026-07-26-peer-games-reconciliation.md`

This report records the status and dependency reconciliation only. It is not a completion report and does not satisfy the remaining acceptance criteria.

## Completion

Report: none

Completed at: none
