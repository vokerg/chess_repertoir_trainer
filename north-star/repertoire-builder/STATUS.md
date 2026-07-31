# Repertoire Builder Program Status

Last updated: 2026-07-31

## Current state

**Program state:** RB-001, RB-002, RB-003, RB-006, RB-007, RB-008, RB-009, RB-010, RB-011, RB-012, RB-013, RB-014, RB-015, RB-018, RB-019 and RB-020 are complete. RB-004 and RB-005 have runtime delivery on `main` but remain in review for hands-on acceptance and closure synchronization. RB-017 is the approved bounded traps data/validator pilot and remains claimed through issue #114.

**Runtime on `main`:** the application has the Lichess-benchmark population and peer-resolution foundation from PR #84, deterministic opening classification and complete pinned-book rule matching from PRs #111 and #121, Player Chess Profile calculation and `/progress/profile` experience through the merged RB-004/RB-005 stacks ending in PR #135, the versioned repertoire-target contract from PR #157, profile-derived optional Builder defaults and explicit overrides from PR #232, deterministic candidate-decision contract/ranking/API from PR #166, storage-neutral builder-session and branch-queue domain from PR #177, the authenticated bounded `/builder` workbench from PR #184, mandatory transactional builder-course preview/apply from PR #189, exact Course ending → Builder adaptation from PR #205, exact Opponent gap → Builder adaptation from PR #208, the disabled-by-default transient RB-019 advisory candidate explanation prototype from PR #223, and the disabled-by-default transient RB-020 post-apply completion-summary prototype from PR #228.

**Integrated planning on `main`:** PR #216 defines the non-authoritative, removable AI prototype architecture. PRs #223 and #228 implement the two independently gated prototypes without making generated text authoritative, persistent, or part of deterministic Builder decisions or course writes. PR #232 keeps profile recommendations advisory by translating them into editable and rejectable RB-006 defaults rather than constraints.

**Review work:** RB-004/RB-005 runtime is already on `main`, but their repository and issue acceptance/closure metadata remains stale and a hands-on populated-data review is still pending.

