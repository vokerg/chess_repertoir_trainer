# Onboarding and Data Lifecycle Roadmap

Last updated: 2026-08-07

Program: [#147](https://github.com/vokerg/chess_repertoir_trainer/issues/147)

## Critical path

```text
ONB-001 lifecycle/default recipe — DONE
        +
ONB-002 durable bounded import/backfill — DONE
        +
ONB-003 progressive preparation orchestration — DONE
        +
ONB-007 throughput/progress evidence — DONE
        ↓
ONB-011 import persistence/coverage
        +
ONB-017 preparation execution persistence/batches — DONE
        ↓
ONB-012 import worker/API lifecycle
        ↓
ONB-013 Lichess adapter + ONB-014 Chess.com adapter
        ↓
ONB-015 sync cutover/preparation handoff
        +
ONB-018 preparation reconciliation/control
        ↓
ONB-008 disposition/readiness projection
        ↓
ONB-009 lifecycle commands
        ↓
ONB-010 functional onboarding and Home re-entry
        +
ONB-016 lightweight experience blueprint — DONE
        ↓
Visual/accessibility integration with #133
        ↓
Production onboarding release
```

ONB-017 is complete through runtime PR #282 and completion reconciliation PR #293. Full ONB-018 delivery still requires durable import and preparation handoff. ONB-025 / #276 is a post-ONB-015 stale-account-refresh follow-up and does not gate the initial durable sync cutover or onboarding release.

Supporting administration and data-lifecycle path:

```text
ONB-004 destructive invariants — DONE
        +
ONB-005 administrator architecture — DONE
        ├──────────────→ ONB-022 server authorization/read-only diagnostics — DONE
        │                              ↓
        │                    ONB-023 Angular diagnostics — READY
        │                              +
        └→ ONB-019 operation/fence/audit/provenance foundation
                               ↓
                    ONB-020 account/game coordinator
                               ↓
                    ONB-021 whole-user/mobile purge
                               +
                    ONB-006 cleanup research — DONE
                               ↓
                    ONB-026 bounded orphan cleanup implementation
                               ↓
                    ONB-024 administrator lifecycle adapters
```

ONB-022 is complete through runtime PR #284 and completion reconciliation PR #298; ONB-023 is the next unclaimed `READY` administrator task and still requires Visual Transformation coordination before claim. ONB-024 waits for the applicable canonical lifecycle or cleanup service and never creates a parallel destructive state machine. ONB-006 completed the separate shared-position cleanup research; ONB-026 owns implementation and deletes only database-proved orphans without touching course `MoveNode` evidence. ONB-007 supplies transaction/lock budget envelopes; ONB-026/020/021 still prove their operation-specific batch sizes.

## Phase 0 — Program foundation

Status: `DONE` through squash-merged PR #156.

Delivered:

- canonical planning workspace;
- current-state inspection;
- master plan;
- initial decisions/open questions;
- agent execution rules;
- program and research issue mapping.

## Phase 1 — Research and contracts

### P0 critical path

- ONB-001 / #148 — lifecycle/default recipe — `DONE` through PR #197.
- ONB-002 / #149 — bounded import/backfill — `DONE` through PR #204.
- ONB-003 / #150 — preparation orchestration — `DONE` through PR #256.
- ONB-004 / #151 — destructive lifecycle — `DONE` through PR #263.
- ONB-007 / #154 — throughput/progress — `DONE` through squash-merged PR #266 as `d631382`.

### P1 supporting

- ONB-005 / #152 — administrator architecture — `DONE` through PR #275 after three self-review rounds.
- ONB-006 / #153 — orphan cleanup — `DONE` through PR #281 after two adversarial self-review rounds; allocated ONB-026 / #280.
- ONB-016 / #224 — lightweight product/experience blueprint — `DONE` through PR #225.

### Contracts available to consumers

ONB-001:

- user disposition plus repeatable preparation runs;
- one selected-account first run;
- fixed recent standard blitz/rapid recipe;
- import/index core-completion gate;
- progressive analysis and feature-specific readiness;
- Home plus resumable onboarding;
- exact progress without ETA.

ONB-002:

- durable account/scope import coverage;
- half-open UTC ranges and distinct initial/forward/backfill modes;
- one non-terminal import per account;
- replayable provider windows;
- bounded duplicate-safe persistence;
- database preparation handoff;
- explicit backfill rather than raw cursor reset.

ONB-003:

- preparation run/target/batch persistence;
- bounded index/analysis child jobs;
- server-side candidate selection and atomic admission;
- committed-import pipelining;
- first-analysis and stage fairness;
- acknowledged controls and evidence-based readiness.

ONB-004:

- five distinct destructive actions;
- durable preview/idempotency/audit operations and persisted write fences;
- acknowledged preparation/import/job drain including zero active task work keys;
- forward-only bounded phases and durable fence retention after partial execution;
- un-index implies un-analysis;
- shared Position/PositionAnalysis/cache retention;
- tag recomputation and exact AI/tactical/scenario rules;
- opening provenance;
- account purge/delete and independent OAuth boundary;
- whole-user OAuth-state/token cleanup, identity tombstone, post-delete receipt, and mobile purge receipt;
- ONB-019/020/021 allocation.

ONB-005:

- Clerk remains the sole production authentication boundary;
- administrator capability is a disabled-by-default server-only policy after verified authentication;
- exact subject allowlist bootstrap sits behind a replaceable authorization interface;
- production `dev-single-user`, shared secrets, email allowlists, `AppUser.isAdmin`, client roles, impersonation, second login, and Organizations solely for global operators are rejected;
- read-only diagnostics are migration-free, cursor-bounded, database-aggregated, partial-aware, and exclude sensitive identity/chess/auth payloads;
- the Angular feature is a lazy direct-link route with API authority and no required static-navigation item;
- destructive administrator execution requires canonical lifecycle services, valid preview, typed confirmation, idempotency, recent signed `fva`, and one-use request-bound `reverification_id`;
- administrator whole-user deletion remains disabled pending separate policy;
- read-access and mutation-audit initial retention defaults are configurable 30/365 days with explicit production confirmation and versioned domain-separated HMAC keys;
- request budgets must match verified API replica topology;
- ONB-022/023/024 allocation at orders 190/200/210.

ONB-006:

- zero `ImportedGamePly` references as the exact orphan predicate;
- dependent `PositionAnalysis` and `MastersExplorerCache` cascades, with course `MoveNode` explicitly excluded;
- a dedicated first-observed candidate ledger and initial 30-day grace;
- same-transaction PostgreSQL statement-trigger reset on every ply-reference insert/update;
- input-page-bounded reconcile, observe, dry-run, and execute traversal with at most 500 rows inspected per transaction initially;
- plies-first fixed maintenance locks followed by final `NOT EXISTS` recheck and FK backstop;
- observational bounded dry-run semantics, exact execution counters, no ETA or reclaimed-byte claim;
- manual server-side command over one canonical service, disabled by default and unscheduled;
- ONB-026/#280 implementation allocation.

ONB-007:

- safe disposable-database benchmark harness and committed p50/p90 evidence;
- 50-game index waves, three-game first analysis, one-game small-account fallback, and 10-game analysis tail;
- four non-terminal batches, 200 queued tasks, and 40 queued analysis tasks globally;
- existing 25-task worker slice retained as scheduling fairness, not product wave;
- one-second active/five-second idle preparation reconciliation with immediate persisted wake hints;
- one serial import executor, 14-day Lichess windows, Chess.com calendar-month units, and 100-row writes;
- 1-second poll, 15-second heartbeat, 2-minute stale, and 30-second recovery import defaults;
- exact counts/fixed-denominator percentages and no public ETA;
- future ETA telemetry gates, internal first-value/stall/scaling budgets, and operation transaction envelopes.

ONB-016:

- protected resumable focused onboarding;
- one-account first value then expansion;
- persisted milestones and bounded evidence reveals;
- optional personal tactic/Builder continuation;
- Angular as production authority with VT coordination.

Phase exit:

- lifecycle/default recipe approved;
- import modes/coverage approved;
- preparation orchestration approved;
- destructive matrix and drain protocol approved;
- throughput/progress defaults and validation gates approved;
- administrator authorization, diagnostics, reverification, audit, and action boundaries approved;
- orphan cleanup query/concurrency direction approved;
- implementation tasks promoted only when dependencies are satisfied.

## Phase 2 — Durable account-import foundation

Implementation tasks:

1. ONB-011 / #199 — persistence/contracts/coverage.
2. ONB-012 / #200 — API and worker lifecycle.

Blocked on:

- schema coordination with ONB-017/019.

Initial operational defaults:

```text
IMPORT_MAX_CONCURRENT_EXECUTIONS=1
IMPORT_DATABASE_WRITE_BATCH_SIZE=100
IMPORT_WORKER_POLL_MS=1000
IMPORT_WORKER_HEARTBEAT_MS=15000
IMPORT_WORKER_STALE_MS=120000
IMPORT_WORKER_RECOVERY_MS=30000
```

Expected deliveries:

- immutable import mode/source/scope/range;
- exact account/scope coverage;
- one-active-import constraint;
- claim/heartbeat/fencing/stale recovery;
- pause/cancel/retry/shutdown;
- rate-limited/retry-at state distinct from stale-worker recovery;
- destructive resource-fence admission rejection;
- `202 Accepted` command/status API;
- aggregate queue/provider/parse/write/checkpoint telemetry;
- conservative legacy migration;
- target/current-import relation for preparation;
- migration, ownership, restart, and concurrency tests.

Exit:

- provider work is durable and drainable;
- exact coverage includes empty periods;
- stale workers cannot advance runs;
- destructive operations can prove no import claim remains;
- oldest import queue age and stage timings are observable;
- no public ETA is inferred from synthetic/local measurements.

## Phase 3 — Provider adapters

Implementation tasks:

- ONB-013 / #201 — Lichess.
- ONB-014 / #202 — Chess.com.

Initial provider defaults:

```text
LICHESS_IMPORT_WINDOW_DAYS=14
CHESS_COM_IMPORT_WINDOW=CALENDAR_MONTH
IMPORT_DATABASE_WRITE_BATCH_SIZE=100
PROVIDER_REQUEST_CONCURRENCY=1
```

Expected deliveries:

- deterministic provider windows;
- bounded streamed/batched persistence;
- exact empty-window coverage;
- duplicate-safe replay;
- retry/cancel/fence behavior;
- one-minute Lichess HTTP-429 cooldown;
- Chess.com `ETag`/`Last-Modified` support where available;
- no per-game existence N+1;
- low-volume provider canary evidence;
- fixture coverage for failures, restart, duplicates, and boundaries.

Exit:

- provider access remains serial and policy-compliant;
- committed rows become progressively visible;
- one failed/incomplete window cannot create a coverage gap;
- production-like provider evidence remains separate from public timing language.

## Phase 4 — Sync cutover and preparation handoff

Primary task: ONB-015 / #203.

Blocked on:

- ONB-013/014;
- ONB-004 account reset/delete contract;
- coordination with ONB-017/018/009/010/020.

Expected deliveries:

- legacy sync URL backed by durable import;
- account UI background progress/recovery;
- raw cursor-reset deprecation;
- one rating-stat refresh owner;
- preparation target/current-import handoff and immediate persisted reconcile wake hint;
- no imported/eligible ID arrays;
- compatibility and browser tests.

Exit:

- sync survives navigation/restart;
- forward sync, backfill, purge, and account delete are distinct;
- preparation consumes import progress without browser coordination;
- ONB-020 can replace immediate unfenced account deletion.

Post-cutover follow-up: ONB-025 / #276 — `PROPOSED`. It adds server-owned stale forward-refresh evaluation on authenticated application bootstrap only after ONB-015 is accepted and merged; it does not block this phase's cutover exit.

## Phase 5 — Progressive preparation core

Implementation tasks:

1. ONB-017 / #253 — `DONE` through runtime PR #282 and completion reconciliation PR #293.
2. ONB-018 / #254 — implement progressive preparation reconciliation/control.

Initial preparation defaults:

```text
PREPARATION_FIRST_INDEX_BATCH_SIZE=50
PREPARATION_INDEX_CONTINUATION_BATCH_SIZE=50
PREPARATION_FIRST_ANALYSIS_MIN_INDEXED=3
PREPARATION_FIRST_ANALYSIS_BATCH_SIZE=3
PREPARATION_FIRST_ANALYSIS_SMALL_ACCOUNT_FALLBACK=1
PREPARATION_ANALYSIS_TAIL_BATCH_SIZE=10
PREPARATION_MAX_NON_TERMINAL_BATCHES=4
PREPARATION_MAX_QUEUED_TASKS=200
PREPARATION_MAX_QUEUED_ANALYSIS_TASKS=40
PREPARATION_RECONCILE_ACTIVE_MS=1000
PREPARATION_RECONCILE_IDLE_MS=5000
PREPARATION_RECONCILE_DUE_WARNING_MS=15000
```

ONB-017 delivered:

- run/target/batch models and constraints;
- import and child-job links;
- retained terminal snapshots and immutable progress denominators;
- bounded database candidate selection;
- globally serialized admission enforcing all three capacity caps;
- destructive fence admission checks coordinated with ONB-019;
- queue-wait/first-settlement/total-settlement telemetry;
- migration/ownership/concurrency tests.

ONB-018 expected deliveries:

- short one-second/five-second reconciliation loop with persisted immediate wake hints;
- progressive import-to-index and three-game first-analysis lanes;
- one-game small-account fallback after import/index quiescence;
- exact core-ready gate;
- stage-specific multi-account fairness;
- acknowledged pause/cancel/retry;
- explicit reconcile/task stall codes;
- destructive cancellation/drain integration;
- restart and large-account tests.

Exit:

- browser does not coordinate continuation;
- queue is bounded;
- direct-user work remains responsive;
- first indexed/analysed value is measurable and observable;
- parent state survives restart/cleanup;
- destructive operations can cancel and drain preparation.

## Phase 6 — Lifecycle projection and commands

Implementation tasks:

- ONB-008 / #193 — disposition/readiness projection.
- ONB-009 / #194 — onboarding lifecycle commands.

Expected deliveries:

- authoritative disposition/readiness over durable preparation;
- exact stage summaries, milestones, fixed-denominator percentages, and server-allowed actions;
- no weighted overall percentage or public ETA in the initial release;
- explicit checked-empty/rate-limit/stall/needs-attention states;
- idempotent onboarding start/skip/pause/resume/cancel/retry/restart/expansion;
- no duplicate destructive commands: purge/un-index/un-analyse/delete remain ONB-019/020/021-owned.

## Phase 7 — Lightweight functional onboarding

Primary task: ONB-010 / #195.

Expected slices:

1. account/recipe/durable start/exact progress/recovery without public ETA;
2. first indexed reveal;
3. analysed reveal and optional/checked-empty tactic;
4. additional-account expansion;
5. optional Builder bridge;
6. accepted fixture-driven prototype and final VT craft.

## Phase 8 — Destructive lifecycle foundation

Primary task: ONB-019 / [#259](https://github.com/vokerg/chess_repertoir_trainer/issues/259).

Blocked on:

- Prisma/schema/migration collision review with ONB-011/017.

Policy input from ONB-005:

- mutation-audit configurable initial retention default and HMAC domain/version policy;
- administrator adapters must remain outside the canonical lifecycle state machine;
- sensitive payload exclusions apply to audit.

Expected deliveries:

- typed operation/action/status/resource contracts;
- durable preview/execution/idempotency/checkpoint persistence;
- user/account/game resource fences and conflict constraints;
- import/job/preparation/direct-writer admission checks;
- append-only pseudonymous audit;
- opening provenance;
- deleted-auth-identity HMAC tombstone;
- ownership, migration, auth, retention, and race tests.

Exit:

- destructive work has one durable execution/audit boundary;
- overlapping scopes cannot execute;
- normal writers cannot enter fenced resources;
- deleted identities cannot be silently reprovisioned.

## Phase 9 — Account and game lifecycle execution

Primary task: ONB-020 / [#260](https://github.com/vokerg/chess_repertoir_trainer/issues/260).

Blocked on:

- ONB-019;
- ONB-011/012/015 durable import/cutover;
- ONB-017/018 preparation controls.

Initial calibration envelope:

- no more than 100 game IDs per transaction;
- representative-fixture transaction p90 below one second;
- lock-wait p90 below 250 ms;
- halve after repeated budget breach and increase only through measured review.

Expected deliveries:

- un-analysis and un-index execution;
- account-data purge and account deletion;
- preparation/import/job cancellation and drain proof;
- deterministic bounded phases and resumable checkpoints;
- tag recomputation, tactical/AI/scenario/opening rules;
- authenticated self-service preview/execute/status routes;
- immediate account-delete/raw-cursor-reset cutover;
- large-fixture, race, restart, and idempotency tests.

Exit:

- account/game actions cannot race active writers;
- shared engine evidence remains reusable;
- account purge leaves a clean reusable account;
- deletion no longer relies on one populated-parent cascade.

## Phase 10 — Whole-user deletion and device purge

Primary task: ONB-021 / [#261](https://github.com/vokerg/chess_repertoir_trainer/issues/261).

Blocked on:

- ONB-019/020;
- mobile offline sync contracts.

Policy input from ONB-005:

- self-service whole-user deletion ships first;
- administrator execution remains disabled pending a separate support/recovery policy decision.

Expected deliveries:

- whole-user fence/drain and bounded deletion phases using the ONB-007 transaction/lock envelope where game-scoped;
- OAuth-state and encrypted-token deletion;
- best-effort upstream token revocation;
- final AppUser deletion and auth tombstone;
- initiating-client deletion receipt;
- mobile `local_user` cascade purge including pending outbox;
- next-contact purge for other offline devices;
- auth/mobile/concurrency/large-user tests.

Exit:

- no user-owned server data survives outside the documented shared/audit set;
- valid old auth cannot silently recreate the user;
- stale offline attempts cannot upload after deletion;
- shared Position cleanup remains separately auditable.

## Phase 11 — Orphan shared-position cleanup

Research owner: ONB-006 / #153 — `DONE` through PR #281.

Implementation: ONB-026 / #280 — `PROPOSED`.

Promotion gates:

- deployed PostgreSQL transition-relation support confirmed;
- Prisma/schema/migration ownership reconciled with ONB-011, ONB-017, and ONB-019;
- ONB-019 actor/audit/claim conventions available or a reviewed compatible seam exists;
- canonical task/issue/program records synchronized.

Expected deliveries:

- candidate and run persistence;
- statement-trigger reference reset;
- input-page-bounded reconciliation, observation, dry-run, and execute traversal;
- plies-first maintenance locks and final eligibility recheck;
- exact counters and observational dry-run timestamps;
- work-key fencing, cancellation, stale recovery, restart, and shutdown;
- manual dry-run/execute command over the canonical service;
- no recurring schedule, VACUUM automation, or storage-byte promise;
- migration, trigger, query-plan, concurrency, command, and performance evidence.

Exit:

- referenced positions cannot be deleted;
- transient references reset grace without relying on reconciliation;
- course trees remain untouched;
- manual cleanup is durable and auditable;
- any future scheduling requires a separate evidence-backed decision.

## Phase 12 — Administrator authorization and read-only diagnostics

Primary task: ONB-022 / [#272](https://github.com/vokerg/chess_repertoir_trainer/issues/272).

Status: `DONE` through runtime PR #284 and completion reconciliation PR #298.

Delivered:

- disabled-by-default injectable server-only authorization policy;
- minimal verified Clerk session context;
- exact-subject allowlist bootstrap and pseudonymous actor keys;
- `/api/admin/me`, cursor-paginated users, bounded detail, and work diagnostics;
- strict sensitive-field exclusions and exact row-count aggregates;
- ONB-007 warning evidence without ETA/SLA copy;
- structured read-access security logs;
- topology-honest request budgets;
- config, auth, OpenAPI, pagination, no-N+1, query-plan, and security tests.

Exit achieved:

- normal users cannot enumerate targets;
- read-only administration is deployable without schema changes;
- diagnostics remain bounded and contain no raw personal/chess/auth payloads;
- no mutation capability exists.

## Phase 13 — Administrator diagnostics Angular feature

Primary task: ONB-023 / [#273](https://github.com/vokerg/chess_repertoir_trainer/issues/273).

Status: `READY` after ONB-022 completion.

Pre-claim coordination:

- re-inspect the merged administrator contracts/routes;
- coordinate final Visual Transformation #133 boundaries;
- confirm there is no parallel administrator Angular branch or pull request.

Expected deliveries:

- lazy direct-link `/admin` route;
- typed API and feature-scoped signal store;
- cursor-bounded user/detail/work views;
- loading, empty, partial, forbidden, unavailable, stale, and error states;
- exact warning evidence;
- responsive, keyboard, focus, zoom, and screen-reader validation;
- no destructive controls or client authorization authority.

## Phase 14 — Administrator lifecycle adapters

Primary task: ONB-024 / [#274](https://github.com/vokerg/chess_repertoir_trainer/issues/274).

Blocked on:

- ONB-022/023;
- ONB-019 and the applicable ONB-020/021 operation;
- ONB-026 implementation for cleanup exposure;
- proven pinned-Clerk reverification flow.

Expected deliveries:

- capability-gated preview/execute/status/permitted-cancel/audit adapters;
- valid preview, typed confirmation, idempotency, signed recent `fva`, and one-use request-bound `reverification_id`;
- durable canonical lifecycle operation observation;
- bounded audit summaries;
- administrator whole-user deletion disabled by default;
- Angular controls that render server state and never coordinate phases.

Exit:

- administrator actions cannot bypass fences, drain proof, bounded phases, retry, failure state, or audit;
- one reverification cannot authorize multiple or mismatched actions;
- no parallel destructive implementation exists.
