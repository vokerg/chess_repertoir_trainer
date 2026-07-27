# Repertoire Builder Program Status

Last updated: 2026-07-27

## Current state

**Program state:** RB-001, RB-002, RB-003, RB-008, RB-014 and RB-018 are complete. RB-004 is in review through PR #136 with green final-head CI. RB-006 is ready. RB-017 is the approved bounded traps data/validator pilot and is claimed through issue #114.

**Runtime on `main`:** the deterministic side-aware opening-classification registry is `2026-07-rules-v2` and covers every entry and unique name in the pinned generated opening book with ordered regex rules, while preserving low-confidence and explicit unknown dimensions. PR #111 remains the method foundation. The earlier squash commit `49dc6499eac9998de864ccb75a607541cd945382` from PR #84 provides the Lichess-benchmark profile, provider-aware multi-account peer resolver, preset Opening Explorer API, compact Peer games UI, tests and runtime documentation.

**Review runtime in PR #136:** RB-004 adds an authenticated deterministic Player Chess Profile endpoint and shared contract. It separates preference from performance, reuses imported-game ownership/filter predicates, consumes the completed peer resolver and opening-classification registry, exposes coverage and evidence grades, and bounds opening/game evidence without adding persistence or UI.

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

- versioned classification contract `2026-07-rules-v1`;
- deterministic ordered regex rules with broad family inheritance and narrow overrides;
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
- broad family expansion based on the measured backlog;
- narrow side-aware exceptions where family inheritance would misrepresent soundness or roles;
- frequency-ranked generated and imported-game unknown-family backlogs;
- database-backed game-weighted coverage audit over existing opening metadata;
- CI audit artifacts and regression failure for newly unmatched pinned names;
- no persistence, runtime AI, engine workflow, public API, UI, queue or generated-book mutation.

Rule-match coverage is not semantic overclaiming. Rare heterogeneous families may retain `UNKNOWN` soundness or low confidence while exposing only safe characteristics and provenance. Runtime names outside the pinned book keep the explicit unknown fallback.

### RB-008 visual direction

