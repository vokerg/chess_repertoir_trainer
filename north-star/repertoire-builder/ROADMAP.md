# Repertoire Builder Roadmap

Last updated: 2026-07-30

This roadmap orders capability stages and decision gates. Detailed execution belongs in individual task files.

## Stage 0 — program foundation

State: complete on `main` through PR #81, with planning reconciliation through PR #83 and GitHub Issues migration through PR #106.

Gate: passed for execution.

## Stage 1 — reusable evidence foundations

State: complete through RB-001, RB-002 and RB-003.

Delivered:

- fixed product speed presets and Lichess rating targets;
- provider-aware multi-account peer resolution using Lichess benchmark bands;
- recent, all-history and fallback evidence with complete provenance;
- deterministic side-aware opening classification with explicit unknowns;
- generated-book and imported-game auditing.

A second durable player-level formula, stored peer snapshot or generic confidence score remains unjustified without a concrete consumer or measured defect.

Tasks: RB-001, RB-002, RB-003.

Gate: passed.

## Stage 1A — opening-classification coverage

State: complete through RB-018 / #116 and PR #121.

Delivered:

- active version `2026-07-rules-v2`;
- rule-match coverage for all 3,733 pinned entries and 3,167 unique names;
- 114 ordered rules with maintainable family and exception modules;
- frequency-ranked generated and imported-game auditing;
- CI regression for newly unmatched pinned names;
- explicit low confidence and `UNKNOWN` dimensions where stronger claims would be fabricated.

Task: RB-018.

Gate: passed. Rule-match coverage is not equivalent to high-confidence semantic completeness.

## Stage 2 — Player Chess Profile

State: runtime delivery is present on `main` through the merged RB-004/RB-005 stack ending in PR #135. RB-004 and RB-005 remain in `REVIEW` because hands-on acceptance and repository/issue closure synchronization have not been completed.

RB-004 runtime provides:

- authenticated deterministic calculation endpoint and shared contract;
- account, period, speed, colour, rated-status and rating-context filters;
- selected-game baselines and analysis coverage;
- separate preference and performance measurements;
- side-aware opening dimensions and evidence grades;
- bounded opening/game evidence with explicit uncertainty and truncation;
- no persistence, permanent player label, LLM, candidate-ranking or course-write dependency.

RB-005 runtime provides:

- the original `/progress` default-account dashboard unchanged;
- a separate authenticated lazy `/progress/profile` route;
- separate `Account performance` and `Chess profile` navigation entries;
- recalculable context filters;
- explicit `What you choose` and `What works` views;
- inspectable character, soundness, theoretical-status, theory-burden and role evidence;
- conclusion, opening, game, baseline, peer and coverage presentation;
- loading, no-data, error, stale-request, partial-analysis, low-confidence, unknown and truncation states.

Tasks: RB-004, RB-005.

Gate: runtime integration passed. Product acceptance remains pending against populated personal data; closure metadata must then be reconciled.

## Stage 3 — target, personas and candidate decision model

State: RB-006 and RB-007 are complete. RB-013 is implemented and in `REVIEW` through PR #232.

Integrated RB-006/RB-007 delivery provides:

- one versioned repertoire target using fixed speed and population vocabulary;
- factual peer evidence, descriptive player-profile advice and explicit target intent kept separate;
- field-level default and override provenance;
- deterministic candidate aggregation across engine, Masters, selected population, personal games, opening profile, player profile and course evidence;
- separate `USER_MOVE` and `OPPONENT_RESPONSE` roles;
- explicit missing, stale and insufficient evidence;
- stable reasons, warnings and bounded preview/coverage data;
- no opaque public aggregate score.

RB-013 review delivery adds:

- eligible side-specific Chess profile → Builder actions;
- deterministic character-to-persona and theory derivation;
- bounded 24-hour route provenance with safe malformed/stale fallback;
- visible profile source and explicit rejection to standard Builder defaults;
- editable `PLAYER_PROFILE` speed, objective and coverage defaults;
- independent peer-population provenance;
- exact RB-006 override accounting and side-change provenance removal;
- transparent persona character, soundness, risk, complexity, theory and coverage details;
- route-local target presets only, with no course metadata or persistence.

Tasks: RB-006, RB-007, RB-013.

Gate: deterministic target and candidate comparison passed. RB-013 still requires hands-on review against populated personal data and responsive presentation before accepted integration.

## Stage 4 — visual decision proof

State: complete through accepted RB-008 direction in PR #110.

Accepted proof:

- focused setup dialog;
- routed board-first workbench;
- one primary board, candidate switcher, focused evidence, response queue and branch progress;
- target and profile roles remain separate;
- simultaneous candidate mini-board landscape is rejected as the default.

Task: RB-008.

Gate: passed.

## Stage 5 — resumable builder foundation and MVP

State: complete through squash-merged RB-009 PR #177 and RB-010 PR #184.

RB-009 provides:

- pure serializable session model version `2026-07-v1`;
- owner identity and optimistic revision;
- retained target and candidate evidence/policy provenance;
- path-stable branch history and normalized-position transposition identity;
- explicit branch and decision-history states;
- deterministic replacement, invalidation, defer/reopen, stale restart, ignore, complete, reorder, resume and abandon behavior;
- lazy bounded queue and structural preview;
- no Prisma model, API route, Angular UI or storage adapter.

RB-010 provides:

- authenticated lazy `/builder` route;
- setup for side, speed, population, persona, theory and response coverage;
- factual peer-resolution provenance versus explicit manual targets;
- one primary board with candidate/resulting-position preview and manual legal-move inclusion;
- RB-007 evidence and RB-009 session/queue composition;
- bounded product limits of 6 candidates and 24 accepted decisions;
- route-local state with explicit refresh loss and setup replacement;
- no builder-session persistence or course write.

