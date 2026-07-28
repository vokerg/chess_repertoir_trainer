# Repertoire Builder Program Status

Last updated: 2026-07-28

## Current state

**Program state:** RB-001, RB-002, RB-003, RB-008, RB-014 and RB-018 are complete. RB-004 is in review through PR #136. RB-005 has a green stacked hands-on implementation in review through PR #139. RB-006 is ready. RB-017 is the approved bounded traps data/validator pilot and is claimed through issue #114.

**Runtime on `main`:** the deterministic side-aware opening-classification registry is `2026-07-rules-v2` and covers every entry and unique name in the pinned generated opening book with ordered regex rules, while preserving low-confidence and explicit unknown dimensions. PR #111 remains the method foundation. The earlier squash commit `49dc6499eac9998de864ccb75a607541cd945382` from PR #84 provides the Lichess-benchmark profile, provider-aware multi-account peer resolver, preset Opening Explorer API, compact Peer games UI, tests and runtime documentation.

**Review stack:** PR #136 adds the Player Chess Profile API and contract. PR #138 records the RB-005 claim. PR #139 adds the Angular experience on top of that unmerged calculation branch. Neither profile PR is integrated into `main`.

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

## Player Chess Profile review stack

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

Issue [#93](https://github.com/vokerg/chess_repertoir_trainer/issues/93) is implemented for hands-on review through stacked PR [#139](https://github.com/vokerg/chess_repertoir_trainer/pull/139). Claim PR: [#138](https://github.com/vokerg/chess_repertoir_trainer/pull/138).

Report: `reports/RB-005-2026-07-28-player-chess-profile-experience.md`.

Review implementation:

- `/progress` opens the combined profile; `/progress/accounts/:accountId` retains account dashboards;
- recent, all-time, and custom periods;
- all or selected accounts, speed preset, White/Black, rated/casual, and rating-range filters;
- independent `What you choose` and `What works` views;
- character, soundness, theory status, theory burden, and role breakdowns;
- conclusion cards and row-level evidence expansion;
- contributing openings, bounded supporting games, WDL, score baseline, composite opening-positive/trouble and early-mistake rates, accuracy and peer context;
- coverage, low-confidence, unknown, truncation, loading, no-data, error, and partial-analysis states;
- feature-local standalone OnPush components, typed data access, page-scoped signal store, pure helpers, and focused tests;
- no RB-004 formula change, profile persistence, correction storage, target setup, course write, or LLM dependency.

Final implementation-head CI run `30329120052` / #1124 passed lint, production build, both audits, architecture guardrails, migrations, and the complete repository test suite.

The review stack remains open until the user accepts RB-004, reviews the profile against populated data, and approves stack reconciliation. No profile code is on `main`.

## Ready work

### RB-006 repertoire target contract

RB-006 can define target intent using completed opening classification and accepted RB-008 setup responsibilities. It remains independent from the profile review stack, subject to normal collision checks around shared contracts and peer evidence.

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
- RB-006 / [#94](https://github.com/vokerg/chess_repertoir_trainer/issues/94): `READY`.
- RB-008 / [#96](https://github.com/vokerg/chess_repertoir_trainer/issues/96): `DONE` through accepted PR #110 direction.
- RB-014 / [#102](https://github.com/vokerg/chess_repertoir_trainer/issues/102): `DONE` through PR #113.
- RB-017 / [#114](https://github.com/vokerg/chess_repertoir_trainer/issues/114): `CLAIMED` for the bounded pilot.
- RB-018 / [#116](https://github.com/vokerg/chess_repertoir_trainer/issues/116): `DONE` through PR #121.

## Dependency impact

- RB-004 proposes the deterministic calculation contract.
- RB-005 demonstrates the first profile presentation without extending that contract.
- RB-005 cannot be integrated before RB-004 is accepted and the stacked branches are reconciled.
- RB-006 remains unblocked and owns target fields and intent semantics.
- RB-013 should later make profile-derived defaults optional and editable without mutating factual profile evidence.
- RB-007 remains blocked on RB-006.
- RB-009 owns routed session, queue, draft and resume semantics.
- RB-010 owns production builder implementation.
- RB-017 remains independent and adds no critical-path blocker.

## Validation

- RB-004 CI `30287398030` / #1103 passed lint, build, audits, architecture guardrails, migrations and complete tests.
- RB-005 CI `30329120052` / #1124 passed lint, build, audits, architecture guardrails, migrations and complete tests, including profile helper/store/component coverage.
- RB-008 validation includes responsive prototype review and complete repository CI on PR #110.
- RB-014 source/license verification, repository inspection, and complete repository CI passed on PR #113.
- RB-017 must add deterministic offline fixture tests plus an explicit opt-in live refresh path.

## Residual risks

- Opening classifications remain reviewable chess judgments.
- Rule-match coverage is distinct from semantic confidence and actual-game distribution.
- RB-004 evidence grades are deterministic volume/coverage bands, not formal significance estimates.
- No peer-population opening-character performance baseline exists; personal performance uses the selected-game baseline while factual peer level is shown separately.
- Cross-provider duplicate copies may contribute more than once.
- The top-100 opening-group cap intentionally exposes omitted long-tail coverage.
- Production profile latency should be observed against populated data.
- RB-005 has passed compile/test and static responsive/accessibility review, but real desktop/mobile browser review against personal data remains the acceptance step.
- Composite opening-positive/trouble and early-mistake metrics intentionally remain unsplit until hands-on evidence justifies more detail.
- Chess.com band boundaries remain approximate product mappings.
- Theory-burden and response-coverage semantics remain pending later target/ranking work.

## Queue recommendation

Review the profile stack through PRs #136 and #139. Keep both issues open until accepted integration and hands-on validation. RB-006 remains the next ordered unclaimed `READY` critical-path task. Keep RB-017 isolated from production contracts and require a new user decision before any production traps capability.
