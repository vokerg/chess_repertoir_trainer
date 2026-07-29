# Repertoire Builder Program Status

Last updated: 2026-07-28

## Current state

**Program state:** RB-001, RB-002, RB-003, RB-006, RB-008, RB-014 and RB-018 are complete. RB-004 is in review through PR #136. RB-005 has a stacked hands-on implementation in review through PR #139. RB-007 is the next ready critical-path task. RB-017 is the approved bounded traps data/validator pilot and is claimed through issue #114.

**Runtime on `main`:** the deterministic side-aware opening-classification registry is `2026-07-rules-v2` and covers every entry and unique name in the pinned generated opening book with ordered regex rules, while preserving low-confidence and explicit unknown dimensions. The earlier squash commit `49dc6499eac9998de864ccb75a607541cd945382` from PR #84 provides the Lichess-benchmark profile, provider-aware multi-account peer resolver, preset Opening Explorer API, compact Peer games UI, tests and runtime documentation. Squash commit `9d833d910205f687b87f3c54e2ff4ea71ced3cb5` from PR #157 provides the versioned shared repertoire-target contract, examples, invariants and change-impact helpers.

**Review stack:** PR #136 adds the Player Chess Profile API and contract. PR #139 adds the Angular experience on top of that unmerged calculation branch. Neither profile PR is integrated into `main`.

