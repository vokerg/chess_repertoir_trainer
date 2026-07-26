# RB-002 reconciliation report — merged rating-normalization foundation

Date: 2026-07-26

Task: `RB-002`

Jira: `CRT-4`

Branch: `north-star/rb-001-peer-games-reconciliation`

Target branch: `main`

This is a status and dependency reconciliation report, not an RB-002 completion report.

## Purpose

Reconcile the Repertoire Builder north-star plan and Jira execution mirror after the rating-normalization/parity system merged to `main` through PR #76.

The reconciliation determines which RB-002 prerequisites and acceptance criteria are already delivered, which remain, whether the task is still blocked, and whether any Jira issue qualifies for completion.

## Delivered by the merged baseline

PR #76 delivers:

- a shared rating-normalization module and service boundary;
- shared Zod contracts under `@chess-trainer/contracts/rating-normalization`;
- a versioned profile with ID `universal-online-strength` and version `2026-07-product-v1`;
- 13 stable product-facing strength grades;
- complete contiguous ranges for Chess.com and Lichess bullet, blitz, and rapid;
- Chess.com Blitz as the profile baseline;
- FIDE Standard as reference-only with explicit uncalibrated `null` ranges;
- source metadata distinguishing empirical evidence from product adjustments;
- per-pool confidence and soft-padding metadata;
- `classifyRating(pool, rating)` for mapping one rating to one grade;
- `getRatingRange(profile, gradeId, pool)` for mapping one grade back to one source-pool range;
- `GET /api/rating-normalization/default` with Fastify/OpenAPI metadata;
- a performance-by-rating lab reference table;
- focused API boundary and Angular store tests;
- canonical versioning, storage, and usage rules in `docs/rating-normalization.md`.

## Intentionally not credited as complete

PR #76 does not deliver the RB-002 outcome:

- no owned-account input set or account-selection rule;
- no rating observation date/period selection;
- no recency, volume, inactivity, or outlier treatment;
- no deterministic handling of multiple accounts for the same provider and speed;
- no per-speed or overall player-level formula;
- no account contribution weights or excluded-account reasons;
- no player-level confidence calculation;
- no no-data, partial-data, or conflicting-data result;
- no multi-account player-level endpoint or shared result contract;
- no factual-level versus user-override projection;
- no translation from a resolved player's grade offset into Lichess Explorer bucket filters.

The merged profile is the required parity vocabulary, not a player-level resolver.

## Files and architecture areas

### Inspected

- PR #76 metadata and changed-file list
- `packages/contracts/src/rating-normalization/rating-normalization.schemas.ts`
- `apps/api/src/modules/rating-normalization/rating-normalization.service.ts`
- `apps/api/src/modules/rating-normalization/rating-normalization.routes.ts`
- `docs/rating-normalization.md`
- `north-star/repertoire-builder/README.md`
- `north-star/repertoire-builder/STATUS.md`
- `north-star/repertoire-builder/TASKS.md`
- `north-star/repertoire-builder/ROADMAP.md`
- `north-star/repertoire-builder/DECISIONS.md`
- `north-star/repertoire-builder/OPEN_QUESTIONS.md`
- `north-star/repertoire-builder/JIRA.md`
- `north-star/repertoire-builder/tasks/RB-001-population-evidence.md`
- `north-star/repertoire-builder/tasks/RB-002-player-level-resolution.md`
- all returned Jira fields for `CRT-2`, `CRT-3`, `CRT-4`, `CRT-6`, and `CRT-8`

### Changed

- `north-star/repertoire-builder/README.md`
- `north-star/repertoire-builder/STATUS.md`
- `north-star/repertoire-builder/TASKS.md`
- `north-star/repertoire-builder/ROADMAP.md`
- `north-star/repertoire-builder/DECISIONS.md`
- `north-star/repertoire-builder/OPEN_QUESTIONS.md`
- `north-star/repertoire-builder/tasks/RB-002-player-level-resolution.md`
- this reconciliation report
- Jira `CRT-2` description and labels
- Jira `CRT-3` dependency wording and coordination comment
- Jira `CRT-4` description and labels

No runtime application code changed in this reconciliation.

## Acceptance assessment

| RB-002 criterion or prerequisite | Assessment after PR #76 |
| --- | --- |
| Versioned normalization profile available | Delivered |
| Stable grade IDs | Delivered |
| Online source ranges | Delivered for Chess.com/Lichess bullet, blitz, rapid |
| Profile confidence and soft padding | Delivered |
| Classify one source rating into one grade | Delivered |
| Map one grade to one source-pool range | Delivered |
| Identify profile ID/version in future result | Primitive available; player-level result missing |
| Multiple owned accounts | Missing |
| Same-provider account resolution | Missing |
| Rating observation period/recency | Missing |
| Account contribution evidence | Missing |
| Player-level confidence | Missing |
| Exclusion reasons | Missing |
| No-data and conflicting-data result | Missing |
| Own-level and stronger-level resolved target | Missing |
| Reusable player-level service/endpoint | Missing |
| Focused multi-account tests | Missing |

