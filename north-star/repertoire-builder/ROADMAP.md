# Repertoire Builder Roadmap

Last updated: 2026-07-29

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

Gate: pending hands-on review and integration. The user must accept the calculation contract and determine whether the page is credible and useful against populated personal data. The stacked branches must then be reconciled before merge.

## Stage 3 — target and candidate decision model

State: complete through integrated RB-006 and RB-007. RB-013 remains proposed as a later dual-use persona/profile-default extension.

Delivered:

- one versioned repertoire target using fixed speed and population vocabulary;
- factual peer evidence, descriptive profile advice and explicit target intent kept separate;
- field-level default and override provenance;
- deterministic candidate aggregation across engine, Masters, selected population, personal games, opening profile, player profile and course evidence;
- separate `USER_MOVE` and `OPPONENT_RESPONSE` roles;
- explicit missing/stale/insufficient evidence;
- stable reasons, warnings and bounded preview/coverage data;
- no opaque public aggregate score.

Tasks: RB-006, RB-007, RB-013.

Gate: passed. One position can produce a deterministic, explainable candidate comparison for a selected target.

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

State: complete through squash-merged RB-009 PR #177 and RB-010 PR #184.

RB-009 delivered:

- pure serializable session model version `2026-07-v1`;
- owner identity and optimistic revision;
- retained target and candidate evidence/policy provenance;
- path-stable branch history plus normalized-position transposition identity;
- explicit pending, accepted, deferred, ignored, completed and stale states;
- decision history with active, superseded and stale records;
- deterministic ancestor replacement and target/evidence invalidation;
- lazy bounded queue and explicit reorder;
- bounded preview tree and queue projection;
- session complete, abandon and resume semantics;
- no Prisma model, API, Angular UI or storage adapter.

RB-010 delivered:

- authenticated lazy `/builder` route and top-level navigation;
- initial-position setup for side, speed, population, persona, theory and opponent-response coverage;
- factual peer-resolution provenance versus explicit manual rating targets;
- one primary board with candidate/resulting-position preview and manual legal-move inclusion;
- existing RB-007 candidate API integration with inspectable source states, reasons, warnings, target fit and profile fit;
- direct use of RB-009 ownership, revision, queue, deferral, staleness, transposition and preview semantics;
- explicit user-move and opponent-response decision loops;
- queue selection/reorder, defer/reopen, ignore, stop, stale restart, complete and abandon controls;
- a bounded structural draft preview;
- product bounds of 6 candidates and 24 accepted decisions while preserving RB-009 hard limits;
- accepted route-local state, with explicit refresh loss and setup replacement;
- no Prisma model, builder-session API, browser storage or course write.

PR #184 was squash-merged as `ea5b2bef4cdc0fa37024213b2e00b9da589b9718` after final tested head `b3a0076bdc75ea8035b3999a8e10a12d24992c6f` passed CI #1417.

Tasks: RB-009, RB-010.

Gate: passed. A user can build one bounded repertoire slice, control opponent-response coverage and inspect a structural draft before course writes.

## Stage 6 — course materialization and adaptation

State: RB-011 is complete through squash-merged PR #189. The first RB-012 Course endings entry slice is integrated through squash-merged PR #205, and RB-012 is `READY` for Opponent gaps.

RB-011 delivered:

- a completed-builder-session projection into the existing storage-neutral analysis merge tree;
- explicit exclusion of pending, deferred, ignored and stale branches from writes;
- retained session/target/revision provenance at the boundary;
- one shared versioned preview/apply contract;
- authenticated operations against one owned existing chapter;
- mandatory preview before explicit apply;
- reviewed new-line or exact existing-line-anchor targets;
- explicit created, reused, skipped and conflicting move counts;
- exact preview fingerprinting over user, full draft, destination, result and course content revision;
- strict rejection of trained-side conflicts;
- transactional reuse of the existing move-node writer and course revision path;
- equivalent-line and repeated-apply safety;
- feature-local Angular destination, preview, target and apply state;
- no Prisma model, migration, whole-course/new-chapter orchestration or durable builder persistence.

PR #189 was squash-merged as `01b36f9503ccfbb3dced55d56589b89cfd163867`. Final review-package CI #1488 passed the complete repository workflow. Issue #99 is closed.

RB-012 integrated first slice provides:

- a line-specific **Extend this line in builder** action for every exact Course ending line/node reference;
- a bounded validated launch payload retaining source course context, terminal FEN, observed continuation, game evidence and applied filters;
- canonical full-FEN expansion for the normalized Course ending position;
- a `COURSE_POSITION` target and RB-009 session start at the exact terminal position;
- observed-move inclusion in the initial RB-007 candidate request;
- fixed source course side with editable speed, population, persona, theory and coverage;
- visible source evidence and explicit extend-only consequence;
- source-scope restoration when returning to Course endings;
- RB-011 preview/apply locked to the exact source course/chapter/line/node;
- safe no-match behavior for stale or changed source endpoints;
- no new API route, persistence, migration or recommendation engine.

PR #205 was squash-merged as `c2266c9a8ffca00696da264abb3476f36ec82b50` after final review-package head `45851192b77327e23546eb691d3629c3a193144d` passed CI #1541.

Remaining Stage 6 goals:

- add Opponent gaps as the next explicit coverage-extension entry point;
- define explicit replace/alternate/keep-course consequences before integrating My deviations;
- calibrate the complete Course ending loop against populated data, responsive layouts and keyboard traversal;
- consider retiring or consolidating source reports only after multiple finding types demonstrate equivalent builder maintenance value.

Tasks: RB-011, RB-012.

Gate: partially passed. Safe course materialization and the first exact finding-to-trainable-material loop are integrated. The broader multi-finding adaptation stage remains open under RB-012.

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

State: blocked until builder material is in use.

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
- the next RB-012 Opponent gaps slice;
- post-merge populated-browser calibration of the Course endings loop;
- RB-017 bounded traps pilot.

High-collision areas requiring coordination:

- target/candidate/session contracts and versions;
- production builder state composition;
- any new persistence or migration;
- course preview and writes;
- profile/persona defaults;
- future trap evidence in candidate contracts.

## Queue impact

- RB-001, RB-002, RB-003, RB-006, RB-007, RB-008, RB-009, RB-010, RB-011, RB-014 and RB-018 are `DONE`.
- RB-004 is `REVIEW` through PR #136.
- RB-005 is `REVIEW` through stacked PR #139 and remains dependent on RB-004 acceptance and stack reconciliation.
- RB-012 is `READY` after squash-merged PR #205; Opponent gaps is the next bounded slice.
- RB-017 remains `CLAIMED` and isolated.
- No priority change or roadmap resequencing is required.