**GitHub program tracker:** [#105 — Repertoire Builder North Star program](https://github.com/vokerg/chess_repertoir_trainer/issues/105), open.

## Completed foundations

### RB-001 and RB-002

Available on `main`:

- fixed speed presets and rating targets;
- Lichess benchmark bands and versioned Chess.com mappings;
- provider/speed classification before aggregation;
- multi-account game-count-weighted normalized band distribution;
- recent-three-month, all-history and generic fallback;
- `dominant-contiguous-window-v1`;
- complete distribution, selected groups, evidence period and contribution provenance;
- compact Peer games UI and typed API contracts.

RB-002 is closed as delivered by this merged RB-001 implementation. No separate durable formula, exact universal number, persistence model, confidence score or override foundation is justified without a concrete consumer or measured defect.

### RB-003 opening-classification foundation

Issue [#91](https://github.com/vokerg/chess_repertoir_trainer/issues/91) is complete through PR [#111](https://github.com/vokerg/chess_repertoir_trainer/pull/111).

Report: `reports/RB-003-2026-07-27-opening-classification-rules.md`.

Delivered:

- deterministic ordered regex rules with family inheritance and narrow overrides;
- independent White and Black soundness, character, theoretical status, theory burden, roles and confidence;
- explicit matched-rule provenance and unknown values;
- representative gambit, dubious-line and Mikenas-Carls examples;
- generated-book coverage and rule-usage audit;
- no database, runtime LLM, Stockfish audit, API, UI, or generated-book mutation.

### RB-018 opening-classification coverage

Issue [#116](https://github.com/vokerg/chess_repertoir_trainer/issues/116) is complete through PR [#121](https://github.com/vokerg/chess_repertoir_trainer/pull/121).

Report: `reports/RB-018-2026-07-27-opening-classification-coverage.md`.

Delivered:

- active rule version `2026-07-rules-v2`;
- 100% rule-match coverage for the pinned 3,733 generated entries and 3,167 unique names through 114 active ordered rules;
- maintainable coverage modules and stable-ID regex corrections;
- frequency-ranked generated and imported-game unknown-family backlogs;
- database-backed game-weighted coverage auditing;
- CI audit artifacts and failure on newly unmatched pinned names;
- explicit low confidence and `UNKNOWN` dimensions where stronger claims would be fabricated.

Rule-match coverage is not semantic overclaiming. Rare heterogeneous families may retain `UNKNOWN` soundness or low confidence while exposing only safe characteristics and provenance.

### RB-008 visual direction

Issue [#96](https://github.com/vokerg/chess_repertoir_trainer/issues/96) is complete through PR [#110](https://github.com/vokerg/chess_repertoir_trainer/pull/110).

Accepted flow:

1. a focused setup dialog captures side, starting point, speed preset, rating target, persona and coverage/theory preferences;
2. **Start building** closes the dialog and opens a routed workbench;
3. the workbench uses one readable primary board, candidate switcher, focused evidence, opponent-response coverage queue and branch progress;
4. simultaneous candidate mini-boards are rejected as the default;
5. candidate-attached target/profile roles remain.

### RB-014 traps discovery

Issue [#102](https://github.com/vokerg/chess_repertoir_trainer/issues/102) is complete through squash-merged PR [#113](https://github.com/vokerg/chess_repertoir_trainer/pull/113), commit `d53ff6e2b6eedcbf5f3abcea137373baa0102397`.

Report: `reports/RB-014-2026-07-27-traps-foundation-discovery.md`.

Accepted conclusions include normalized position-and-move identity, CC0 source candidates, versioned engine and population evidence, explicit setup soundness and provenance, and editorial review. No production schema, API, Angular UI, course write, or critical-path dependency was added.

### RB-006 repertoire target contract

Issue [#94](https://github.com/vokerg/chess_repertoir_trainer/issues/94) is complete through squash-merged PR [#157](https://github.com/vokerg/chess_repertoir_trainer/pull/157), commit `9d833d910205f687b87f3c54e2ff4ea71ced3cb5`.

Report: `reports/RB-006-2026-07-28-repertoire-target-contract.md`.

Delivered:

- shared `@chess-trainer/contracts/repertoire-target` export;
- versioned target identity, side and starting point;
- one fixed speed preset and requested/effective Lichess population target;
- factual peer-resolution snapshots with normalization/profile and resolver-policy provenance;
- `MY_PEERS_PLUS_ONE` as exactly one adjacent higher benchmark group, capped at `2500+`;
- account context, explicit persona/objective, risk, theory, complexity and coverage policy;
- target-specific soundness/theory values that exclude factual `UNKNOWN`;
- explicit opt-in for deliberately dubious intent;
- per-field system/persona/profile/peer defaults kept separate from authoritative effective values;
- exact override validation without mutating factual profile or peer evidence;
- immutable, mutable and candidate-recalculation field sets;
- pure population-resolution and change-impact helpers;
- canonical new-course, existing-course, profile-override and alternate-persona examples;
- invalid-combination and pure-helper tests;
- no endpoint, UI, persistence, ranking, course write, traps or LLM behavior.

PRs #145 and #146 were superseded and closed without merge.

## Review work

### RB-004 calculation

Issue [#92](https://github.com/vokerg/chess_repertoir_trainer/issues/92) is implemented for review through PR [#136](https://github.com/vokerg/chess_repertoir_trainer/pull/136).

Report: `reports/RB-004-2026-07-27-player-chess-profile-calculation.md`.

Review implementation:

- shared request/response schemas at `@chess-trainer/contracts/player-chess-profile`;
- authenticated `GET /api/player-chess-profile`;
- account, period, speed-preset, colour, rated-status and rating-context filters;
- selected-game score baseline and explicit analysed coverage;
- separate preference exposure and performance measurements;
- side-aware opening-profile dimensions with rule/source provenance;
- deterministic sample and analysis evidence grades;
- bounded top-100 opening/colour groups and 1–10 supporting games;
- explicit omitted, truncated, low-confidence and unknown-dimension counts;
- no Prisma migration, stored profile, UI, LLM, candidate ranking or course write.

Final implementation-head CI run `30287398030` / #1103 passed lint, build, audits, architecture guardrails, migrations and complete tests.

### RB-005 experience

Issue [#93](https://github.com/vokerg/chess_repertoir_trainer/issues/93) is implemented for hands-on review through stacked PR [#139](https://github.com/vokerg/chess_repertoir_trainer/pull/139).

Report: `reports/RB-005-2026-07-28-player-chess-profile-experience.md`.

Review implementation:

- `/progress` preserves the existing default/active account redirect and `/progress/accounts/:accountId` retains account dashboards;
- `/progress/profile` is a separate authenticated lazy route;
- Progress exposes `Account performance` and `Chess profile` submenu entries;
- recent, all-time, and custom periods;
- all or selected accounts, speed preset, White/Black, rated/casual, and rating-range filters;
- independent `What you choose` and `What works` views;
- character, soundness, theory status, theory burden, and role breakdowns;
- conclusion cards and row-level evidence expansion;
- contributing openings, bounded supporting games, WDL, score baseline, composite opening-positive/trouble and early-mistake rates, accuracy and peer context;
- coverage, low-confidence, unknown, truncation, loading, no-data, error, stale-request, and partial-analysis states;
- feature-local standalone OnPush components, HTTP-only typed data access, private writable store signals with readonly/computed exposure, focused pure view-model helpers, and component/store/route tests;
- no RB-004 formula change, profile persistence, correction storage, target setup, course write, or LLM dependency.

The review stack remains open until RB-004 is accepted, populated profile data is reviewed, and the stacked branches are reconciled. No profile code is on `main`.

## RB-007 ready work

RB-007 is the next ordered critical-path task. It can now consume the integrated RB-006 target boundary together with completed opening classification, population evidence and accepted RB-008 visual responsibilities.

## RB-017 active pilot

Issue [#114](https://github.com/vokerg/chess_repertoir_trainer/issues/114) remains the only approved traps implementation scope.

Implementation branch: `rb-017/issue-114-curated-traps-pilot`.

Scope is limited to a source-controlled reviewed dataset, deterministic validation, versioned engine/population snapshots, explicit insufficient evidence, review output, tests and documentation. It excludes Prisma persistence, public API, Angular UI, course writes, and target/ranking contract changes.

## Repository and GitHub issue state

- RB-001 / [#89](https://github.com/vokerg/chess_repertoir_trainer/issues/89): `DONE`.
- RB-002 / [#90](https://github.com/vokerg/chess_repertoir_trainer/issues/90): `DONE` through RB-001 delivery evidence and closure PR #107.
- RB-003 / [#91](https://github.com/vokerg/chess_repertoir_trainer/issues/91): `DONE` through PR #111.
- RB-004 / [#92](https://github.com/vokerg/chess_repertoir_trainer/issues/92): `REVIEW` through PR #136.
- RB-005 / [#93](https://github.com/vokerg/chess_repertoir_trainer/issues/93): `REVIEW` through stacked PR #139.
- RB-006 / [#94](https://github.com/vokerg/chess_repertoir_trainer/issues/94): `DONE` through PR #157.
- RB-007 / [#95](https://github.com/vokerg/chess_repertoir_trainer/issues/95): `READY`.
- RB-008 / [#96](https://github.com/vokerg/chess_repertoir_trainer/issues/96): `DONE` through accepted PR #110 direction.
- RB-014 / [#102](https://github.com/vokerg/chess_repertoir_trainer/issues/102): `DONE` through PR #113.
- RB-017 / [#114](https://github.com/vokerg/chess_repertoir_trainer/issues/114): `CLAIMED` for the bounded pilot.
- RB-018 / [#116](https://github.com/vokerg/chess_repertoir_trainer/issues/116): `DONE` through PR #121.

## Dependency impact

- RB-004 proposes the deterministic calculation contract.
- RB-005 demonstrates the first profile presentation without extending that contract.
- RB-005 cannot be integrated before RB-004 is accepted and the stacked branches are reconciled.
- RB-006 provides the integrated target fields, default/override provenance and recalculation boundary.
- RB-013 should consume RB-006 rather than inventing a separate profile-to-target override model.
- RB-007 is now ready as the next critical-path task.
- RB-009 owns target snapshot history, routed session, queue, invalidation, draft and resume semantics after RB-007 stabilizes candidate semantics.
- RB-010 owns production builder implementation using accepted RB-008 composition and completed RB-006 plus future RB-007/RB-009 contracts.
- RB-017 remains independent and adds no critical-path blocker.

## Validation

- RB-004 CI `30287398030` / #1103 passed lint, build, audits, architecture guardrails, migrations and complete tests.
- RB-008 validation includes responsive prototype review and complete repository CI on PR #110.
- RB-014 source/license verification, repository inspection, and complete repository CI passed on PR #113.
- RB-006 CI `30382976492` / #1251 and `30383511789` / #1256 passed lint, build, both opening audits, architecture guardrails, migrations and complete tests.
- RB-017 must add deterministic offline fixture tests plus an explicit opt-in live refresh path.

## Residual risks

- Opening classifications remain reviewable chess judgments.
- RB-006 v1 supports only the Lichess Games population source; other providers require versioned evidence semantics.
- Builder-session and completed-course target persistence remain intentionally unresolved for RB-009/RB-011/RB-013.
- Candidate ranking thresholds and coverage relevance remain RB-007 work.