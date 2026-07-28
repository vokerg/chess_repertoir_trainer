# Repertoire Builder Roadmap

Last updated: 2026-07-28

This roadmap orders capability stages and decision gates. Detailed execution belongs in individual task files.

## Stage 0 — program foundation

State: complete on `main` through PR #81, with planning reconciliation through PR #83 and GitHub Issues migration through PR #106.

Gate: passed for execution.

## Stage 1 — reusable evidence foundations

State: complete through RB-001, RB-002 and RB-003.

### Merged baseline

- PR #80: shared Masters/rated Opening Explorer, mixed cache profile and Peer games widget.
- PR #76: previous cross-pool rating-normalization profile, contracts, helpers, tests and reference UI.
- PR #84: fixed peer-population presets, Lichess-benchmark normalization, provider-aware multi-account resolver and compact Peer games UI.
- PR #106: GitHub Issues execution migration.
- PR #107: RB-002 closure reconciliation.
- PR #111: deterministic side-aware opening-classification foundation.

### RB-001 and RB-002 completed delivery

The factual population/player-level foundation provides product speed presets and rating targets, Lichess benchmark bands, provider-aware multi-account resolution, recent/all-history/fallback evidence, `dominant-contiguous-window-v1`, complete provenance, and compact Peer games UI.

A separate durable formula, stored snapshot, generic confidence score or override foundation remains rejected without a concrete consumer or measured defect.

### RB-003 completed delivery

The intrinsic opening-profile foundation provides deterministic ordered rules, family inheritance and overrides, independent White/Black soundness, character, theory status, theory burden, roles and confidence, matched-rule provenance, explicit unknowns, and generated-book auditing.

RB-018 completed systematic coverage without reopening the method foundation.

### Stage 1 gate

Passed.

Tasks: RB-001, RB-002, RB-003.

## Stage 1A — opening-classification coverage

State: complete through RB-018 / #116 and PR #121.

Delivered:

- active version `2026-07-rules-v2`;
- rule-match coverage for all 3,733 entries and 3,167 unique names in the pinned book;
- 114 ordered rules;
- maintainable family and exception modules;
- frequency-ranked generated and imported-game auditing;
- CI regression for newly unmatched pinned names;
- explicit low confidence and `UNKNOWN` dimensions where stronger claims would be fabricated.

Gate: passed. Rule-match coverage is not equivalent to high-confidence semantic completeness.

Task: RB-018.

## Stage 2 — Player Chess Profile

State: RB-004 and RB-005 are both in `REVIEW`. RB-005 is a stacked implementation through PR #139 on top of the unmerged RB-004 calculation PR #136.

RB-004 review implementation provides:

- authenticated deterministic calculation endpoint and shared contract;
- account, period, speed-preset, colour, rated-status and rating-context filters;
- selected-game baselines and analysis coverage;
- separate preference and performance measurements;
- side-aware opening-profile dimensions and evidence grades;
- bounded opening/game evidence with explicit uncertainty and truncation;
- no persistence, permanent label, LLM, UI, candidate ranking or course write.

RB-005 review implementation provides:

- the original `/progress` default-account dashboard entry unchanged;
- a separate authenticated lazy `/progress/profile` route;
- `Account performance` and `Chess profile` entries under the existing Progress submenu;
- recent, all-time, custom, account, speed, colour, rated/casual and rating-range filters;
- explicit `What you choose` and `What works` views;
- character, soundness, theory-status, theory-burden and role breakdowns;
- evidence-backed conclusion cards and expandable opening/game support;
- personal baseline, factual peer context, composite opening-quality/early-error metrics, accuracy and coverage;
- loading, no-data, error, stale-request, partial-analysis, low-confidence, unknown and truncated states;
- lazy page composition, page-scoped signal state with readonly exposure, typed HTTP-only data access, feature-local presentation models, focused pure helpers, shared breakpoint alignment, and component/store/route tests;
- no calculation extension, persistence, correction storage, target setup or course write.

Goals:

- preserve the separation of preference and performance;
- preserve sample, filters, baseline and evidence strength;
- make conclusions inspectable and advisory;
- show low-confidence and incomplete evidence rather than hiding it;
- validate the simplest useful opening-profile experience before adding broader metrics;
- add the profile alongside, rather than instead of, existing account performance.