Issue [#96](https://github.com/vokerg/chess_repertoir_trainer/issues/96) is complete through PR [#110](https://github.com/vokerg/chess_repertoir_trainer/pull/110).

Accepted flow:

1. a focused setup dialog captures side, starting point, speed preset, rating target, persona and coverage/theory preferences;
2. **Start building** closes the dialog and opens a routed workbench;
3. the routed workbench uses one readable primary board, candidate switcher, focused evidence, opponent-response coverage queue and branch progress;
4. Direction B's simultaneous candidate landscape is rejected as the default because it is too heavy and reduces board readability;
5. candidate-attached target/profile roles remain; explicit mini-board comparison is deferred unless later evidence justifies it.

### RB-014 traps discovery

Issue [#102](https://github.com/vokerg/chess_repertoir_trainer/issues/102) is complete through squash-merged PR [#113](https://github.com/vokerg/chess_repertoir_trainer/pull/113), commit `d53ff6e2b6eedcbf5f3abcea137373baa0102397`.

Report: `reports/RB-014-2026-07-27-traps-foundation-discovery.md`.

Accepted conclusions:

- identify trap occurrences by normalized trigger position and ordered move transitions, not opening name;
- combine CC0 source candidates, versioned engine evidence, target-population evidence, and editorial review;
- represent setup soundness, temptation, punishment, safe defenses, sample size, confidence, and provenance separately;
- treat related non-identical triggers as one family with separate occurrences;
- keep production persistence, API, Angular UI, course writes, and RB-006/RB-007 contract changes out of the approved pilot.

## RB-004 review

Issue [#92](https://github.com/vokerg/chess_repertoir_trainer/issues/92) is implemented for review through PR [#136](https://github.com/vokerg/chess_repertoir_trainer/pull/136).

Report: `reports/RB-004-2026-07-27-player-chess-profile-calculation.md`.

Review implementation:

- shared request/response schemas at `@chess-trainer/contracts/player-chess-profile`;
- authenticated `GET /api/player-chess-profile` route with route-schema OpenAPI;
- account, period, speed-preset, color, rated-status and rating-context filters;
- selected-game score baseline and explicit analysed coverage;
- separate preference exposure and performance measurements;
- side-aware RB-003/RB-018 dimensions with rule/source provenance;
- deterministic sample and analysis evidence grades;
- bounded top-100 opening/color groups and 1–10 supporting games;
- explicit omitted, truncated, low-confidence and unknown-dimension counts;
- no Prisma migration, stored profile, UI, LLM, candidate ranking or course write.

Final implementation-head CI run `30287398030` / #1103 passed lint, build, audits, architecture guardrails, migrations and the complete test suite, including real multi-account filtering and a bounded 1,200-game performance regression.

RB-004 remains open until user review, accepted integration and final closure reconciliation.

## Ready work

### RB-006 repertoire target contract

RB-006 can define the target contract using completed opening-classification evidence and accepted RB-008 setup responsibilities. It remains independent from RB-004 review, subject to normal collision checks around shared contracts and peer evidence.

## RB-017 active pilot

Issue [#114](https://github.com/vokerg/chess_repertoir_trainer/issues/114) is the only approved traps implementation scope.

Implementation branch: `rb-017/issue-114-curated-traps-pilot`.

Scope:

- 20–50 source-controlled reviewed occurrences;
- deterministic legality, normalization, identity, duplicate, defense, and provenance validation;
- versioned Stockfish and bounded Opening Explorer evidence snapshots;
- explicit insufficient-evidence states;
- human-readable review output;
- tests and documentation.

Explicit exclusions:

- no Prisma model or production import;
- no public API, OpenAPI, MCP, or Angular surface;
- no course writes;
- no repertoire-target or candidate-ranking contract changes;
- no unlicensed source copying;
- no fabricated values.

## Repository and GitHub issue state

- RB-001 / [#89](https://github.com/vokerg/chess_repertoir_trainer/issues/89): `DONE`.
- RB-002 / [#90](https://github.com/vokerg/chess_repertoir_trainer/issues/90): `DONE` through RB-001 delivery evidence and closure PR #107.
- RB-003 / [#91](https://github.com/vokerg/chess_repertoir_trainer/issues/91): `DONE` through PR #111.
- RB-004 / [#92](https://github.com/vokerg/chess_repertoir_trainer/issues/92): `REVIEW` through PR #136.
- RB-006 / [#94](https://github.com/vokerg/chess_repertoir_trainer/issues/94): `READY`.
- RB-008 / [#96](https://github.com/vokerg/chess_repertoir_trainer/issues/96): `DONE` through accepted PR #110 direction.
- RB-014 / [#102](https://github.com/vokerg/chess_repertoir_trainer/issues/102): `DONE` through PR #113.
- RB-017 / [#114](https://github.com/vokerg/chess_repertoir_trainer/issues/114): `CLAIMED` for the bounded pilot.
- RB-018 / [#116](https://github.com/vokerg/chess_repertoir_trainer/issues/116): `DONE` through PR #121.
- Jira coordination is retired; `CRT-2` through `CRT-18` are historical migration records.

## Dependency impact

- RB-004 review proposes the complete deterministic calculation contract and no separate metric task.
- RB-005 remains blocked until RB-004 is accepted and integrated; after that it can proceed using the shared contract.
- RB-006 is unblocked and owns setup-dialog target fields and override semantics.
- RB-007 remains blocked on RB-006; it may consume intrinsic classification but must not conflate it with target or population evidence.
- RB-009 owns routed session, branch queue, draft and resume semantics.
- RB-010 owns production implementation of the setup dialog and routed board-first workbench.
- RB-017 remains independent and adds no critical-path blocker.

## Validation

- RB-003 GitHub Actions run `30239257847` passed TypeScript lint, complete workspace build, architecture guardrails, PostgreSQL migrations, and the complete repository test suite.
- RB-018 final CI and generated/imported-game audit evidence are recorded in its completion report and PR #121.
- RB-004 implementation-head run `30287398030` / #1103 passed lint, build, both opening-classification audits, architecture guardrails, migrations and complete tests.
- RB-008 validation includes responsive prototype review and complete repository CI on PR #110.
- RB-014 source/license verification, repository inspection, and complete repository CI passed on PR #113.
- RB-017 must add deterministic offline fixture tests plus an explicit opt-in refresh path for live engine/population evidence, then pass lint, build, architecture guardrails, migrations, and the complete test suite.

## Residual risks

- Opening classifications are reviewable chess judgments and some boundary choices may remain controversial.
- Generated-name rule-match coverage is distinct from actual-game distribution and semantic confidence.
- Production-user game-weighted opening-classification coverage must be run against a populated environment.
- RB-004 evidence grades are deterministic volume/coverage bands rather than formal significance estimates.
- RB-004 has no equivalent peer-population opening-character performance baseline; it exposes factual peer level separately and compares performance with the selected personal baseline.
- Cross-provider duplicate copies may contribute more than once when multiple accounts are selected.
- The RB-004 top-100 opening-group cap intentionally exposes omitted long-tail coverage rather than loading unbounded groups.
- Production RB-004 latency should be observed on a populated environment after integration; CI validates a bounded synthetic 1,200-game dataset.
- Chess.com band boundaries remain approximate product mappings.
- Direction A may later need an explicit structural-comparison mode.
- Theory-burden and response-coverage semantics remain pending RB-007/RB-009.
- Trap names are inconsistent and user-created source licensing is heterogeneous.
- Live Explorer evidence is rate-limited and must not become a required deterministic test dependency.

## Queue recommendation

Review RB-004 through PR #136. The next ordered unclaimed `READY` critical-path task is RB-006. Keep RB-005 blocked until RB-004 is accepted and integrated. Execute RB-017 as an isolated non-production pilot and require a new user review before any production traps capability or RB-006/RB-007 extension is proposed.