**GitHub program tracker:** [#105 — Repertoire Builder North Star program](https://github.com/vokerg/chess_repertoir_trainer/issues/105), open.

## Completed foundations

### Population and player level — RB-001 / RB-002

Available on `main`:

- fixed speed presets and Lichess rating targets;
- versioned Chess.com-to-Lichess mappings;
- provider/speed classification before aggregation;
- multi-account game-count-weighted normalized band distribution;
- recent-three-month, all-history and generic fallback;
- `dominant-contiguous-window-v1`;
- complete distribution, selected interval, evidence period and contribution provenance;
- compact Peer games UI and typed API contracts.

No second durable player-level formula is justified without a measured defect or concrete consumer.

### Opening classification — RB-003 / RB-018

Available on `main`:

- deterministic ordered regex rules with family inheritance and narrow overrides;
- independent White and Black profiles;
- explicit matched-rule provenance and unknown values;
- active rule version `2026-07-rules-v2`;
- rule-match coverage for all 3,733 pinned entries and 3,167 unique names;
- generated and imported-game weighted audits;
- CI failure on newly unmatched pinned names.

Rule matching does not fabricate semantic certainty. Rare families may retain low confidence or explicit `UNKNOWN` dimensions.

### Accepted visual direction — RB-008

PR #110 establishes:

1. a focused setup dialog for side, start, speed, population, persona and coverage intent;
2. a routed builder workbench after **Start building**;
3. one readable primary board;
4. candidate switching with focused evidence;
5. an opponent-response queue and visible branch progress;
6. separate target fit and profile fit;
7. no simultaneous multi-board default.

### Repertoire target — RB-006

Squash-merged PR #157 provides:

- versioned target identity and one build/session snapshot;
- side, starting point and account context;
- one fixed speed preset and requested/effective population;
- factual peer-resolution provenance;
- explicit objective, risk, theory, complexity and coverage intent;
- field-level defaults and exact overrides;
- immutable/mutable/recalculation field sets;
- no API, UI, persistence, ranking or course writes.

### Profile-derived personas and overrides — RB-013

Squash-merged PR #232 provides:

- eligible White and Black Chess profile → Builder actions derived independently from classified profile evidence;
- a bounded five-classified-game eligibility rule per side;
- deterministic mapping from weighted profile character to the existing Balanced, Solid, Aggressive, or Surprise presets;
- bounded and expiring profile route provenance with safe malformed, future and stale fallback;
- visible source evidence and an explicit standard-default rejection path;
- editable `PLAYER_PROFILE` defaults for speed, objective and coverage;
- separate peer-resolution or explicit manual population provenance;
- exact RB-006 override accounting and side-change provenance removal;
- transparent persona character, soundness, risk, complexity, theory and coverage details;
- no profile-calculation, ranking, reducer, preview/apply, course-writer, persistence, migration, AI or traps changes.

Personas are route-local target presets only. They are not factual player labels, saved personas, or course/line metadata.

Final review-package head `013bc016153b64b882b4cef9cef9940a3854c247` passed complete CI #1696. PR #232 was squash-merged as `4d57e140e77c62a3cac67d02fa5085b5f55dc985`.

Implementation report: `reports/RB-013-2026-07-30-profile-persona-launch.md`.

Closure report: `reports/RB-013-2026-07-31-closure.md`.

### Candidate decisions — RB-007

Squash-merged PR #166 provides:

- candidate contract version `2026-07-v1`;
- deterministic policy version `2026-07-deterministic-v1`;
- authenticated `POST /api/candidate-decisions`;
- separate `USER_MOVE` and `OPPONENT_RESPONSE` roles;
- bounded stored engine, Masters, selected-population, personal, opening, profile and course evidence;
- explicit unavailable, stale and insufficient source states;
- separate target fit and profile fit;
- stable reasons and warnings without a public opaque aggregate score;
- course conflict, narrow transposition and opponent-coverage evidence.

Final implementation-head CI #1295 passed the complete repository workflow.

### Builder session and branch queue — RB-009

Squash-merged PR #177 provides:

- pure model version `2026-07-v1` under `packages/chess-domain`;
- serializable owner-scoped snapshots and optimistic revision;
- retained RB-006 target and RB-007 evidence/policy references;
- path-stable branch history plus normalized-position transposition identity;
- explicit pending, accepted, deferred, ignored, completed and stale states;
- active, superseded and stale decision history;
- deterministic accept/replace, defer/reopen, stale restart, ignore, complete, reorder, refresh, resume and lifecycle transitions;
- lazy one-decision expansion rather than full-tree generation;
- bounded tree and queue preview;
- limits of 256 branches, 128 queued branches, 8 selected moves and 256 preview nodes.

RB-009 adds no Prisma model, API route, Angular UI or storage adapter.

CI #1328 and final implementation-head CI #1360 passed lint, build, both opening audits, architecture guardrails, migrations and complete repository tests.

Implementation report: `reports/RB-009-2026-07-29-builder-session-lifecycle.md`.

Closure report: `reports/RB-009-2026-07-29-closure.md`.

### Interactive builder MVP — RB-010

Squash-merged PR #184 provides:

- authenticated lazy `/builder` route and top-level navigation;
- focused initial-position setup for side, speed, population, persona, theory and coverage;
- factual peer-resolution provenance versus explicit manual rating targets;
- one primary Chessground board with candidate preview and manual legal-move inclusion;
- existing RB-007 candidate API integration with visible source states, reasons, warnings, target fit and profile fit;
- RB-009 owner/revision-aware transitions through a page-scoped signal store;
- user-move and opponent-response decision loops;
- selected coverage progress;
- queue navigation/reorder, defer/reopen, ignore, stop, stale restart, complete and abandon behavior;
- bounded structural preview;
- explicit route-local refresh-loss and setup-replacement behavior;
- responsive and keyboard-labelled feature-local components;
- no Prisma model, session API, browser storage or course write.

Accepted bounds are initial-position starts, 6 candidates per request and 24 accepted decisions while preserving RB-009 hard limits.

Final tested head `b3a0076bdc75ea8035b3999a8e10a12d24992c6f` passed CI run `30447177268` / #1417. PR #184 was squash-merged as `ea5b2bef4cdc0fa37024213b2e00b9da589b9718`.

Implementation report: `reports/RB-010-2026-07-29-interactive-builder-mvp.md`.

Closure report: `reports/RB-010-2026-07-29-closure.md`.

The first MVP intentionally remains route-local. Refresh starts a new draft. Durable draft persistence requires a separate demonstrated need.

### Builder course reintegration — RB-011

Squash-merged PR #189 provides:

- pure projection from completed RB-009 sessions to the existing analysis merge tree;
- explicit excluded pending, deferred, ignored and stale branches;
- one shared versioned builder-course preview/apply contract;
- authenticated preview and apply routes for one owned existing chapter;
- reviewed new-line or exact existing-line-anchor targets;
- explicit created, reused, skipped and conflicting counts;
- exact preview binding to user, draft, destination and current course content revision;
- strict no-conflict behavior;
- transactional reuse of the existing move-node writer and course revision path;
- equivalent-line and repeated-apply safety;
- page-scoped Angular destination, preview, target and apply state;
- no Prisma model, migration, whole-course orchestration or durable builder persistence.

Final tested implementation head `fa0bda406404a85138acb4c9cbf0ea5b79d6e13e` passed CI #1479. Final review-package head `30b077377cb5e9337dd455f9f8a8a7a38a152cec` passed CI #1488. PR #189 was squash-merged as `01b36f9503ccfbb3dced55d56589b89cfd163867`, and issue #99 is closed.

Implementation report: `reports/RB-011-2026-07-29-course-reintegration.md`.

Closure report: `reports/RB-011-2026-07-29-closure.md`.

The accepted v1 writes to an existing owned course/chapter. Whole-course/new-chapter orchestration and persisted builder target/session metadata remain later concerns, not blockers for exact existing-course adaptation.

### Existing-course adaptation — RB-012

Squash-merged PR #205 provides the Course endings slice:

- one line-specific **Extend this line in builder** action per exact line/node reference;
- bounded route validation for source course, chapter, line, terminal node, FEN, observed continuation, evidence and filters;
- canonical expansion of the four-field source FEN before exact-position session start;
- initial candidate inclusion for the observed continuation;
- fixed source repertoire side with editable target controls;
- visible source evidence and explicit extend-only consequence;
- restored Course endings mode, filters and minimum-games threshold;
- RB-011 locking to the exact source line/node;
- safe stale-source behavior.

Course endings final review-package head `45851192b77327e23546eb691d3629c3a193144d` passed CI #1541. PR #205 was squash-merged as `c2266c9a8ffca00696da264abb3476f36ec82b50`.

Squash-merged PR #208 provides the Opponent gaps slice:

- exact API-side `LINE_START` and `NODE` anchors at the pre-gap position;
- one **Cover this gap in builder** action per exact source anchor;
- explicit coverage-extension intent and pre-gap session start;
- initial candidate inclusion for the observed opponent move;
- fixed source side with editable speed, population, persona, theory and coverage;
- source evidence, applied-filter summary and minimum-overlap provenance;
- restored Opponent gaps mode, filters and overlap threshold;
- RB-011 locking to the selected course, chapter, line and exact anchor;
- safe stale-source behavior;
- preserved My deviations behavior without an ambiguous builder action.

Opponent gaps final review-package head `d542a9bf084d3738adfaddcfa5be5c95683591e2` passed CI run `30517656919` / #1597. PR #208 was squash-merged as `1583b153a2bc674c649b2500769be997a8f4474e`.

Implementation reports:

- `reports/RB-012-2026-07-29-course-ending-entry.md`;
- `reports/RB-012-2026-07-30-opponent-gaps-entry.md`.

Closure report: `reports/RB-012-2026-07-30-closure.md`.

Issue #100 is closed. My deviations is not residual RB-012 work; any future replace/alternate/keep-course adaptation requires a new task and explicit consequence design.

### Optional intelligence architecture — RB-015

Squash-merged PR #216 provides the completed LLM-role decision:

- the existing AI provider/capability/validation boundary is reusable evidence, not authority;
- generated interpretation is allowed only as an optional read-only leaf consuming immutable deterministic facts;
- no generated output can feed RB-007 ranking, selected moves/responses, RB-009 reducers/queue, completion eligibility, RB-011 preview/apply or course writes;
- RB-019/#218 is the candidate-explanation stretch prototype beside Focused evidence;
- RB-020/#219 is the post-apply summary stretch prototype after the authoritative course result;
- both are independently feature toggled, explicit, transient, failure-isolated and purgeable;
- profile narrative remains deferred until accepted populated profile UX demonstrates a gap;
- current DeepSeek API/pricing/privacy behavior was reviewed from official sources, and provider facts must be re-verified at implementation;
- no production endpoint, prompt, AI contract, Angular widget, schema, migration, persistence or deterministic-state change was added.

Final research head `7e7495485969c8dca1c515066c41df472817b6e8` passed CI run `30526417275` / #1617. PR #216 was squash-merged as `9a4e6166c9a874b8cb5b5efb04a2a4661e848d45`.

Report: `reports/RB-015-2026-07-30-llm-role-discovery.md`.

### Advisory candidate explanation prototype — RB-019

Squash-merged PR #223 provides:

- separately gated `builderCandidateExplanation` capability;
- versioned shared request/response contracts;
- authenticated authoritative context reconstruction through `CandidateDecisionService`;
- bounded deterministic fact projection into the existing OpenAI-compatible JSON client;
- rejection of unsupported evidence/move references, recommendation language, causal claims and stale identity;
- page-scoped transient Angular explanation state outside `RepertoireBuilderStore`;
- one explicit optional generated-interpretation panel after Focused evidence;
- no persistence, automatic generation, ranking, Builder reducer, queue, coverage or course mutation.

Final review-package head `5e8efa9b560fb3c3f34b7187353e3b4d4126b210` passed complete CI run `30560305501` / #1634. PR #223 was squash-merged as `ee389cbc62bc1fdf8c9c29fcc48c6c566b346652`, and issue #218 is closed.

Implementation report: `reports/RB-019-2026-07-30-builder-candidate-explanation.md`.

Closure report: `reports/RB-019-2026-07-30-closure.md`.

Live configured-provider output quality, authenticated browser presentation and comparative human usefulness remain unproven. The accepted boundary keeps that residual risk isolated because the prototype is disabled by default, non-authoritative, transient and removable.

### Post-apply completion summary prototype — RB-020

Squash-merged PR #228 provides:

- separately gated `builderCompletionSummary` capability;
- versioned shared request/response contracts;
- post-apply-only explicit generation after the authoritative result exists;
- authenticated reconciliation of the owned chapter, applied line, result counts and current course revision;
- bounded result, applied-path and excluded-work facts sent to the existing OpenAI-compatible JSON client;
- a server-generated authoritative result sentence separated from generated interpretation and study suggestions;
- rejection of unsupported fact/move references, course-control language, causal claims, stale destination/revision and excluded-work application claims;
- dialog-scoped transient Angular state outside `RepertoireBuilderCourseStore`;
- no persistence, automatic generation, preview/apply, course, navigation or deterministic-state mutation.

Final review-package head `88209147d3989e53fb949343d0eadf9c25e028ef` passed complete CI run `30578456168` / #1652. PR #228 was squash-merged as `d79557246330cd68cf762ce54144d2e9bee4b158`.

Implementation report: `reports/RB-020-2026-07-30-builder-completion-summary.md`.

Closure report: `reports/RB-020-2026-07-30-closure.md`.

Live configured-provider output quality, authenticated browser presentation and comparative human usefulness remain unproven. The accepted boundary keeps that residual risk isolated because the prototype is disabled by default, non-authoritative, transient, failure-isolated and removable.

## Review work

### RB-004 / #92 — Player Chess Profile calculation

PR #136 provides a shared contract and authenticated deterministic profile endpoint with separate preference/performance evidence, selected-game baselines, evidence grades, opening-classification provenance and bounded supporting games.

CI #1103 passed. Runtime is present on `main` through PR #135; user acceptance and repository/issue closure reconciliation remain required.

### RB-005 / #93 — Player Chess Profile experience

PR #139 provides `/progress/profile`, recalculable context filters, separate `What you choose` and `What works` views, evidence expansion, coverage states and focused Angular architecture/tests.

Runtime is present on `main` through the stacked #139 → #138 → #135 path; hands-on acceptance and repository/issue closure reconciliation remain required.

## Active independent pilot

### RB-017 / #114

The approved traps pilot remains limited to:

- a source-controlled reviewed dataset;
- deterministic validation;
- versioned engine and population snapshots;
- explicit insufficient evidence;
- review output, tests and documentation.

It excludes production persistence, public API, Angular UI, course writes and RB-006/RB-007 contract changes.

## Repository and GitHub issue state

- RB-001 / #89: `DONE`.
- RB-002 / #90: `DONE` through RB-001 delivery evidence.
- RB-003 / #91: `DONE`.
- RB-004 / #92: `REVIEW`; runtime is on `main`, acceptance/closure metadata pending.
- RB-005 / #93: `REVIEW`; runtime is on `main`, acceptance/closure metadata pending.
- RB-006 / #94: `DONE` through PR #157.
- RB-007 / #95: `DONE` through PR #166.
- RB-008 / #96: `DONE` through accepted PR #110 direction.
- RB-009 / #97: `DONE` through squash-merged PR #177.
- RB-010 / #98: `DONE` through squash-merged PR #184.
- RB-011 / #99: `DONE` through squash-merged PR #189; issue closed.
- RB-012 / #100: `DONE` through squash-merged PRs #205 and #208; issue closed.
- RB-013 / #101: `DONE` through squash-merged PR #232; issue closes with closure reconciliation.
- RB-014 / #102: `DONE` through PR #113.
- RB-015 / #103: `DONE` through squash-merged PR #216.
- RB-017 / #114: `CLAIMED` for the bounded pilot.
- RB-018 / #116: `DONE` through PR #121.
- RB-019 / #218: `DONE` through squash-merged PR #223; issue closed.
- RB-020 / #219: `DONE` through squash-merged PR #228; issue closed.

## Dependency impact

- RB-006 provides authoritative target snapshots and change-impact semantics.
- RB-007 provides candidate IDs, decision roles, evidence/policy versions, stable reasons and opponent-coverage contribution.
- RB-008 provides the accepted routed board-first interaction.
- RB-009 provides integrated session, decision-history, branch, queue, transposition, stale and preview semantics.
- RB-010 provides the integrated production workbench and bounded structural preview.
- RB-011 provides integrated course organization within an existing chapter, mandatory preview, transactional apply, conflicts, reuse and explicit results.
- RB-012 provides integrated Course endings and Opponent gaps adaptation without changing recommendation or course-write foundations.
- RB-013 provides integrated optional profile-derived target defaults and explicit overrides without changing the factual profile or deterministic Builder authority.
- RB-015 provides the locked non-authority, feature-toggle, transient-lifetime and purge boundaries for optional Builder interpretation.
- RB-017 remains outside the critical path.
- RB-019 provides the first integrated optional interpretation prototype without becoming a dependency of deterministic Builder delivery.
- RB-020 provides the integrated post-apply interpretation prototype without becoming a dependency of preview, apply or course-write delivery.

## Validation

- RB-004 CI #1103 passed lint, build, audits, guardrails, migrations and complete tests.
- RB-006 CI #1251 and #1256 passed the complete repository workflow.
- RB-007 CI #1281, #1284 and #1295 passed the complete repository workflow and focused acceptance cases.
- RB-008 validation includes responsive prototype review and complete repository CI.
- RB-009 CI #1328 and #1360 passed the complete repository workflow and focused lifecycle, queue, invalidation, transposition, revision and preview tests.
- RB-010 CI #1417 passed lint, builds, audits, architecture guardrails, migrations and complete tests, including restored existing navigation regression coverage.
- RB-011 implementation-head CI #1479 and final review-package CI #1488 passed lint, builds, both opening audits, architecture guardrails, migrations and complete tests.
- RB-012 Course endings final review-package CI #1541 and Opponent gaps final review-package CI #1597 passed the complete repository workflow.
- RB-013 final review-package CI #1696 passed lint, build, both opening audits, architecture guardrails, migrations and complete tests with profile-launch, provenance, override, rejection and legacy-route regressions.
- RB-014 source/license verification and complete repository CI passed.
- RB-015 final research CI #1617 passed the complete repository workflow; official DeepSeek API, JSON-output, pricing and privacy sources were reviewed on 2026-07-30.
- RB-017 must add deterministic offline fixture tests and an explicit opt-in live refresh path.
- RB-019 final review-package CI #1634 passed the complete repository workflow with grounding, stale-response, disabled-feature, provider-failure and state-isolation tests.
- RB-020 final review-package CI #1652 passed the complete repository workflow with grounding, post-apply-only, stale-response, disabled-feature, provider-failure, state-isolation and purge tests.

## Residual risks

- Opening classifications remain reviewable chess judgments.
- RB-004/RB-005 runtime exists on `main`, but hands-on acceptance and closure metadata remain unresolved.
- RB-006 v1 supports the Lichess Games population source only.
- RB-007 weights, thresholds and evidence limits require real-builder calibration and version increments when changed.
- RB-010/RB-012/RB-013 route-local drafts and launch context are intentionally lost on refresh.
- RB-013's five-game suggestion eligibility is a bounded product rule, not statistical confidence, and bounded opening-group truncation may affect the inferred preset.
- Six candidates and 24 decisions require normal product-use calibration.
- Source freshness remains consumer-driven; no background watcher marks evidence stale.
- Transpositions are recognized within the loaded session snapshot and course preview, but persisted course lines remain separate trees rather than a shared graph.
- RB-011 targets an existing owned chapter; whole-course/new-chapter organization and persisted target/session metadata are not implemented.
- My deviations, weak-choice and retained course-intent adaptation require explicit future tasks if pursued; they are not incomplete RB-012/RB-013 scope.
- Four-field source FENs do not contain move counters; canonical session FENs use neutral `0 1` counters while exact position identity remains the normalized four fields.
- Engine, personal, course and profile providers do not share one universal freshness timestamp model.
- DeepSeek model names, pricing and terms are mutable; public privacy terms do not establish API-specific zero retention and describe data processing/storage in China. Optional AI use cases must minimize context and re-verify provider/regional requirements before deployment.
- Generated interpretation can create undue authority even when technically isolated. RB-019 and RB-020 remain disabled by default; production enablement should compare them with deterministic templates and no-feature controls.

## Queue recommendation

Keep task order and priorities unchanged.

RB-013 is complete through squash-merged PR #232. RB-004/RB-005 acceptance and closure synchronization remains a separate review concern. RB-017 is already claimed. RB-019 and RB-020 are complete through squash-merged PRs #223 and #228. RB-016 remains blocked on real product use. No new persistence or course-library task is recommended before profile-derived Builder usage demonstrates value.