Tasks: RB-004, RB-005.

Gate: pending corrected review-head CI, hands-on review and integration. The user must accept the calculation contract and determine whether the page is credible and useful against populated personal data. The stacked branches must then be reconciled before merge.

## Stage 3 — target and candidate decision model

State: RB-006 is ready; RB-007 remains blocked on RB-006. RB-008 supplies concrete visual data responsibilities.

Goals:

- define a repertoire target using one fixed speed preset and one rating target;
- keep factual level, descriptive profile and manual target override separate;
- aggregate engine, master, population, personal, opening-profile and course evidence without collapsing sources;
- rank candidates with explicit reasons and visible missing evidence;
- return bounded resulting-position, preview, burden, warning and response-coverage data.

Tasks: RB-006, RB-007, RB-013.

Gate: one position can produce a deterministic, explainable candidate comparison for a selected target.

## Stage 4 — visual decision proof

State: complete through accepted RB-008 direction in PR #110.

Accepted proof:

- focused setup dialog;
- routed board-first workbench;
- one primary board, candidate switcher, focused evidence, response queue and branch progress;
- target/profile roles remain separate;
- simultaneous candidate mini-board landscape is rejected as the default.

Task: RB-008.

Gate: passed.

## Stage 5 — resumable builder foundation and MVP

State: blocked on target/ranking contracts and builder-session definition.

Goals:

- define branch queue, accepted decisions, deferred responses, target snapshot and draft lifecycle;
- implement the accepted setup dialog and routed workbench;
- alternate user choices and opponent-response coverage;
- preserve selected, pending, deferred, ignored and completed states;
- produce a previewable repertoire tree.

Tasks: RB-009, RB-010.

Gate: a user can build one bounded repertoire slice and inspect the draft before course writes.

## Stage 6 — course materialization and adaptation

Goals:

- preview and apply accepted trees through current course-writing patterns;
- create or merge course material safely;
- enter the builder from gaps, endings, deviations and weak choices;
- preserve conflicts, transpositions and ownership.

Tasks: RB-011, RB-012.

Gate: accepted decisions become trainable material and existing-course maintenance uses the same workflow.

## Stage 7 — specialized personas and optional intelligence

State: core tasks are proposed or blocked. RB-014 discovery is complete through PR #113, and RB-017 is the approved isolated traps pilot.

Goals:

- support multiple purposeful repertoires for the same opening;
- make profile-derived defaults optional and editable without changing factual profile evidence;
- validate trap knowledge reproducibly before production work;
- determine whether an LLM adds value without becoming a factual dependency.

RB-017 remains limited to 20–50 source-controlled occurrences, deterministic validation, versioned engine/population snapshots, explicit missing evidence, review output, tests and documentation. It must not add production persistence, public API, Angular UI, course writes, or builder integration.

Tasks: RB-013, RB-014, RB-017, RB-015.

Gate: RB-017 proves whether the trap model survives review; a separate user decision is required before production work.

## Stage 8 — outcome feedback

Goals:

- measure whether built and trained choices appear in later games;
- distinguish adoption, recall, opening-position quality and results;
- identify regression and newly relevant coverage;
- feed validated outcomes back into profile and course maintenance.

Task: RB-016.

Gate: the program can evaluate real opening outcomes rather than only course size.

## Parallel-delivery guidance

Safe parallel work:

- review of the stacked RB-004/RB-005 profile implementation;
- RB-006 repertoire-target contract;
- RB-017 bounded traps pilot.

High-collision areas requiring coordination:

- opening-profile consumer contracts;
- rating-normalization and peer evidence;
- imported-game aggregation;
- target/candidate schemas;
- builder state and persistence;
- production workbench composition;
- course writes;
- future trap evidence in candidate contracts.

## Queue impact

- RB-001, RB-002, RB-003, RB-008, RB-014 and RB-018 remain `DONE`.
- RB-004 is `REVIEW` through PR #136.
- RB-005 is `REVIEW` through stacked PR #139; it is not integrated until corrected review-head CI, hands-on acceptance, RB-004 acceptance, and stack reconciliation.
- RB-006 remains `READY` and is the next ordered unclaimed task.
- RB-007 remains blocked on RB-006.
- RB-017 remains `CLAIMED` and isolated.
- No priority change or new task is required.
