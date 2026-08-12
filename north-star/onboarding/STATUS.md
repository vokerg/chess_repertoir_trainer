# Onboarding and Data Lifecycle Status

Last updated: 2026-08-11

## Program state

`IMPLEMENTATION_IN_PROGRESS`

Program tracker: [#147](https://github.com/vokerg/chess_repertoir_trainer/issues/147)

Foundation: ONB-000 squash-merged through [PR #156](https://github.com/vokerg/chess_repertoir_trainer/pull/156)

Lifecycle contract: ONB-001 squash-merged through [PR #197](https://github.com/vokerg/chess_repertoir_trainer/pull/197)

Bounded import/backfill contract: ONB-002 squash-merged through [PR #204](https://github.com/vokerg/chess_repertoir_trainer/pull/204)

Preparation orchestration: ONB-003 squash-merged through [PR #256](https://github.com/vokerg/chess_repertoir_trainer/pull/256) as `d41f75c080cd19ad106b2143acecd3b0606adacb`

Preparation execution boundary: ONB-017 runtime squash-merged through [PR #282](https://github.com/vokerg/chess_repertoir_trainer/pull/282) as `885ef785bdac1b0c77cc500e3345745b0e723912`; completion records reconciled through PR #293.

Durable account-import persistence: ONB-011 runtime merged through [PR #339](https://github.com/vokerg/chess_repertoir_trainer/pull/339) as `4c04d47dac40aa0ae254babbf65449b701b5c447`; persisted destructive lifecycle fences remain ONB-019-owned.

Durable account-import worker/API lifecycle: ONB-012 runtime squash-merged through [PR #352](https://github.com/vokerg/chess_repertoir_trainer/pull/352) as `640018e4cd3c5528a94b9d0217e971ab2a2215b7`; completion records are reconciled through PR #354. The provider executor registry remains intentionally empty until ONB-013/014.

Destructive lifecycle: ONB-004 squash-merged through [PR #263](https://github.com/vokerg/chess_repertoir_trainer/pull/263) as `32db655a100ef1a55264b4d3739e2b7c38e72ee4`.

Throughput/progress: ONB-007 squash-merged through [PR #266](https://github.com/vokerg/chess_repertoir_trainer/pull/266) as `d6313823bd7da36991972a804f59d47d77578bdf` after corrected benchmark evidence and three self-review rounds.

Administrator architecture: ONB-005 completed through [PR #275](https://github.com/vokerg/chess_repertoir_trainer/pull/275) after three self-review rounds.

Administrator read-only foundation: ONB-022 runtime squash-merged through [PR #284](https://github.com/vokerg/chess_repertoir_trainer/pull/284) as `f83d26157e5da2d69f643b0d12100244219d2771`; completion records reconciled through PR #298 as `04e77e2e3f4575b260bca26cadbfec6129187552`.

Administrator diagnostics Angular feature: ONB-023 runtime squash-merged through [PR #307](https://github.com/vokerg/chess_repertoir_trainer/pull/307) as `07d19790a20beedf79bb094fead2c48c76404912`; completion records are reconciled by PR #312.

Shared-position cleanup research: ONB-006 completed through [PR #281](https://github.com/vokerg/chess_repertoir_trainer/pull/281) after two adversarial self-review rounds.

Lightweight experience blueprint: ONB-016 squash-merged through [PR #225](https://github.com/vokerg/chess_repertoir_trainer/pull/225)

Next unclaimed `READY` onboarding tasks: ONB-013 / #201 and ONB-014 / #202. Their contracts permit parallel provider-adapter execution after ONB-012 completion; neither is claimed by the completion reconciliation.

Latest report: `reports/ONB-012-2026-08-11-completion-reconciliation.md`

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

### ONB-017

- `DataPreparationRun`, ordered account target, and retained preparation batch persistence;
- immutable recipe/scope/range snapshots with nullable current-import and child-job links;
- PostgreSQL lifecycle constraints and partial unique indexes for one non-terminal run per user and one active batch per run/stage;
- database triggers retaining aggregate child evidence before job retention clears links;
- configurable 50/50/3/10 wave defaults and 4/200/40 global admission caps;
- bounded database-side ownership, scope, range, evidence, retry, active-work, and newest-first candidate selection;
- one short globally serialized parent-locked transaction for capacity recount, candidate selection, and atomic batch/job/task creation;
- direct-user priority above all preparation lanes;
- immutable denominators, retained terminal evidence, and queue/settlement telemetry;
- ONB-019 admission-guard seam without lifecycle persistence or destructive-safety overclaim;
- exact implementation head `c226f15b9c75c6fb4cea3072828842d728b9eb5a` and final CI run 1994 (`30898278426`).

Runtime squash-merged through PR #282 as `885ef785bdac1b0c77cc500e3345745b0e723912`. PR #293 preserved the original task contract and reconciled the task, queue, status, and completion evidence. Issue #253 was closed as completed after the reconciliation squash merge.

### ONB-011

- durable provider-neutral `ImportRun` persistence with explicit `LEGACY_SYNC` compatibility;
- canonical versioned import scope hashes and immutable requested ranges;
- exact contiguous `AccountImportCoverage` without cursor-derived overclaiming;
- one non-terminal import per account and exact active-claim projection;
- bounded duplicate-safe game persistence and coverage primitives;
- retry lineage and replaceable lifecycle admission-guard seam;
- no provider traversal, worker loop, Angular, or destructive lifecycle persistence.

Runtime merged through PR #339 as `4c04d47dac40aa0ae254babbf65449b701b5c447`; issue #199 is completed. ONB-019 remains owner of persisted destructive lifecycle fences and audit persistence.

### ONB-012

- authenticated ownership-scoped create/list/detail/pause/resume/cancel/retry account-import API;
- durable globally serialized claim, exact work-key heartbeat/checkpoint/settlement fencing, retry-at deferral, and stale recovery;
- one global provider execution lane in the existing worker process with provider I/O outside database transactions;
- safe pause/cancel acknowledgement, non-cooperative-executor stale fallback, settlement-failure containment, and bounded shared-worker shutdown;
- exact active-claim/drain projection consumed by ONB-020;
- one starvation-safe provider-neutral lifecycle-fence admission seam consumed by ONB-019;
- stable `ACCOUNT_IMPORT_ADMISSION_BLOCKED` conflict handling;
- monotonic durable completed-window progress and fixed denominator initialization;
- linked retry mode/scope/range lineage and conservative full-range coverage completion;
- queue/stage/heartbeat/cancellation telemetry without raw personal payloads;
- no provider adapter, Angular, lifecycle-operation persistence, broker/new deployment, parallel provider execution, or generic `JobRun`/`JobTask` change.

Final refreshed runtime head `dc4e9bc40e9da45c03e83904dfe0864a10cef289` passed CI #2645 (`31505680257`). PR #352 squash-merged into `main` as `640018e4cd3c5528a94b9d0217e971ab2a2215b7`. Completion PR #354 synchronizes the task, queue, status, completion evidence, issue closure, and promotion of ONB-013/014 to unclaimed `READY`.

### ONB-022

- disabled-by-default server-only administrator configuration;
- exact Clerk-subject allowlist behind one replaceable `AdminAuthorizationPolicy`;
- normalized verified-session evidence while preserving normal user-owned `RequestAuth` behavior;
- versioned domain-separated pseudonymous administrator actor and target keys;
- bounded `GET /api/admin/me`, `/api/admin/users`, `/api/admin/users/:userId`, and `/api/admin/users/:userId/work` routes;
- opaque versioned `AppUser.id DESC` keyset cursors with default 25 and maximum 100 rows;
- database-aggregated account, game, course, training, import, job, preparation, and approved row-count diagnostics without per-user N+1 queries;
- explicit unavailable sections and ONB-007 warnings with exact evidence and no ETA/SLA;
- injectable `AdminRequestBudget` seam that emits `429` only when a real enforcing implementation is injected;
- structured pseudonymous security logs and strict sensitive-field exclusions;
- no Prisma schema/migration, Angular UI, lifecycle mutation, persisted mutation audit, distributed limiter persistence, broker, or new service.

Final runtime pull-request head `fad7a19216c3249827a111e75238aafccac0ec75` passed CI run #2089 (`31031618906`). PR #284 squash-merged as `f83d26157e5da2d69f643b0d12100244219d2771`. Refreshed completion head `3d1ec5e84baa34dfa37d0d13f81f4b28e5ba4736` passed CI #2201 (`31197631342`) and PR #298 squash-merged as `04e77e2e3f4575b260bca26cadbfec6129187552`, closing issue #272 completed and promoting ONB-023 to `READY`.

### ONB-023

- lazy protected `/admin` direct-link route using the existing sign-in `authGuard` only;
- capability bootstrap from `GET /api/admin/me`, leaving administrator authorization entirely server-owned;
- typed feature-local data access and page-scoped signal state;
- stale-response protection across capability, pagination, detail, and work loads;
- cursor-bounded user pages that replace rather than accumulate results;
- failed next-page cursor preservation so retry targets the failed page;
- bounded user detail and work diagnostics with explicit loading, empty, partial, forbidden, unavailable, stale, and error states;
- exact ONB-007 warning evidence without ETA or SLA language;
- unchanged static main navigation and direct-link/bookmark operator entry;
- focused route, auth-return, API, store, component, table-semantic, keyboard/focus, unavailable-state, and pagination-retry tests;
- no client administrator identity/role/claim rule, destructive control, impersonation, raw-content browser, new global state framework, or backend/schema change.

Final runtime pull-request head `d9b826054748d9d891584a593954c82b65520965` passed CI run #2237 (`31248860891`). PR #307 squash-merged as `07d19790a20beedf79bb094fead2c48c76404912`. Runtime self-review found and fixed the failed-next-page retry defect before final CI. Completion PR #312 synchronizes the canonical task, queue, status, report, and live issue metadata without changing runtime behavior.

## Active and ready work

### Active implementation

- None recorded by this completion reconciliation.

### Ready implementation

- ONB-013 / #201 — bounded Lichess import adapter — `READY`, unclaimed; initial 14-day windows, serial access, 100-row writes, and the existing ONB-019 admission seam.
- ONB-014 / #202 — bounded Chess.com import adapter — `READY`, unclaimed; serial calendar-month archives, cache validators, 100-row writes, and the existing ONB-019 admission seam.

The provider adapters may execute in parallel after a fresh live collision check. This reconciliation claims neither task.

## Allocated implementation backlog

- ONB-018 / #254 — preparation reconciliation/control — `PROPOSED`; consumes ONB-007 reconcile/first-analysis/stall defaults.
- ONB-008 / #193 — disposition/readiness projection — `PROPOSED`; consumes ONB-007 exact progress/no-ETA contract.
- ONB-009 / #194 — onboarding lifecycle commands — `PROPOSED`; destructive commands remain ONB-019/020/021-owned.
- ONB-010 / #195 — Angular onboarding/Home re-entry — `PROPOSED`; consumes ONB-007 presentation constraints.
- ONB-015 / #203 — sync cutover/preparation handoff — `PROPOSED`; current immediate account deletion cannot be final before this cutover.
- ONB-025 / #276 — authenticated stale-account refresh trigger — `PROPOSED`; depends on accepted ONB-015 and reuses the durable account-import lifecycle without request-time provider traversal.
- ONB-019 / #259 — destructive lifecycle operation/fence/guard/failure-state/audit/provenance/receipt foundation — `PROPOSED`.
- ONB-020 / #260 — account/game destructive coordinator — `PROPOSED`; starts with at most 100 games per transaction and operation-specific validation.
- ONB-021 / #261 — whole-user deletion and mobile purge handshake — `PROPOSED`; consumes the same transaction/lock budgets.
- ONB-024 / #274 — administrator lifecycle adapters — `PROPOSED`; depends on completed ONB-022/023 plus applicable ONB-019/020/021/026 services and proven reverification.
- ONB-026 / #280 — bounded orphan shared-position cleanup — `PROPOSED`; consumes ONB-006/007 and remains behind trigger/version/schema/audit coordination gates.

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
- read-only administrator API runtime and completion reconciliation are delivered through ONB-022 / PRs #284 and #298;
- administrator Angular diagnostics runtime is delivered through ONB-023 / PR #307, with completion reconciliation in PR #312;
- main navigation remains static and intentionally has no required administrator entry; administrator capability state remains feature-local;
- current API deployment documentation does not guarantee one replica, so in-process rate limiting cannot be treated as distributed enforcement;
- current auth request context retains the signed session/factor/reverification fields needed by future administrator execution adapters, but no mutation execution is enabled;
- CI-local provider/database/engine timings are evidence for initial configuration and budgets, not a public production ETA.

## Blockers to production implementation

- ONB-007 is complete; its consumers retain implementation-specific telemetry, controlled-clock, concurrency, and canary validation responsibilities;
- ONB-011 and ONB-012 are delivered; ONB-013/014 are ready but have not delivered durable provider adapters, and ONB-015 has not delivered the cutover;
- ONB-017 delivered the preparation execution boundary; ONB-018 has not delivered preparation reconciliation/control;
- ONB-019/020/021 have not delivered lifecycle persistence/execution/user deletion;
- ONB-022 and ONB-023 delivered the read-only administrator API and administrator diagnostics Angular feature;
- ONB-024 remains blocked by canonical lifecycle services and a proven signed reverification flow, not by the completed ONB-023 UI;
- onboarding projection/UI tasks remain blocked by durable foundations;
- production-like Neon/provider/local-binary telemetry does not exist yet, so public ETA and capacity expansion remain disabled;
- ONB-026 shared-position cleanup implementation has not been delivered;
- ONB-025 stale-refresh automation remains blocked by ONB-015 durable sync cutover;
- Visual Transformation coordination remains required for final product-wide UI polish.

## Validation

### ONB-012 implementation and completion reconciliation

- runtime PR #352 delivered the provider-neutral account-import command/read API, globally serialized claim lifecycle, exact work-key fencing/drain, pause/cancel/retry/retry-at/stale recovery, one provider-neutral executor registry, one lifecycle-fence admission seam, safe shared-worker shutdown, telemetry, and focused contract/PostgreSQL/worker regressions;
- three append-only adversarial review reports corrected exact persistence/coverage fencing, schema/counter drift, settlement resilience, control stale fallback, peer-worker shutdown bounds, retry lineage, starvation-safe future fence admission, typed conflict handling, and monotonic/fixed-denominator progress;
- third-review code/test head `f0c29cbddd89c6d658ec3c03cff26e3bac8e5fa7` passed CI #2641 (`31480536544`);
- third-review evidence head `64e1d63bee671cf75868f89e11b6d417bc929d95` passed CI #2643 (`31481147692`) across lint, full build, architecture/hygiene, migrations, all opening audits, and complete monorepo tests;
- the implementation branch was refreshed over then-current `main` / RH-003; final runtime head `dc4e9bc40e9da45c03e83904dfe0864a10cef289` passed CI #2645 (`31505680257`);
- PR #352 squash-merged into `main` as `640018e4cd3c5528a94b9d0217e971ab2a2215b7` on 2026-08-11;
- PR #354 is documentation/execution-state reconciliation only: it synchronizes the task, queue, status, completion report, issue closure, and unclaimed promotion of ONB-013/014 without runtime changes.

### ONB-023 implementation and completion reconciliation

- implementation PR #307 introduced the lazy `/admin` route, typed feature-local administrator data access, page-scoped signal state, bounded cursor pagination, user detail/work diagnostics, explicit forbidden/unavailable/partial/error states, exact warning evidence, and focused route/store/component/accessibility coverage;
- Angular retained the normal `authGuard` only for sign-in and did not encode administrator identities, roles, claims, or capability rules; every administrator request remains authorized by the API;
- implementation self-review found one pagination recovery defect: retry after a failed next-page request would reload the last successful cursor page;
- the runtime branch was corrected to preserve and retry the failed cursor/page, with regression coverage added before merge;
- final runtime pull-request head is `d9b826054748d9d891584a593954c82b65520965`;
- final runtime CI run #2237 (`31248860891`) passed dependency installation, lint, the full repository build including the lazy administrator chunk, opening audits, architecture and accessibility guardrails, the migration chain, imported-game audits, the full test suite, artifact handling, and cleanup on that exact head;
- PR #307 squash-merged as `07d19790a20beedf79bb094fead2c48c76404912`, changing 22 files with 1,825 additions and no deletions;
- PR #312 is documentation/execution-state reconciliation only and synchronizes the task, queue, status, completion report, and issue metadata; no runtime, API, schema, Angular, lifecycle, dependency, workflow, or infrastructure change is included;
- local clone/build is not claimed for this reconciliation; GitHub connector evidence and repository CI are authoritative for the docs-only completion change.

### ONB-022 implementation and completion reconciliation

- implementation PR #284 introduced the administrator configuration, authorization policy, verified-session context, domain-separated actor/target keys, shared contracts, four bounded OpenAPI routes, aggregate diagnostics, request-budget seam, structured security logs, and focused tests;
- adversarial self-review corrected manual route parsing, incomplete 400 schemas, missing active import counts, request-budget overclaiming, HMAC-domain collision risk, pre-authorization target lookup, invented zeroes, and incomplete query-plan/startup/sensitive-field/non-enumeration coverage;
- final runtime pull-request head is `fad7a19216c3249827a111e75238aafccac0ec75`;
- final runtime CI run #2089 (`31031618906`) passed dependency installation, lint, the full monorepo build, opening and imported-game audits, architecture guardrails, the complete migration chain, the full test suite, artifact upload, and runner cleanup on that exact head;
- PR #284 squash-merged as `f83d26157e5da2d69f643b0d12100244219d2771` and changed 24 files without a Prisma schema or migration;
- the first completion-reconciliation draft was inadequate because it added only one report, left the task/queue/status ledgers unchanged, and incorrectly identified unrelated Activity Feed commit `7507f3cc12be1b9cd88f67bc5e019ded0deadfb0` as the ONB-022 runtime merge;
- CI run #2140 passed the superseded one-file draft at `b8e7a23224aff363446840cf99d9f0d0dce2c3ae`; it is historical only;
- CI run #2141 (`31094431988`) passed the first corrected multi-file head `cc68fc55822d3bcacd16c42629a319537d9db2ce`;
- CI run #2145 (`31096659920`) passed the second-review head `99f20c63e238a985fd4eafca641ab1b35a8c9894`;
- a full review found that ONB-023 had been promoted in queue/status records while its own task file remained `PROPOSED`, issue #272 live metadata still advertised `READY`, the branch was stale and retained superseded mistakes in three commits, and `4c8018cc…` / CI #2074 was incorrectly presented as final runtime evidence despite fourteen later PR commits;
- PR #298 was rebuilt as one clean commit on main `90ea23965b5a4ce032ca9b75d837e4e3dfff58ab`, producing final head `3d1ec5e84baa34dfa37d0d13f81f4b28e5ba4736` with one commit ahead and zero behind;
- exact-head CI #2201 (`31197631342`) passed dependency installation, lint, full build, generated and imported-game opening audits, architecture guardrails, migrations, full tests, artifact handling, and cleanup;
- PR #298 squash-merged as `04e77e2e3f4575b260bca26cadbfec6129187552`, issue #272 closed completed, and issue #273 was synchronized to `READY`;
- local clone/build remains unavailable because this runtime cannot resolve or connect to `github.com`; no local result is claimed.

### ONB-017 implementation and completion reconciliation

- implementation PR #282 introduced the preparation persistence, constraints, bounded candidate selection, globally serialized admission, retention evidence, configuration, and focused tests;
- adversarial implementation self-review corrected provider-shaped speed/variant aliases, failed-evidence-only retries, cancellation-lease filtering, active-stage index coverage, and both direct-user/preparation race orderings;
- exact implementation head is `c226f15b9c75c6fb4cea3072828842d728b9eb5a`;
- final implementation CI run 1994 (`30898278426`) passed lint, build, architecture guardrails, the complete PostgreSQL migration chain, audits, and the full test suite;
- PR #282 squash-merged as `885ef785bdac1b0c77cc500e3345745b0e723912`;
- the first completion-reconciliation draft was incomplete because it changed only the task file, removed the original scope/acceptance/validation contract, left queue/status records stale, and recorded an incorrect implementation-head SHA;
- corrected PR #293 preserved the full task contract, recorded exact evidence, synchronized `TASKS.md` and `STATUS.md`, and closed issue #253 as completed after squash merge;
- initial reconciliation CI run 2098 passed before the self-review corrections;
- CI run 2110 exposed unnecessary concurrent fixture setup that exhausted Prisma's five-second interactive transaction timeout before admission assertions began;
- final corrected CI run 2114 (`31077878915`) passed dependency installation, lint, the full monorepo build, opening and imported-game audits, architecture guardrails, the complete PostgreSQL migration chain, the full test suite including the default-200-task regression, and artifact upload on exact head `e315eee560adfa9ba9a88e6baa2a212d1a86244e`;
- local clone/build remains unavailable because this runtime cannot resolve or connect to `github.com`; no local result is claimed.

### ONB-006 documentation-only research

- inspected current Position relations, migration delete rules, indexing, analysis, opening-explorer, worker, and maintenance-script patterns;
- verified official PostgreSQL lock conflicts, command snapshots, transition relations, trigger transaction behavior, and local lock timeout semantics;
- compared predicate-only, application/advisory coordination, and explicit database-lock approaches;
- first self-review corrected the maintenance lock order to plies-first;
- second self-review corrected application-only grace reset, match-limited scans, point-snapshot dry-run wording, missing manual invocation, and incomplete canonical reconciliation;
- allocated and synchronized ONB-026/#280;
- reconciled over merged ONB-005 records and current main without changing runtime code, schema, migration, dependency, worker, deployment, or production deletion behavior;
- local clone/build remained unavailable because this runtime cannot resolve `github.com`; GitHub status and diff validation are authoritative for this documentation-only change.

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
- local clone/build remained unavailable because this runtime cannot resolve `github.com`; GitHub Actions is the authoritative repository gate.

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

ONB-013 / #201 and ONB-014 / #202 are the unclaimed `READY` provider-adapter tasks after ONB-012 completion. Their contracts allow parallel execution after a fresh live collision check and explicit coordination with the existing ONB-019 admission seam. Do not infer a claim from promotion alone. ONB-015 / #203 remains `PROPOSED` behind both adapters, and ONB-025 / #276 remains `PROPOSED` behind ONB-015.