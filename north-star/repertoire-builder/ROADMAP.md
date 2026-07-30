# Repertoire Builder Roadmap

Last updated: 2026-07-30

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

State: complete through RB-011 and the accepted RB-012 boundary. PR #189 provides course materialization; PRs #205 and #208 provide exact Course ending and Opponent gap entry points.

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

RB-012 Course endings delivery provides:

- a line-specific **Extend this line in builder** action for every exact Course ending line/node reference;
- a bounded validated launch payload retaining source course context, terminal FEN, observed continuation, game evidence and applied filters;
- canonical full-FEN expansion for the normalized source position;
- a `COURSE_POSITION` target and exact-position RB-009 start;
- observed-move inclusion in the initial RB-007 request;
- fixed source course side with editable speed, population, persona, theory and coverage;
- visible source evidence and explicit extend-only consequence;
- source-scope restoration on return;
- RB-011 locking to the exact source course/chapter/line/node;
- safe stale-source behavior.

PR #205 was squash-merged as `c2266c9a8ffca00696da264abb3476f36ec82b50` after final review-package CI #1541 passed.

RB-012 Opponent gaps delivery provides:

- exact API-side `LINE_START` and `NODE` anchors at the pre-gap position;
- one **Cover this gap in builder** action per exact line/anchor match;
- explicit coverage-extension intent and pre-gap RB-009 start;
- observed-move inclusion in the initial RB-007 request;
- fixed source course side with editable speed, population, persona, theory and coverage;
- visible source evidence, applied-filter summary and minimum course overlap;
- source-scope restoration on return;
- RB-011 locking to the selected course/chapter/line and exact anchor;
- safe stale-source behavior;
- preserved My deviations behavior without replacement/alternate-line ambiguity.

PR #208 was squash-merged as `1583b153a2bc674c649b2500769be997a8f4474e` after final review-package CI #1597 passed. Issue #100 is closed.

Accepted boundary:

- Course endings and Opponent gaps remain inspectable source/recalculation surfaces;
- My deviations, weak-choice and profile-driven adaptation require explicit new tasks if pursued;
- replace, alternate-line and keep-course consequences are not treated as equivalent;
- no second recommendation engine, course writer or durable builder persistence was introduced.

Tasks: RB-011, RB-012.

Gate: passed for the accepted materialization and coverage-extension adaptation scope.

## Stage 7 — specialized personas and optional intelligence

State: RB-015 is complete through squash-merged PR #216. RB-014 discovery is complete through PR #113. RB-017 is the approved isolated traps pilot and remains claimed. RB-013 is proposed but blocked. RB-019 and RB-020 are proposed P3 stretch prototypes.

Goals:

- support multiple purposeful repertoires for the same opening;
- make profile-derived defaults optional and editable without changing factual profile evidence;
- validate trap knowledge reproducibly before production work;
- test whether generated interpretation adds value without becoming factual, decision, reducer, preview/apply or write authority.

RB-013 remains blocked until RB-004/RB-005 are accepted and integrated.

RB-017 remains limited to 20–50 source-controlled occurrences, deterministic validation, versioned engine/population snapshots, explicit missing evidence, review output, tests and documentation. It must not add production persistence, public API, Angular UI, course writes, or builder integration.

RB-015 delivered:

- verification of the existing optional AI provider/capability/validation architecture;
- a locked read-only leaf boundary over immutable deterministic snapshots;
- explicit prohibition on generated input to RB-007 ranking, RB-009 reducers/queue, completion eligibility, RB-011 preview/apply and course writes;
- independent global-plus-use-case feature gates, transient lifetime, failure isolation and purge requirements;
- RB-019/#218 for advisory candidate explanation beside Focused evidence;
- RB-020/#219 for post-apply summary after the authoritative result;
- profile narrative deferral until accepted populated profile UX demonstrates a gap;
- current official DeepSeek API/pricing/privacy review with re-verification required at prototype implementation.

PR #216 final research head `7e7495485969c8dca1c515066c41df472817b6e8` passed CI #1617 and was squash-merged as `9a4e6166c9a874b8cb5b5efb04a2a4661e848d45`.

RB-019 and RB-020 remain separate non-critical prototypes. They may not introduce a generic mutable Builder-AI layer, persistence by default, automatic generation or generated commands.

Tasks: RB-013, RB-014, RB-015, RB-017, RB-019, RB-020.

Gate: RB-015 decision gate passed. RB-017 must prove whether the trap model survives review. RB-019/RB-020 each require explicit claim, implementation review, deterministic controls and human usefulness evidence before any retention or promotion decision.

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
- RB-019 or RB-020 only after an explicit stretch-goal claim;
- post-merge populated-browser calibration of Course endings and Opponent gaps;
- RB-017 bounded traps pilot.

High-collision areas requiring coordination:

- target/candidate/session contracts and versions;
- production builder state composition;
- any new persistence or migration;
- course preview and writes;
- profile/persona defaults;
- future trap or AI evidence in candidate contracts.

## Queue impact

- RB-001, RB-002, RB-003, RB-006, RB-007, RB-008, RB-009, RB-010, RB-011, RB-012, RB-014, RB-015 and RB-018 are `DONE`.
- RB-004 is `REVIEW` through PR #136.
- RB-005 is `REVIEW` through stacked PR #139 and remains dependent on RB-004 acceptance and stack reconciliation.
- RB-013 remains proposed but blocked on accepted profile implementation.
- RB-017 remains `CLAIMED` and isolated.
- RB-019 and RB-020 remain `PROPOSED` P3 stretch prototypes.
- RB-016 remains blocked on real product use.
- No critical-path priority change or roadmap resequencing is required.