Tasks: RB-009, RB-010.

Gate: passed. A user can build one bounded repertoire slice and inspect a structural draft before course writes.

## Stage 6 — course materialization and existing-course adaptation

State: complete through RB-011 and RB-012.

RB-011 provides:

- completed-session projection into the existing analysis merge tree;
- explicit exclusion of unresolved branches from writes;
- shared versioned preview/apply contracts;
- authenticated operations against one owned existing chapter;
- mandatory preview and explicit transactional apply;
- reviewed new-line or exact existing-line-anchor targets;
- explicit created, reused, skipped and conflicting counts;
- exact preview binding to user, draft, destination and course revision;
- strict conflict rejection, equivalent-line reuse and repeated-apply safety;
- no Prisma model, migration, whole-course orchestration or durable builder persistence.

RB-012 provides:

- exact Course-ending and Opponent-gap launch actions;
- bounded source evidence and filter provenance;
- initial-position or exact-position Builder starts as appropriate;
- observed-move inclusion;
- fixed source side with editable target controls;
- return-to-source restoration;
- exact RB-011 destination locking;
- safe stale-source behavior;
- no second recommendation engine or course writer.

Tasks: RB-011, RB-012.

Gate: passed for existing-chapter materialization and exact coverage-extension adaptation.

## Stage 7 — specialized personas, traps and optional intelligence

State:

- RB-013 is in `REVIEW` through PR #232;
- RB-014 discovery is complete;
- RB-017 is the approved isolated traps pilot and remains claimed;
- RB-015, RB-019 and RB-020 are complete.

Goals:

- support multiple purposeful repertoire intents without making a player profile prescriptive;
- make profile-derived defaults optional, transparent and editable;
- validate trap knowledge reproducibly before production integration;
- test generated interpretation without making it factual, decision, reducer, preview/apply or write authority.

Accepted boundaries:

- RB-013 personas are route-local target presets, not permanent player labels or course metadata;
- RB-017 remains limited to 20–50 source-controlled occurrences, deterministic validation, versioned engine/population snapshots, explicit missing evidence, review output, tests and documentation;
- RB-019 and RB-020 remain independently gated, explicit, transient, non-authoritative and removable;
- no generic mutable Builder-AI layer, automatic generation, persistence by default or generated command path is accepted.

Tasks: RB-013, RB-014, RB-015, RB-017, RB-019, RB-020.

Gate: RB-015 decision gate passed. RB-013 requires hands-on acceptance. RB-017 must prove whether its trap model survives review. Live AI usefulness remains an enablement question rather than unfinished deterministic Builder work.

## Stage 8 — outcome feedback

State: blocked until Builder-created and course-applied material has sufficient real usage.

Goals:

- measure whether built and trained choices appear in later games;
- distinguish adoption, recall, opening-position quality and results;
- identify regression and newly relevant coverage;
- feed validated outcomes back into profile and course maintenance.

Task: RB-016.

Gate: sufficient real Builder/course usage and measurable follow-up games must exist before implementation can be specified honestly.

## Release conditions

The deterministic Builder foundation is release-capable when:

- factual population and profile evidence is inspectable;
- target intent and overrides are explicit;
- candidate comparisons remain deterministic and explainable;
- session and branch transitions remain bounded and reviewable;
- course changes require preview and explicit apply;
- exact existing-course entry points preserve source and destination identity;
- optional generated text can be disabled without changing the workflow.

Outcome claims require RB-016 evidence and are not implied by feature completion.

## Dependency relationships

- RB-001/RB-002 and RB-003/RB-018 provide reusable evidence foundations.
- RB-004/RB-005 provide descriptive personal profile evidence and UI.
- RB-006 owns target intent and provenance.
- RB-013 consumes profile evidence through RB-006 defaults; it does not alter the profile.
- RB-007 owns deterministic candidate evidence and ranking.
- RB-009 owns session and queue semantics.
- RB-010 composes the interactive Builder.
- RB-011 owns preview/apply and course-write authority.
- RB-012 owns exact existing-course launch adaptation.
- RB-014/RB-017 own trap knowledge research and pilot validation.
- RB-015/RB-019/RB-020 own optional generated interpretation boundaries.
- RB-016 owns outcome measurement.

## Parallel-delivery guidance

Safe parallel work:

- hands-on acceptance and closure reconciliation for RB-004/RB-005;
- review of RB-013 against populated profile data;
- post-merge calibration of Course endings and Opponent gaps;
- RB-017 bounded traps pilot;
- evidence collection needed before RB-016 specification.

High-collision areas requiring coordination:

- target, candidate and session contracts or versions;
- production Builder state composition;
- any new persistence or migration;
- course preview and writes;
- profile/persona defaults;
- future trap or AI evidence in candidate contracts.

## Queue impact

- RB-001, RB-002, RB-003, RB-006, RB-007, RB-008, RB-009, RB-010, RB-011, RB-012, RB-014, RB-015, RB-018, RB-019 and RB-020 are `DONE`.
- RB-004 and RB-005 are `REVIEW`; runtime is on `main`, but hands-on acceptance and closure synchronization remain pending.
- RB-013 is `REVIEW` through PR #232 after complete implementation CI #1690.
- RB-017 remains `CLAIMED` and isolated.
- RB-016 remains `BLOCKED` on real product use.
- No priority, order or roadmap resequencing is required.
- No persistence or course-library follow-up is recommended until profile-derived Builder use demonstrates post-apply value.