## Status decision

RB-002 changes from `BLOCKED` to `READY`.

Rationale:

- the required rating-normalization implementation is merged to `main`;
- its contract, profile, ranges, confidence, soft padding, service helpers, API, tests, documentation, and UI consumer are inspectable;
- the remaining work can now reuse a stable baseline without inventing a parity model;
- no other prerequisite blocker is documented for beginning the multi-account design and implementation.

RB-002 is not moved to `DONE` because its core multi-account outcome and material acceptance criteria remain unmet.

## Jira synchronization

- `CRT-2` remains `In Progress` and now records PR #76 as the second merged Stage 1 foundation.
- `CRT-3` remains `To Do`; its description now distinguishes the available normalization profile from the still-missing RB-002 player-level and population-bucket mapping semantics.
- `CRT-4` remains `To Do`, matching repository state `READY` and the absence of an active claim.
- `CRT-4` description and labels now record the exact merged baseline, remaining formula scope, dependencies, and status rationale.
- `CRT-4` retains Highest priority, parent `CRT-2`, existing links to `CRT-6` and `CRT-8`, reporter, and unassigned state.
- `CRT-6` and `CRT-8` remain `To Do` and blocked by the completed RB-002 outcome, not by the now-resolved normalization prerequisite.
- No Jira issue moved to `Done`.

## Decisions and evidence

RB-D008 remains `LOCKED` and is now grounded in the merged implementation: future cross-pool targeting must reuse PR #76's versioned profile, stable grade IDs, and source ranges.

RB-D010 remains `OPEN`: PR #76 does not decide recency, account inclusion, contribution weights, per-speed/overall resolution, confidence aggregation, or overrides.

No exact cross-pool rating conversion is introduced. Grade membership and approximate source ranges remain the supported abstraction.

## Validation

### Performed

- inspected merged PR #76 metadata and changed-file list;
- inspected the current rating-normalization contracts, service, route, product documentation, and lab usage on `main`;
- compared implementation evidence against every RB-002 acceptance criterion;
- inspected all fields returned for affected Jira issues;
- preserved existing priorities, parent relationships, dependency links, assignees, estimates, and workflow states where unchanged;
- reconciled repository status, queue, roadmap, decisions, questions, task scope, and Jira descriptions.

### Skipped

- application build;
- test execution;
- lint;
- architecture checks;
- browser validation.

These were skipped because this reconciliation changes planning and Jira metadata only. It does not modify PR #76's runtime implementation, whose CI passed before merge.

## Limitations and residual risks

- The rating profile has six online pools, while own-level population queries currently use discrete Lichess Explorer rating buckets; mapping remains a product decision.
- Soft padding represents boundary ambiguity, but its role in account-level and aggregate confidence is unresolved.
- Source-profile confidence and player-evidence confidence are different concepts and could be accidentally conflated.
- A user may have multiple ratings in the same pool; the normalization profile cannot decide which observation or account should dominate.
- FIDE Standard is reference-only and must not leak into online-game provider aggregation.
- Durable player-level results will need profile ID/version provenance if persistence is introduced.

## Standalone product impact

The rating-normalization API and performance-by-rating reference table already provide standalone parity value. Completing RB-002 should add a reusable, inspectable account-level view rather than hiding the formula inside the builder.

## North-star impact

The second Stage 1 prerequisite is now actionable. RB-002 can proceed in parallel with RB-001 and RB-003. RB-004 and RB-006 remain blocked until RB-002 produces a completed player-level contract and behavior.

## New tasks proposed

None. The remaining work fits the existing RB-002 scope.

## Queue assessment

Reprioritization is limited to status/dependency state:

- RB-002 remains order 20 and P0;
- RB-002 changes from `BLOCKED` to `READY`;
- no other order or priority changes are recommended;
- RB-004 and RB-006 remain blocked on RB-002's outcome;
- RB-008 may use verified rating-grade metadata earlier but retains its existing order and priority.

## Planning documents updated

- `README.md` — records both merged Stage 1 foundations.
- `STATUS.md` — records PR #76, RB-002 readiness, Jira state, and remaining risks.
- `TASKS.md` — changes RB-002 to `READY` and updates queue/critical-path notes.
- `ROADMAP.md` — records the rating-normalization baseline and Stage 1 gate impact.
- `DECISIONS.md` — grounds RB-D008 in the merged profile and keeps RB-D010 open.
- `OPEN_QUESTIONS.md` — separates resolved profile facts from remaining multi-account questions.
- `tasks/RB-002-player-level-resolution.md` — replaces the availability blocker with the verified baseline and remaining outcome.

## Recommended next checkpoint

Claim RB-002 / CRT-4 for a bounded architecture and formula slice that inspects current account/rating-history patterns, defines per-speed and overall outputs, records contribution/exclusion evidence, and specifies confidence and grade-offset behavior before production UI is added.
