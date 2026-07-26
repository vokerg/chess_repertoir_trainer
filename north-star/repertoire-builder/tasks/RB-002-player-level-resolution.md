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

Unblocked at: 2026-07-26 after RB-001 merged through PR #84 as squash commit `49dc6499eac9998de864ccb75a607541cd945382`.

## Outcome

Create a reusable and inspectable player-level projection from multiple owned Chess.com and Lichess accounts. The durable result must use the Lichess-benchmark rating bands introduced by RB-001 and remain suitable for:

- stored or reproducible practical-level evidence;
- Chess Profile comparisons;
- peer-population defaults;
- stronger-population targets;
- standalone account and performance views;
- later user overrides.

The calculation must show its inputs, contribution rules, confidence and limitations. It must not duplicate the temporary on-demand peer-band resolver delivered by RB-001.

## Why this task exists

A user may have several accounts on the same or different providers, with different ratings and activity by speed. RB-001 now provides a bounded on-demand peer range for Opening Analysis and population queries. This task owns the more complete and durable player-level model that can be stored, reused and overridden across the product.

The merged rating-normalization domain now uses the Lichess Explorer groups as canonical product bands. RB-002 must consume that active version and the shared resolver policy rather than creating a second normalization or peer-level formula.

## Verified implementation baseline on `main`

PR #84 now provides:

- active rating-normalization profile `universal-online-strength` / `2026-07-lichess-bands-v1`;
- nine canonical Lichess Explorer peer bands;
- versioned Chess.com bullet, blitz and rapid mappings into those bands;
- temporary provider/speed-aware peer resolver `dominant-contiguous-window-v1`;
- recent-three-month → all-history → generic fallback evidence selection;
- complete distribution, selected groups, account/provider/speed contributions and policy/profile provenance;
- fixed Opening Explorer peer-population presets and direct effective-filter provenance.

The repository also stores imported game-recorded ratings and per-account rating/performance projections for bullet, blitz and rapid.

## Dependency resolved

RB-001 is merged and the required shared boundary is available on `main`:

- versioned Lichess-benchmark bands;
- provider/speed conversion into those bands;
- recent-three-month/all-history/default peer-band resolver contract;
- resolver provenance and policy versioning.

Implementation may now begin, but it must reuse these contracts and helpers rather than create a competing band model or duplicate resolver.

RB-004 and RB-006 remain blocked on the completed durable player-level outcome.

## In scope

- reuse or extract the RB-001 peer-band resolver as the shared factual calculation boundary;
- define the default owned-account input set and account inclusion/exclusion behavior;
- determine how multiple accounts in the same provider/speed pool contribute;
- refine recency, volume, inactivity and outlier treatment beyond the bounded RB-001 fallback where justified;
- decide whether the durable output includes per-speed bands, one dominant overall interval, or both;
- persist or snapshot the resolved level only after inspecting existing projection/storage patterns;
- preserve normalization profile ID/version and resolver policy version;
- return source accounts, selected ratings or game distributions, bands, contributions, exclusions and reasons;
- define player-level confidence without conflating it with normalization-source confidence;
- handle no-data, partial-data and genuinely conflicting-data states;
- define an explicit override shape without mutating the factual calculation;
- provide a reusable service/contract and bounded endpoint or projection based on inspected architecture;
- make the result consumable by RB-001, RB-004, RB-006 and account/performance views;
- add focused multi-account tests.

## Out of scope

- changing the Lichess-benchmark bands introduced by RB-001 without a new versioned calibration decision;
- population move extraction or Lichess Opening Explorer calls;
- candidate ranking;
- player style/profile conclusions;
- builder session state;
- silently merging accounts the user does not own;
- exact rating-to-rating conversion across providers;
- LLM-generated level assessment.

## Formula questions this task must resolve

- Is the persisted output one band interval, per-speed bands, or both?
- Does the RB-001 recent-game distribution remain the final formula or only the initial fallback?
- How many games are needed before evidence contributes strongly?
- How quickly does stale evidence decay?
- How are multiple accounts at the same provider and speed combined?
- How are conflicting high-volume bands represented?
- How is confidence derived from volume, recency, agreement and calibration quality?
- Where is the durable projection stored, and what invalidates/recomputes it?
- How does a custom account selection differ from the default factual projection?
- How is the factual result presented to RB-006 without preventing a manual target override?

## Acceptance criteria

- The implementation consumes the RB-001 Lichess-benchmark profile and resolver boundary; no parallel levels table exists.
- Raw Chess.com and Lichess ratings are never directly averaged.
- Every contributing account/speed has visible provider, rating evidence period, normalized band and contribution.
- Excluded or stale accounts include reasons.
- Multiple accounts on one provider are handled deterministically.
- No-data and conflicting-data outcomes are explicit.
- A durable or reproducible dominant peer band is available to later product/profile consumers.
- The result identifies normalization and resolver policy versions.
- The user can later override the target without mutating factual player-level evidence.
- Focused tests cover one account, multiple providers, multiple same-provider accounts, different speeds, stale data, sparse data, divergent ratings, boundary values and no data.

## Required validation

- contracts build/tests if a shared player-level schema is added;
- API build and focused rating/player-level tests;
- storage migration/repository tests only if persistence is introduced;
- web tests if contribution presentation is included;
- architecture checks for new module registration or projection ownership.

## Completion updates

The report must record:

- what was reused from RB-001;
- the chosen account/recency/contribution formula and rejected alternatives;
- confidence semantics;
- persisted/snapshot storage and invalidation behavior;
- override boundary;
- impact on RB-001, RB-004 and RB-006;
- whether additional calibration tasks are required.

## Completion

Report: none

Completed at: none