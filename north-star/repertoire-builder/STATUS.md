# Repertoire Builder Program Status

Last updated: 2026-07-27

## Current state

**Program state:** RB-001, RB-002, RB-003, RB-008 and RB-014 are complete. RB-004, RB-006 and RB-018 are ready. RB-017 is the approved bounded traps data/validator pilot and is claimed through issue #114.

**Runtime on `main`:** PR #111 adds the deterministic side-aware opening-classification foundation beside the existing opening-book lookup. The earlier squash commit `49dc6499eac9998de864ccb75a607541cd945382` from PR #84 provides the Lichess-benchmark profile, provider-aware multi-account peer resolver, preset Opening Explorer API, compact Peer games UI, tests and runtime documentation.

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

### RB-003 opening classification

Issue [#91](https://github.com/vokerg/chess_repertoir_trainer/issues/91) is complete through PR [#111](https://github.com/vokerg/chess_repertoir_trainer/pull/111).

Report: `reports/RB-003-2026-07-27-opening-classification-rules.md`.

Delivered:

- versioned classification contract `2026-07-rules-v1`;
- deterministic ordered regex rules with broad family inheritance and narrow overrides;
- independent White and Black soundness, character, theoretical status, theory burden, roles and confidence;
- explicit matched-rule provenance and unknown values;
- Evans, Queen's Gambit Accepted, Benko, Smith-Morra, Marshall, dubious-gambit and Mikenas-Carls examples;
- generated-book coverage and rule-usage audit;
- focused tests plus full generated-book processing;
- no database, runtime LLM, Stockfish audit, API, UI, or generated-book mutation.

RB-018 / [#116](https://github.com/vokerg/chess_repertoir_trainer/issues/116) owns systematic regex coverage expansion and actual-game calibration. It does not reopen the foundation.

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

## Ready work

### RB-004 Player Chess Profile calculation

RB-004 can now consume completed RB-001/RB-002 factual level evidence and the RB-003 opening-classification contract. It must preserve classified and unknown counts and must not imply that RB-018 coverage is already complete.

### RB-006 repertoire target contract

RB-006 can now define the target contract using completed RB-003 and accepted RB-008 setup responsibilities.

### RB-018 classification coverage

Issue [#116](https://github.com/vokerg/chess_repertoir_trainer/issues/116) is `READY`.

Scope:

- keep classification regex-based and deterministic;
- organize rules by opening family where useful;
- group and prioritize unknowns;
- add family, subfamily and exact exception rules;
- measure generated-name and actual-game coverage;
- preserve explicit unknowns and White/Black asymmetry.

Explicit exclusions: Stockfish, runtime AI, database storage, background jobs, API, UI, and Player Chess Profile aggregation.

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
- RB-004 / [#92](https://github.com/vokerg/chess_repertoir_trainer/issues/92): `READY`.
- RB-006 / [#94](https://github.com/vokerg/chess_repertoir_trainer/issues/94): `READY`.
- RB-008 / [#96](https://github.com/vokerg/chess_repertoir_trainer/issues/96): `DONE` through accepted PR #110 direction.
- RB-014 / [#102](https://github.com/vokerg/chess_repertoir_trainer/issues/102): `DONE` through PR #113.
- RB-017 / [#114](https://github.com/vokerg/chess_repertoir_trainer/issues/114): `CLAIMED` for the bounded pilot.
- RB-018 / [#116](https://github.com/vokerg/chess_repertoir_trainer/issues/116): `READY` for regex coverage expansion.
- Jira coordination is retired; `CRT-2` through `CRT-18` are historical migration records.

## Dependency impact

- RB-004 is unblocked by RB-003 and may run in parallel with RB-018.
- RB-005 remains blocked on RB-004.
- RB-006 is unblocked by RB-003 and owns the accepted setup-dialog target fields and override semantics.
- RB-007 remains blocked on RB-006; it consumes RB-003 but does not wait for fabricated complete classification coverage.
- RB-009 owns routed session, branch queue, draft and resume semantics.
- RB-010 owns production implementation of the setup dialog and routed board-first workbench.
- RB-017 remains independent and adds no critical-path blocker.

## Validation

RB-003 GitHub Actions run `30239257847` passed TypeScript lint, complete workspace build, architecture guardrails, PostgreSQL migrations, and the complete repository test suite.

RB-008 validation includes responsive prototype review and complete repository CI on PR #110.

RB-014 source/license verification, repository inspection, and complete repository CI passed on PR #113.

RB-017 must add deterministic offline fixture tests plus an explicit opt-in refresh path for live engine/population evidence, then pass lint, build, architecture guardrails, migrations, and the complete test suite.

## Residual risks

- Initial opening classifications are broad chess judgments and some boundary choices may be controversial.
- Regex rules depend on upstream naming stability; RB-018 must keep unknowns and unused rules visible.
- Generated-name coverage is less important than actual-game-weighted coverage.
- Chess.com band boundaries remain approximate product mappings.
- Duplicate copies across owned accounts may contribute more than once to factual level evidence.
- Direction A may later need an explicit structural-comparison mode.
- Theory-burden and response-coverage semantics remain pending RB-007/RB-009.
- Trap names are inconsistent and user-created source licensing is heterogeneous.
- Live Explorer evidence is rate-limited and must not become a required deterministic test dependency.

## Queue recommendation

RB-004, RB-006 and RB-018 are now actionable. RB-018 should expand regex coverage in parallel with RB-004 rather than blocking profile calculation on nominal 100% generated-name coverage. Execute RB-017 as an isolated non-production pilot and require a new user review before any production traps capability or RB-006/RB-007 extension is proposed.
