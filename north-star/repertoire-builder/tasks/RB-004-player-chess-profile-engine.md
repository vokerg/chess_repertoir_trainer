# RB-004 — Implement Player Chess Profile calculation

Status: BLOCKED

Priority: P1

Order: 50

Delivery class: Dual-use

Planning maturity: Outlined

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

## Outcome

Create a deterministic, filterable Player Chess Profile calculation that describes:

- what opening characters the player chooses;
- which opening characters produce good opening positions;
- which produce good results relative to appropriate baselines;
- where early mistakes or trouble cluster;
- how conclusions differ by speed preset, color, period, account, and rating context;
- confidence and evidence behind every conclusion.

The calculation should have standalone value and later advise repertoire targets.

## Why this task exists

The repository stores imported games, ratings, opening names/ECO, indexed plies, analyses, and opening-related tags. A profile can turn those facts into a coherent player-facing capability after opening classification is available or an approved limited fallback is defined.

The factual multi-account player-level context is already available from the completed RB-001/RB-002 normalized peer resolver.

## Current repo anchors to inspect

- imported-game schema, shared filters, `buildImportedGameWhere`, and aggregate repositories;
- game-tag definitions and tagging thresholds;
- opening assignment and opening book;
- account performance/rating projections;
- performance-by-rating lab;
- course coverage and deviation calculations if course adherence is included;
- shared contracts and OpenAPI patterns;
- completed RB-001/RB-002 factual player-level contracts;
- RB-003 opening-classification outcome or approved fallback.

## Dependencies

Blocked on:

- RB-003 opening classification or an explicitly approved limited profile taxonomy.

Population-relative and factual player-level conclusions consume the completed RB-001/RB-002 boundary.

May be split into a metric-definition/discovery task and implementation task if statistical scope is too broad.

## In scope

- define profile query filters: accounts, dates, RB-001 speed presets, colors, rated status, and rating/opponent context;
- consume the completed factual peer interval/distribution rather than recalculating or persisting a second level model;
- extract or rename the existing resolver contract only if that is the minimal clean boundary for a second consumer;
- define overall and contextual baselines;
- calculate preference exposure separately from performance;
- calculate opening-position outcomes from analysis/tags with no double counting;
- include game score, early mistake/blunder rates, opening success/trouble rates, and other approved metrics;
- compare against personal baseline and, when available, peer/population baseline;
- define confidence or evidence-strength semantics for profile conclusions, separate from factual rating normalization;
- preserve total, indexed, and analysed game counts;
- return supporting opening groups and bounded example games;
- support insufficient-data outcomes;
- use database aggregation for counts and summaries rather than unbounded Node reduction;
- provide a shared response contract and thin authenticated endpoint;
- add deterministic unit/integration tests.

## Out of scope

- recalculating or mutating the completed factual player level;
- changing the established correlation matrix or resolver policy without a separately versioned defect decision;
- arbitrary target speed weights;
- polished profile UI;
- storing a permanent personality label;
- automatically changing courses;
- LLM-authored conclusions;
- candidate ranking;
- opening-classification implementation itself;
- unsupported causal claims such as proving a style caused rating improvement.

## Statistical questions to resolve

- baseline hierarchy by speed preset, color, and benchmark context;
- minimum samples and confidence grades;
- shrinkage or conservative wording for small samples;
- analysed-coverage thresholds;
- whether result and opening-evaluation conclusions are shown independently or combined;
- opponent strength adjustment;
- treatment of multiple accounts and duplicate imported games for profile metrics;
- significance of time forfeits and very short games;
- comparison of recent period with preceding period;
- how to avoid presenting correlation as causation.

## Acceptance criteria

- Preference and performance are separate response sections.
- Every conclusion includes sample size, filters/context, baseline, metric delta where applicable, and confidence/evidence strength.
- Results can differ by speed preset and color.
- Multiple accounts consume the completed normalized factual level rather than arbitrary raw-rating averaging.
- Opening categories come from RB-003 or an explicitly named fallback.
- Opening-related tags may contribute but are not the sole unexplained source.
- Insufficient analysis coverage produces qualified or unavailable conclusions.
- Supporting openings and bounded games can be retrieved.
- Endpoint work follows contracts, route-schema OpenAPI, authentication, ownership, and repository aggregation conventions.
- Tests cover filters, baselines, small samples, mixed analysis coverage, multiple accounts, positive and negative conclusions, and no data.

## Required validation

- contracts build/tests;
- API build and focused profile tests;
- database query review and boundedness checks;
- architecture checks;
- performance check on a realistically sized account dataset where possible.

## Completion updates

The report must document all formulas and wording constraints, update profile open questions, and state whether RB-005 can proceed without additional metric tasks.

## Completion

Report: none

Completed at: none
