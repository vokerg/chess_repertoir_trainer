# Onboarding and Data Lifecycle Status

Last updated: 2026-08-04

## Program state

`IMPLEMENTATION_IN_PROGRESS`

Program tracker: [#147](https://github.com/vokerg/chess_repertoir_trainer/issues/147)

Foundation: ONB-000 squash-merged through [PR #156](https://github.com/vokerg/chess_repertoir_trainer/pull/156)

Lifecycle contract: ONB-001 squash-merged through [PR #197](https://github.com/vokerg/chess_repertoir_trainer/pull/197)

Bounded import/backfill contract: ONB-002 squash-merged through [PR #204](https://github.com/vokerg/chess_repertoir_trainer/pull/204)

Preparation orchestration: ONB-003 squash-merged through [PR #256](https://github.com/vokerg/chess_repertoir_trainer/pull/256) as `d41f75c080cd19ad106b2143acecd3b0606adacb`

Destructive lifecycle: ONB-004 squash-merged through [PR #263](https://github.com/vokerg/chess_repertoir_trainer/pull/263) as `32db655a100ef1a55264b4d3739e2b7c38e72ee4`.

Throughput/progress: ONB-007 squash-merged through [PR #266](https://github.com/vokerg/chess_repertoir_trainer/pull/266) as `d6313823bd7da36991972a804f59d47d77578bdf` after corrected benchmark evidence and three self-review rounds.

Administrator architecture: ONB-005 completed through [PR #275](https://github.com/vokerg/chess_repertoir_trainer/pull/275) after three self-review rounds.

Shared-position cleanup research: ONB-006 completed through [PR #281](https://github.com/vokerg/chess_repertoir_trainer/pull/281) after two self-review rounds.

Lightweight experience blueprint: ONB-016 squash-merged through [PR #225](https://github.com/vokerg/chess_repertoir_trainer/pull/225)

Next unclaimed `READY` task: ONB-022 / [#272](https://github.com/vokerg/chess_repertoir_trainer/issues/272)

Latest report: `reports/ONB-006-2026-08-04-second-self-review-addendum.md`

## Completed contracts

### ONB-001

- persisted user disposition and repeatable preparation runs;
- fixed one-account three-calendar-month standard blitz/rapid initial recipe;
- import/index core-completion gate;
- analysis continues progressively;
- feature-specific readiness;
- `/home` plus resumable `/onboarding`;
- skip distinct from cancellation;
- legacy-user adoption;
- exact progress without ETA.

### ONB-002

- extended durable `ImportRun` plus exact account/scope coverage;
- half-open UTC ranges and distinct initial/forward/backfill modes;
- one non-terminal import per account;
- replayable provider windows and conservative coverage advancement;
- bounded duplicate-safe persistence;
- database-based preparation handoff;
- explicit backfill rather than raw cursor reset.

### ONB-003

- durable preparation run/target/batch boundary;
- separate bounded index and analysis child jobs;
- server-side candidate selection and atomic child creation;
- per-run and global admission bounds;
- committed-import pipelining;
- first-analysis lane and stage-specific multi-account fairness;
- direct-user preemption;
- acknowledged controls and evidence-based readiness.

### ONB-004

- five distinct actions: un-analyse, un-index, purge account data, delete external account, and delete app user;
- un-index always includes un-analysis;
- every action is a durable previewed, idempotent, audited operation;
- persisted user/account/game write fences block new work;
- cross-resource fence creation is serialized per user;
- destructive execution waits for preparation/import cancellation acknowledgement and zero target `JobTask.workKey` claims;
- synchronous AI/tag/tactical/scenario/provider writers use a short commit-side lifecycle guard so a request started before fence creation cannot persist afterward;
- terminal cancellation is permitted only before the first destructive commit; later stop/failure retains the resource fence and resumable checkpoint;
- large actions use forward-only bounded checkpoints, not one account/user transaction;
- shared `Position`, `PositionAnalysis`, and caches survive; ONB-006 owns cleanup;
- un-analysis removes per-game runs/snapshots, AI review, ply classifications, all tactical versions/processed markers, and recomputes tags;
- tactical feedback and scenario snapshots survive un-analysis/un-index;
- account purge removes copied scenario data before game/detection cascades can null source links and verifies no target-game personal snapshot remains;
- opening provenance distinguishes provider, local-book, and legacy/unknown values;
- account purge retains the account, terminal import-run history, and independent OAuth connection while clearing authoritative coverage/current pointers/frontiers;
- account delete removes the account and account-owned import history after lifecycle audit snapshot;
- whole-user deletion blocks ordinary auth-resolution writes, removes OAuth state/tokens, creates the HMAC tombstone before or with final AppUser deletion, and exposes post-delete receipt/status without ordinary AppUser upsert;
- mobile local purge is explicit, and stale devices receive typed deleted state before upload/provisioning;
- operation/audit history survives target deletion without raw personal payloads;
- implementation allocation: ONB-019/#259, ONB-020/#260, ONB-021/#261.

### ONB-005

- normal Clerk authentication remains the sole production login boundary;
- administrator capabilities are derived server-side after verified authentication;
- a disabled-by-default exact Clerk-subject allowlist bootstraps one replaceable authorization policy;
- production `dev-single-user`, shared secrets, email allowlists, `AppUser.isAdmin`, client roles, second login, impersonation, and Organizations solely for global operators are rejected;
- the API retains only the verified session context required for authorization and future reverification;
- ONB-022 delivers migration-free cursor-paginated aggregate diagnostics with numeric user-ID lookup, explicit partial sections, exact row counts, and strict sensitive-field exclusions;
- ONB-023 uses a lazy direct-link `/admin` route in the existing Angular deployment, with no required static-navigation entry and no client authorization authority;
- administrator execution requires canonical lifecycle services, valid preview, typed confirmation, idempotency, recent signed `fva`, and one-use request-bound `reverification_id`;
- administrator execution stays disabled until the pinned Clerk client flow proves signed evidence end to end;
- administrator whole-user deletion remains disabled pending a separate support/recovery policy decision;
- read-access security logs and lifecycle mutation audit use configurable initial 30/365-day defaults with explicit production confirmation;
- pseudonymous actor/target HMAC domains are versioned and separate from deleted-identity tombstones;
- request-budget enforcement must match verified API replica topology;
- implementation allocation: ONB-022/#272, ONB-023/#273, ONB-024/#274 at orders 190/200/210.

Completed through PR #275 after three adversarial self-review rounds and final canonical reconciliation.

### ONB-006

- exact zero-`ImportedGamePly` orphan predicate;
- course `MoveNode` explicitly excluded;
- `PositionAnalysis` and `MastersExplorerCache` treated as dependent cascades;
- durable first-observed candidate and initial 30-day grace;
- same-transaction PostgreSQL statement-trigger grace reset for every ply-reference insert/update;
- bounded input-page traversal and checkpoints to the last row inspected;
- fixed plies-first maintenance lock order plus final predicate/FK backstops;
- observational bounded dry-run with exact execution counters and no ETA/byte claim;
- manual server-side command over the canonical service, disabled by default and unscheduled;
- implementation allocation ONB-026/#280.

Completed through squash-merged PR #281 after two adversarial self-review rounds and final current-main reconciliation.

### ONB-007

- safe reusable benchmark harness restricted to a fresh local disposable PostgreSQL database;
- synthetic 10/50/200-game scale fixtures and deterministic legal 16/40/80-ply length fixtures;
- depth-12 WASM analysis and actual child-worker wave evidence;
- measured 50-game medium index worker wave observed maximum below 1.8 seconds in corrected CI;
- measured three-game short depth-12 analysis wave first-result observed maximum below 1.8 seconds and total observed maximum about 3.61 seconds in corrected CI;
- index, first-analysis, and analysis-tail defaults of 50, 3, and 10 games;
- global preparation caps of four non-terminal batches, 200 queued tasks, and 40 queued analysis tasks;
- existing scheduling slice retained at 25 as a fairness/preemption boundary, not a visible wave;
- one-second active/five-second idle preparation reconciliation with persisted immediate wake hints;
- serial provider execution, initial 14-day Lichess windows, Chess.com calendar-month units, and 100-row database writes;
- one active import executor with 1-second poll, 15-second heartbeat, 2-minute stale, and 30-second recovery defaults;
- exact counts and fixed-denominator percentages only; no weighted overall percentage or public ETA in the initial release;
- future stage ETA requires production telemetry, a fixed denominator, stable fingerprint, at least 30 recent samples across five runs/three accounts, bounded variance, and low failure rate;
- internal first-value, stall, direct-user protection, scaling, and lifecycle/cleanup transaction budgets;
- implementation handoffs applied to ONB-008, ONB-010 through ONB-014, ONB-017/018, and diagnostic/lifecycle owners.

Completed through squash-merged PR #266 as `d6313823bd7da36991972a804f59d47d77578bdf`.

### ONB-016

- focused route-based progressive disclosure;
- one-account first value then optional expansion;
- persisted milestones and evidence-labelled bounded reveals;
- optional tactical and Builder continuations;
- functional Angular ownership with VT coordination.

## Active and ready work

### Active implementation

- ONB-017 / #253 — preparation execution boundary — `IN_PROGRESS`; PR #282 merged the execution-boundary slice, while issue #253 and task completion records remain open.

### Ready implementation

- ONB-022 / #272 — administrator authorization and read-only diagnostics — `READY` after ONB-005 acceptance.
- Before claiming ONB-022, re-inspect current authentication, deployment topology, and ONB-019 actor-key activity.

## Allocated implementation backlog

- ONB-018 / #254 — preparation reconciliation/control — `PROPOSED`; consumes ONB-007 reconcile/first-analysis/stall defaults.
- ONB-008 / #193 — disposition/readiness projection — `PROPOSED`; consumes ONB-007 exact progress/no-ETA contract.
- ONB-009 / #194 — onboarding lifecycle commands — `PROPOSED`; destructive commands remain ONB-019/020/021-owned.
- ONB-010 / #195 — Angular onboarding/Home re-entry — `PROPOSED`; consumes ONB-007 presentation constraints.
- ONB-011 / #199 — import persistence/coverage — `PROPOSED`; coordinates with ONB-017/019 and consumes ONB-007 telemetry/write-budget requirements.
- ONB-012 / #200 — durable import worker/API — `PROPOSED`; initial 1s/15s/2m/30s loop defaults and one executor.
- ONB-013 / #201 — Lichess adapter — `PROPOSED`; initial 14-day windows, serial access, and 100-row writes.
- ONB-014 / #202 — Chess.com adapter — `PROPOSED`; serial monthly archives, cache validators, and 100-row writes.
- ONB-015 / #203 — sync cutover/preparation handoff — `PROPOSED`; current immediate account deletion cannot be final before this cutover.
- ONB-019 / #259 — destructive lifecycle operation/fence/guard/failure-state/audit/provenance/receipt foundation — `PROPOSED`.
- ONB-020 / #260 — account/game destructive coordinator — `PROPOSED`; starts with at most 100 games per transaction and operation-specific validation.
- ONB-021 / #261 — whole-user deletion and mobile purge handshake — `PROPOSED`; consumes the same transaction/lock budgets.
- ONB-023 / #273 — Angular administrator diagnostics — `PROPOSED`; depends on ONB-022 and Visual Transformation coordination.
- ONB-024 / #274 — administrator lifecycle adapters — `PROPOSED`; depends on ONB-022/023 and applicable ONB-019/020/021/026 services plus proven reverification.
- ONB-026 / #280 — bounded orphan shared-position cleanup — `PROPOSED`; consumes ONB-006/007 and remains behind trigger/version/schema/audit coordination gates.

ONB-025 / #276 remains reserved by open PR #279.

These tasks must not be claimed until their task-file dependencies are resolved and accepted.

## Critical findings

- current first provider sync remains synchronous and unbounded;
- current cursor is not exact coverage;
- provider persistence can currently advance past record failures;
- current provider adapters use per-game existence lookup plus insert; durable adapters must use duplicate-safe bounded bulk writes;
- current account workflow still moves candidate ID arrays through Angular;
- the imported-game worker already supplies priority, fencing, cancellation, stale recovery, and idempotent executors;
- the worker executes one imported-game task at a time; slice 25 is a scheduling yield boundary, not concurrency;
- every current analysis/process task creates and disposes a fresh engine;
- measured fresh WASM first-position startup is roughly 283–294 ms and is material, but reuse remains deferred pending production evidence and isolation tests;
- current account deletion is one immediate unfenced cascade;
- terminal job status is not drain proof because a cancelled running task deliberately retains `workKey` until executor acknowledgement;
- current synchronous provider sync has no persisted claim that deletion can drain;
- direct synchronous writers need commit-side fence serialization, not only route admission checks;
- current `clearPlyRowsForGame` is not a complete un-index operation;
- analysis evidence spans game runs, snapshots, ply fields, AI review, tags, tactical rows, and shared PositionAnalysis;
- tags are a mixed projection and must be recomputed after reset;
- scenario sessions copy personal game context and survive imported-game cascade through `SetNull`, so purge must delete them before those source links are nulled;
- opening provenance is absent;
- `OAuthLoginState` has no AppUser foreign key;
- ordinary external-user upsert can recreate a deleted AppUser unless active deletion and tombstones are checked before provisioning;
- mobile sign-out locks offline data rather than deleting it;
- account purge can retain terminal import history while clearing current coverage/frontiers;
- partial destructive failure must retain its durable resource fence;
- post-delete status retrieval cannot depend on recreating the user;
- shared Position cleanup must remain separate from account/user purge;
- current administrator authorization/read model is not implemented;
- current Angular navigation is static and contains no administrator capability state;
- current API deployment documentation does not guarantee one replica, so in-process rate limiting cannot be treated as distributed enforcement;
- current auth request context does not yet retain the signed session/factor/reverification fields required by administrator execution;
- CI-local provider/database/engine timings are evidence for initial configuration and budgets, not a public production ETA.

## Blockers to production implementation

- ONB-007 is complete; its consumers retain implementation-specific telemetry, controlled-clock, concurrency, and canary validation responsibilities;
- ONB-011/012/013/014/015 have not delivered durable provider import and cutover;
- ONB-017/018 have not delivered preparation execution/control;
- ONB-019/020/021 have not delivered lifecycle persistence/execution/user deletion;
- ONB-022/023 have not delivered read-only administrator API/UI;
- ONB-024 remains blocked by canonical lifecycle services and a proven signed reverification flow;
- onboarding projection/UI tasks remain blocked by durable foundations;
- production-like Neon/provider/local-binary telemetry does not exist yet, so public ETA and capacity expansion remain disabled;
- ONB-026 shared-position cleanup implementation has not been delivered;
- Visual Transformation coordination remains required for final UI.

## Validation

### ONB-006 documentation-only research

- inspected current Position relations, migration delete rules, indexing, analysis, opening-explorer, worker, and maintenance-script patterns;
- verified official PostgreSQL lock conflicts, command snapshots, transition relations, trigger transaction behavior, and local lock timeout semantics;
- compared predicate-only, application/advisory coordination, and explicit database-lock approaches;
- first self-review corrected the maintenance lock order to plies-first;
- second self-review corrected application-only grace reset, match-limited scans, point-snapshot dry-run wording, missing manual invocation, and incomplete canonical reconciliation;
- allocated and synchronized ONB-026/#280;
- reconciled over merged ONB-005 records and current main without changing runtime code, schema, migration, dependency, worker, deployment, or production deletion behavior;
- local clone/build remained unavailable because this runtime could not resolve `github.com`; GitHub status and diff validation are authoritative for this documentation-only change.

### ONB-005 documentation-only research

- verified current queue, issue, branch, PR, review-thread, and collision state;
- reset the original branch onto current `main` after ONB-007 merged;
- inspected current API auth configuration/plugin/request context, app factory, central route registration, representative Zod/OpenAPI modules, jobs, schema, contracts, and tests;
- inspected current Angular routes, static navigation, auth service/guard/interceptor, API service, feature data-access, signal-store, and responsive/accessibility patterns;
- inspected current hosted Render/Neon/Vercel deployment documentation;
- verified current official Clerk session-token V2, authorized-party, custom-claim, reverification, and active-Organization authorization behavior;
- first self-review corrected stale base state, insufficient repository inspection, unproven recent-auth claims, Organization-role misuse, over-broad data scope, rate-limit overclaiming, retention/key-rotation ambiguity, and under-specified implementation tasks;
- second self-review corrected implementation-task ordering, deployment-topology assumptions, and a residual display-label projection;
- third self-review corrected missing `DECISIONS.md`, `OPEN_QUESTIONS.md`, `ROADMAP.md`, and `STATUS.md` reconciliation, finalized task promotion/queue state, and reverified Clerk assumptions;
- allocated and synchronized ONB-022/#272, ONB-023/#273, and ONB-024/#274;
- no production code, schema, migration, dependency, workflow, worker, authentication, deployment, or UI behavior changed;
- local clone/build remained unavailable because this runtime could not resolve `github.com`; GitHub Actions is the authoritative repository gate.

### ONB-007 research and benchmark

- verified queue, issue, branch, PR, and collision state;
- reinspected current provider, job, index, tag, analysis, worker, deployment, test, and progress paths;
- added `apps/api/benchmarks/onboarding-throughput-safe.mjs`, which refuses remote, non-disposable, or non-empty databases and makes no provider calls;
- measured synthetic provider persistence, job admission, direct index/tag, depth-1/depth-12 analysis, combined process, and actual worker waves;
- committed environment, p50/p90, source-run, artifact-ID, digest, and limitation evidence;
- CI run `30786132287` / #1840 passed the original benchmark and repository gates;
- corrected benchmark CI `30877363202` / #1905 passed lint, build, all opening audits, architecture guardrails, migrations, corrected benchmark artifact upload, and the full test suite;
- final standard CI `30878078284` / #1912 passed lint, build, all opening audits, architecture guardrails, migrations, and the full test suite on head `ee765cac67d12bbd5e41926d6eed9fa1b50fa4bb`;
- separated provider-network, Neon, Render local-binary, multi-worker, end-to-end preparation, and lifecycle/cleanup performance from measured claims;
- no production runtime behavior, schema, migration, dependency, provider load, worker count, deployment, or user-facing ETA changed;
- local clone remained unavailable because this runtime could not resolve `github.com`.

### ONB-004 documentation-only research

- queue, issue, branch, PR, review-thread, and collision state verified;
- current Prisma relations and relevant migrations inspected;
- account delete, sync cursor reset, OAuth connection, and user resolver inspected;
- job claim/cancel/work-key/stale recovery behavior inspected;
- index, analysis, tag, tactical, AI review, and scenario writes traced;
- course/training ownership cascades inspected;
- mobile local-user/offline/outbox cascade and sign-out behavior inspected;
- running durable and synchronous writers, partial reset/failure, account purge/delete, whole-user deletion, auth recreation, post-delete polling, mobile offline devices, restart, and large-data scenarios modelled;
- first self-review corrected commit-side synchronous writer fencing and terminal import-history retention during account purge;
- second self-review corrected scenario source-preservation order, post-mutation cancellation/failure fence retention, active-fence auth behavior, tombstone ordering, and post-delete receipt lookup;
- ONB-019/#259, ONB-020/#260, and ONB-021/#261 allocated and hardened;
- final GitHub Actions CI run `30748024881` / #1804 passed lint, build, audits, architecture guardrails, migrations, and the full test suite on head `16947156e40f292e4aa5e6597c814ad4c9f36bb8`;
- PR #263 squash-merged as `32db655a100ef1a55264b4d3739e2b7c38e72ee4`;
- no production code, schema, migration, route, worker, provider, Angular, mobile, dependency, workflow, or deployment behavior changed;
- local clone/build/tests were unavailable because this runtime could not resolve `github.com`.

## Next deterministic action

Claim ONB-022 / #272 next after its required authentication, topology, and actor-key collision review. ONB-017 / #253 remains active; ONB-026 / #280 remains dependency-gated and `PROPOSED`.
