# ONB-007 — Throughput benchmarks and truthful progress semantics

Date: 2026-08-03

Task: [ONB-007](../tasks/ONB-007-throughput-progress-benchmark.md)

GitHub issue: [#154](https://github.com/vokerg/chess_repertoir_trainer/issues/154)

Branch: `onb-007/issue-154-throughput-progress-benchmark`

Benchmark evidence: [`artifacts/ONB-007-2026-08-03-ci-benchmark-summary.json`](artifacts/ONB-007-2026-08-03-ci-benchmark-summary.json)

## 1. Question and outcome

ONB-007 determines which onboarding preparation sizes, operational thresholds, progress statements, and estimate policies are defensible from the current implementation.

The accepted direction is:

1. keep exact persisted stage counts as the product authority;
2. keep all public ETAs disabled in the first implementation;
3. allow a percentage only for a stage whose denominator is already fixed;
4. never fabricate one weighted overall preparation percentage while provider import can still discover games;
5. use a default index wave of 50 games;
6. use a three-game first-analysis wave after three games are indexed, with a one-game small-account fallback after normal index candidates are exhausted;
7. use analysis-tail waves of 10 games;
8. initially admit at most four non-terminal onboarding batches, 200 queued onboarding tasks in total, and 40 queued analysis tasks globally;
9. keep the existing imported-game worker scheduling slice at 25 because the slice is a fairness/preemption boundary, not a visible preparation wave;
10. reconcile active preparation every second, idle preparation every five seconds, and use persisted immediate wake hints after import commits and child settlement;
11. use serial provider access only;
12. start durable Lichess work with 14-day replayable windows and Chess.com work with its natural calendar-month archive unit;
13. start duplicate-safe database import writes at 100 normalized games per transaction;
14. keep one active account-import executor initially, with independent heartbeat and cancellation acknowledgement;
15. retain the current fresh-engine-per-task design for initial delivery, but instrument engine startup because the measured WASM startup is material;
16. define internal first-value and stall budgets, not user-facing timing promises;
17. require production-like telemetry and stability gates before any later stage ETA can be enabled;
18. treat cleanup and destructive batch sizes as implementation-calibrated values with explicit transaction budgets rather than claiming that the import/index fixture proves delete performance.

No production concurrency, worker count, provider load, queue infrastructure, or user-facing estimate is changed by this research branch.

## 2. Files and records inspected

Repository files actually opened/read include:

- `AGENTS.md`
- `package.json`
- `.github/workflows/ci.yml`
- `apps/api/package.json`
- `apps/api/src/worker.ts`
- `apps/api/src/services/externalAccountService.ts`
- `apps/api/src/services/lichessImportService.ts`
- `apps/api/src/services/chessComImportService.ts`
- `apps/api/src/routes/externalAccounts.ts`
- `apps/api/src/modules/jobs/job-worker.config.ts`
- `apps/api/src/modules/jobs/job-worker.service.ts`
- `apps/api/src/modules/jobs/job-run.service.ts`
- `apps/api/src/modules/jobs/imported-game-job-executors.ts`
- `apps/api/src/modules/imported-games/imported-game-index-workflow.service.ts`
- `apps/api/src/modules/imported-games/imported-game-processing.service.ts`
- `apps/api/src/modules/imported-games/imported-games.service.ts`
- `apps/api/src/modules/imported-games/game-tagging.service.ts`
- `apps/api/src/modules/analysis/batch-analysis.config.ts`
- `apps/api/src/modules/analysis/imported-game-analysis-execution.service.ts`
- `apps/api/src/modules/analysis/imported-game-analysis.service.ts`
- `apps/api/test/run-all.mjs`
- `apps/api/test/analysis/local-stockfish-engine.test.mjs`
- `apps/api/test/analysis/wasm-stockfish-engine.test.mjs`
- `apps/api/test/imported-games/imported-game-index-workflow.test.mjs`
- `docs/deployment.md`
- `docs/imported-game-job-processing.md`
- `north-star/onboarding/README.md`
- `north-star/onboarding/FOUNDATION.md`
- `north-star/onboarding/MASTER_PLAN.md`
- `north-star/onboarding/DECISIONS.md`
- `north-star/onboarding/OPEN_QUESTIONS.md`
- `north-star/onboarding/ROADMAP.md`
- `north-star/onboarding/STATUS.md`
- `north-star/onboarding/TASKS.md`
- `north-star/onboarding/reports/ONB-003-2026-08-01-progressive-preparation-orchestration.md`
- `north-star/onboarding/tasks/ONB-006-orphan-position-cleanup.md`
- `north-star/onboarding/tasks/ONB-007-throughput-progress-benchmark.md`
- `north-star/onboarding/tasks/ONB-011-import-persistence-coverage.md`
- `north-star/onboarding/tasks/ONB-012-account-import-worker-api.md`

GitHub records actually inspected:

- #147 — onboarding/data lifecycle program;
- #154 — ONB-007 and its ONB-003/016 handoffs;
- branch and pull-request collision searches;
- draft PR #266;
- CI runs #1824 and #1840 and their benchmark artifacts.

External primary guidance inspected:

- [Lichess API tips](https://lichess.org/page/api-tips), which require serial requests and a full-minute pause after HTTP 429;
- [Chess.com PubAPI guidance](https://support.chess.com/en/articles/9650547-what-is-the-pubapi-and-how-do-i-use-it), which permits unlimited serial access, warns that parallel access can receive HTTP 429, and documents `ETag`/`Last-Modified` caching.

A local clone was unavailable because this runtime could not resolve `github.com`. Measurements therefore ran through a branch-only GitHub Actions harness against the repository build and PostgreSQL integration environment.

## 3. Verified current runtime shape

### 3.1 Imported-game execution is serial per worker process

The worker claims one task, executes it, settles it, and then claims the next task. The scheduling slice of 25 controls how long it remains on one run before reconsidering priorities. It does not run 25 games concurrently.

Direct-user priorities remain above onboarding priorities. That means a bounded onboarding backlog is compatible with direct-user preemption, provided new onboarding tasks are not admitted without limit.

### 3.2 Each analysis task creates a fresh engine

`ANALYSE_GAMES` and `PROCESS_GAMES` create and dispose a Stockfish engine per task. The current default depth is 12 and the documented hosted preference is a local binary, with WASM available as a fallback/test implementation.

### 3.3 Current provider persistence is per-game

Both current adapters perform an existence lookup and insert per game. Lichess streams NDJSON, while Chess.com fetches archive months serially. The durable target contract already requires duplicate-safe bulk persistence; the current benchmark is a baseline, not an endorsement of the N+1 path.

### 3.4 Progress already has exact child-task counts

`JobRun` exposes queued, running, completed, skipped, failed, and cancelled task counts against a fixed `totalTasks`. These counts are valid technical child progress. They are not by themselves overall onboarding progress or readiness.

### 3.5 End-to-end preparation does not exist yet

`DataPreparationRun`, its target/batch rows, durable account import, and the preparation reconciler are planned but not implemented. The benchmark can measure current provider normalization/persistence, job admission, indexing, analysis, and actual child-worker waves. It cannot honestly claim a complete onboarding duration.

## 4. Benchmark method

The retained harness is:

```text
apps/api/benchmarks/onboarding-throughput-safe.mjs
```

Run it only through:

```text
npm run benchmark:onboarding --workspace=apps/api
```

Safety properties:

- requires `DATABASE_URL` to point to localhost;
- requires a database name containing `ci`, `test`, or `benchmark`;
- requires the migrated database to contain no users, games, positions, or jobs;
- uses synthetic provider responses and legal deterministic PGNs;
- deletes only benchmark-owned users and newly orphaned positions;
- never calls Lichess or Chess.com during the benchmark.

The final evidence run was GitHub Actions CI #1840 on:

- Node `v22.23.1`;
- Linux x64;
- four logical AMD EPYC 7763 CPUs;
- approximately 16.8 GB runner memory;
- a fresh local PostgreSQL 16 service;
- the repository `stockfish` WASM worker;
- depth 12 and MultiPV 1 for the production-depth profiles.

The full workflow artifact is identified in the committed summary by run ID, artifact ID, head SHA, and SHA-256 digest.

## 5. Measured results

### 5.1 Synthetic provider normalization and current persistence

| Provider and games | Total p50 | Total p90 | First committed game p50 | First committed game p90 |
| --- | ---: | ---: | ---: | ---: |
| Lichess 50 | 104 ms | 128 ms | 6.7 ms | 7.9 ms |
| Lichess 200 | 363 ms | 418 ms | 7.2 ms | 7.8 ms |
| Chess.com 50 | 99 ms | 109 ms | 6.8 ms | 8.7 ms |
| Chess.com 200 | 353 ms | 422 ms | 7.1 ms | 9.6 ms |

Interpretation:

- local parsing/persistence does not justify delaying downstream indexing until a complete synthetic response is persisted;
- progressive committed-row handoff remains correct;
- these figures exclude provider response time, throttling, retries, archive/window discovery, and Neon latency;
- they do not overturn the accepted requirement to replace existence-query/insert N+1 with bounded duplicate-safe writes.

### 5.2 Job and task admission

| Tasks | Create run/tasks p50 | p90 |
| ---: | ---: | ---: |
| 10 | 3.7 ms | 7.2 ms |
| 50 | 6.0 ms | 6.8 ms |
| 200 | 13.0 ms | 15.3 ms |

Creating 50 tasks is negligible in the local CI database. The reason to cap preparation waves is product fairness, queue age, recovery, and analysis cost—not job-row insertion alone.

### 5.3 Direct indexing and tag refresh

| Profile | Index p50/game | Index p90/game | Observed games/sec |
| --- | ---: | ---: | ---: |
| 16 plies | 16 ms | 18 ms | 58.4 |
| 40 plies | 25 ms | 26 ms | 38.8 |
| 80 plies | 38 ms | 68 ms | 22.7 |

Tag refresh remained around 5–6 ms p90 per game.

The actual worker processed 50 medium games with:

- first settled game: 41 ms p50 / 43 ms p90;
- entire wave: 1.72 s p50 / 1.78 s p90.

A visible/index preparation wave of 50 is therefore operationally conservative in this environment and gives an immediate first indexed result without creating an account-sized child run.

### 5.4 Depth-12 WASM analysis

| Profile | Analysis p50/game | Analysis p90/game |
| --- | ---: | ---: |
| 16 plies | 1.05 s | 1.19 s |
| 40 plies | 1.32 s | 1.67 s |
| 40-ply combined process | 1.63 s | 2.60 s |

Fresh-engine first-position startup was approximately 283–288 ms p50 and 283–294 ms p90.

The actual worker processed a three-game, 16-ply, depth-12 analysis wave with:

- first settled game: 1.26 s p50 / 1.73 s p90;
- entire wave: 2.96 s p50 / 3.49 s p90.

Interpretation:

- first analysis should be deliberately small;
- three games give a useful analysed sample quickly without admitting an entire analysis tail;
- fresh-engine startup is roughly 21% of the medium-game p50 and 27% of the short-game p50 in this WASM environment;
- engine reuse is a plausible later optimization, but not required for the first architecture and not proven safe for cancellation/state isolation by this benchmark;
- these values are not a Render/local-binary production ETA.

## 6. Default preparation tuning

### 6.1 Wave sizes

Use configuration, not literals in route/component code:

```text
PREPARATION_FIRST_INDEX_BATCH_SIZE=50
PREPARATION_INDEX_CONTINUATION_BATCH_SIZE=50
PREPARATION_FIRST_ANALYSIS_MIN_INDEXED=3
PREPARATION_FIRST_ANALYSIS_BATCH_SIZE=3
PREPARATION_FIRST_ANALYSIS_SMALL_ACCOUNT_FALLBACK=1
PREPARATION_ANALYSIS_TAIL_BATCH_SIZE=10
```

Rules:

- first analysis starts as soon as three current indexed/unanalysed games exist;
- when import/index is quiescent and the target has one or two eligible games, admit the one-game fallback rather than waiting forever;
- analysis tail remains newest-first and lower priority;
- do not combine onboarding index and analysis into `PROCESS_GAMES`.

### 6.2 Global preparation admission

Initial bounds:

```text
PREPARATION_MAX_NON_TERMINAL_BATCHES=4
PREPARATION_MAX_QUEUED_TASKS=200
PREPARATION_MAX_QUEUED_ANALYSIS_TASKS=40
```

Rationale:

- four batches preserve multi-parent progress without creating an unbounded scheduler;
- 200 tasks is cheap to persist but still caps queue age and restart/recovery work;
- the stage-specific 40-task analysis cap limits the expensive tail even when index capacity remains available;
- the existing per-run rule of at most one index and one analysis batch remains unchanged.

Do not increase these values until production telemetry shows both:

- direct-user task start p90 remains below 10 seconds;
- oldest onboarding analysis task age remains below five minutes under normal load.

### 6.3 Worker slice and priorities

Keep:

```text
JOB_WORKER_SLICE_SIZE=25
FIRST_INDEX=200
FIRST_ANALYSIS=190
INDEX_CONTINUATION=180
ANALYSIS_TAIL=100
```

The 25-task slice is not the 50-game wave. It remains a scheduling yield point. Every onboarding priority remains below direct-user `REFRESH_TAGS=250`.

### 6.4 Reconciliation

Initial defaults:

```text
PREPARATION_RECONCILE_ACTIVE_MS=1000
PREPARATION_RECONCILE_IDLE_MS=5000
PREPARATION_RECONCILE_DUE_WARNING_MS=15000
```

Persist `reconcileAfter=now` or an equivalent wake hint after:

- a committed import batch;
- import terminal/checkpoint transition;
- child batch/task settlement that may unlock a milestone;
- user control acknowledgement.

The polling scan remains authoritative after restart. Do not require an event bus.

## 7. Durable import tuning

### 7.1 Provider access and window units

Initial provider units:

```text
LICHESS_IMPORT_WINDOW_DAYS=14
CHESS_COM_IMPORT_WINDOW=CALENDAR_MONTH
IMPORT_MAX_CONCURRENT_EXECUTIONS=1
IMPORT_DATABASE_WRITE_BATCH_SIZE=100
```

Why:

- Lichess officially requires serial requests and a full-minute wait after HTTP 429;
- a 14-day half-open unit keeps the three-month initial recipe to roughly seven replayable requests while allowing streamed rows to become visible before the window settles;
- Chess.com exposes monthly archives, requires serial access for safe unlimited use, and supports conditional caching headers;
- one active provider execution avoids accidental parallel pressure while demand is still unmeasured;
- 100 normalized rows keeps persistence transactions bounded without turning every provider record into an individual transaction.

These are implementation-start defaults, not public performance promises. ONB-013/014 must validate them against fixture sizes and one low-volume staging/canary account before general release.

### 7.2 Import loop timing

Initial defaults:

```text
IMPORT_WORKER_POLL_MS=1000
IMPORT_WORKER_HEARTBEAT_MS=15000
IMPORT_WORKER_STALE_MS=120000
IMPORT_WORKER_RECOVERY_MS=30000
```

The heartbeat must be independent of provider response parsing and database batches. HTTP 429 is an explicit rate-limited/retry-at state, not worker staleness. Cancellation does not become acknowledged until the active provider claim is released.

### 7.3 Import backlog trigger

Do not reject accepted work solely because a soft threshold is crossed. Record and alert when either occurs:

- more than 20 import runs are queued for five continuous minutes;
- oldest queued import age exceeds five minutes.

Split provider import into its own worker deployment only when the shared worker process shows provider work delaying imported-game claim/reconcile heartbeats or when the above backlog persists despite healthy provider responses.

## 8. Truthful progress contract

### 8.1 Always valid

Expose exact persisted facts:

- provider window/archive state;
- games committed so far;
- eligible games currently selected;
- indexed, analysed, queued, running, failed, skipped, and remaining counts;
- first-imported, first-indexed, first-analysed, core-ready, and analysis-complete milestones;
- rate-limited, retry-at, paused, cancelled, or needs-attention state;
- newly ready capabilities and their evidence counts.

### 8.2 Percentage rules

A percentage is valid only when its denominator cannot grow inside that stage instance.

Valid examples:

- `37 of 50 indexed` for one immutable index batch;
- `2 of 3 analysed` for the immutable first-analysis batch;
- `6 of 7 provider windows complete` after the window plan is fixed;
- `83 of 83 eligible games indexed` after import scope is terminal and the eligible denominator is frozen.

Invalid examples:

- percentage of games imported while a Lichess stream can still discover an unknown number of games;
- one weighted `import + index + analysis` percentage;
- advancing progress based on elapsed time;
- “almost done” because the current batch is nearly settled while more import/index work may appear;
- analysis percentage presented as core onboarding completion.

### 8.3 Overall presentation

Before import is terminal, show stage/milestone language and exact counts, not an overall percent.

After import is terminal, the projection may show fixed-denominator index coverage and separate analysis coverage. Core-ready remains a milestone derived from terminal import/index evidence, not a weighted number.

## 9. ETA policy

### 9.1 Initial release

Public ETA is disabled.

Do not show:

- an expected completion timestamp;
- “about N minutes remaining”;
- a countdown;
- a competitor-derived “ready in two minutes” promise;
- whole-run ETA before provider scope is terminal.

### 9.2 Later stage-ETA eligibility

A future stage ETA may be enabled only when all conditions are satisfied:

1. the stage denominator is fixed;
2. telemetry matches the same provider/engine/depth/MultiPV/worker/database-deployment/game-length-bucket fingerprint;
3. at least 30 recent successful task samples exist across at least five independent runs and three account scopes;
4. the rolling sample window is no older than 14 days;
5. p90 is no more than twice p50;
6. failure/timeout rate is below 5%;
7. the current run is not rate-limited, stalled, paused, or materially preempted by higher-priority work;
8. queue wait is included separately from execution time;
9. configuration or deployment changes invalidate the sample set.

Presentation, when eligible:

- show a coarse range derived from remaining count and observed p50–p90;
- round to user-comprehensible units;
- label it as an estimate;
- remove it immediately when eligibility becomes false;
- never replace exact counts with the estimate.

## 10. Internal first-value budgets

These are alert/acceptance budgets for production validation, not public promises:

| Milestone | Initial p90 budget |
| --- | ---: |
| Durable preparation command accepted | 1 s |
| Due active run reconciled | 5 s |
| First imported game committed under healthy provider response | 15 s |
| First indexed game after an eligible commit | 30 s |
| 50-game index wave | 30 s |
| First analysed game after first-analysis admission | 2 min |
| Three-game first-analysis wave | 2 min |
| Index tail after terminal import for a <=50-game initial scope | 2 min |

A budget breach creates telemetry/operational attention. It does not automatically fail or cancel the user’s durable run.

The first personal-tactic milestone has no time budget because analysed evidence may correctly produce no eligible tactic. Its truthful state is ready, checked-empty, or still analysing—not delayed until a tactic can be fabricated.

## 11. Stall and incident thresholds

### Preparation/reconcile

- warning: due active run not reconciled within 15 seconds;
- critical: due run not reconciled within 60 seconds while worker is healthy;
- queued child warning: no task starts within 30 seconds when capacity exists and no higher-priority work explains the wait.

### Imported-game work

- index warning: no task settlement for two minutes;
- analysis warning: no task settlement for five minutes;
- exclude intervals where a higher-priority direct-user run is actively consuming the worker;
- worker claim/heartbeat staleness remains a durable executor condition, not inferred from UI polling.

### Provider import

- stale claim: no heartbeat for two minutes;
- progress warning: no checkpoint/window/commit progress for five minutes with a healthy claim;
- needs attention: no progress for 15 minutes, excluding an explicit provider retry-at/rate-limit interval;
- HTTP 429 must expose retry timing and obey the provider cooldown rather than busy-retry.

### Direct-user protection

Reassess capacity when direct-user task-start p90 exceeds 10 seconds for 15 continuous minutes or when imported-game worker CPU remains above roughly 80% while analysis queue age grows.

## 12. Scaling and optimization triggers

### 12.1 Keep one deployment initially

Do not add Redis, another queue, or a generic workflow system. Keep import and preparation loops in the current worker deployment initially.

### 12.2 Split provider import when isolation is demonstrated necessary

Split the provider loop into a separate deployment only when:

- provider I/O or parsing delays imported-game worker heartbeat/reconcile schedules;
- import queue age exceeds the five-minute trigger under healthy providers;
- independent restart/deploy behavior is operationally necessary.

The persistence/claim contract must remain unchanged across the split.

### 12.3 Add analysis capacity only from sustained queue evidence

Consider a second imported-game worker only when all apply:

- oldest onboarding analysis task age exceeds five minutes for at least 15 minutes;
- direct-user task-start p90 approaches or exceeds 10 seconds;
- worker CPU is sustained above roughly 70–80%;
- Neon connection/lock capacity has been reviewed;
- same-game `workKey` fencing and priority fairness tests pass with multiple workers.

### 12.4 Engine reuse is deferred, not rejected

The measured ~283 ms fresh WASM startup is material. Reopen persistent-engine reuse only when production-like telemetry shows startup remains above 20% of analysis execution time and queue age is a real bottleneck.

Any reuse change must prove:

- no cross-task option/state leakage;
- cancellation and timeout recovery;
- engine crash replacement;
- no reduction in direct-user preemption;
- bounded memory over long worker lifetime.

## 13. Cleanup and destructive-operation budgets

The benchmark did not execute ONB-020/021 lifecycle phases or ONB-006 orphan cleanup. Import/index timings cannot prove delete/lock behavior.

Implementation rule:

- start game-scoped lifecycle phases at no more than 100 game IDs per transaction;
- start orphan Position cleanup at no more than 500 candidate rows per transaction;
- require transaction p90 below one second and lock-wait p90 below 250 ms in the implementation’s disposable representative fixture;
- halve the batch after repeated budget breach;
- increase only through measured review;
- preserve forward-only checkpoints regardless of tuning.

ONB-006, ONB-020, and ONB-021 retain ownership of exact query shape and may choose a smaller default after their concurrency tests.

## 14. Required telemetry

Implementation must record aggregate, non-PII operational telemetry for:

- import queue wait, provider request, parse, persistence-batch, checkpoint, and window duration;
- imported rows seen/inserted/updated/skipped/failed per window;
- preparation reconcile lag and decision duration;
- child batch queue wait, first settlement, total settlement, and task count;
- task execution by kind, engine source/version, depth, MultiPV, and game-length bucket;
- engine startup duration and cache-hit/miss counts;
- direct-user versus onboarding queue age;
- worker heartbeat, stale recovery, cancellation acknowledgement, and shutdown release;
- lifecycle/cleanup transaction and lock-wait duration when those operations exist.

Do not retain PGN, usernames, provider URLs, FEN history, or raw personal payloads in benchmark/operational metrics.

## 15. Implementation handoffs

### ONB-011 / #199

- persist configuration-compatible import counters/checkpoints;
- support bounded batch writes of 100 as the initial default;
- preserve exact window-plan denominator when known;
- expose fields required to distinguish queue wait, provider work, persistence, and retry-at state.

### ONB-012 / #200

- use one active import executor initially;
- default poll/heartbeat/stale/recovery to 1 s / 15 s / 2 min / 30 s;
- implement serial provider execution and explicit rate-limit retry state;
- emit aggregate timings and cancellation acknowledgement.

### ONB-013 / #201

- begin with 14-day half-open Lichess windows;
- stream and commit 100-row batches;
- keep one request at a time and obey one-minute 429 cooldown;
- validate with one low-volume canary before general rollout.

### ONB-014 / #202

- use calendar-month archives and serial requests;
- persist/use `ETag` and `Last-Modified` according to provider guidance;
- commit normalized rows in 100-row batches;
- validate large-month memory and retry behavior.

### ONB-017 / #253

- default index/first-analysis/tail sizes to 50/3/10;
- add global capacity configuration 4 batches / 200 tasks / 40 analysis tasks;
- keep task creation bounded and expose immutable denominators.

### ONB-018 / #254

- reconcile at 1 s active / 5 s idle with persisted immediate wake hints;
- implement the three-indexed threshold and one-game fallback;
- expose exact milestones/counts and stall codes;
- do not generate public ETA.

### ONB-008 / #193 and ONB-010 / #195

- render exact counts, fixed-denominator percentages, milestones, and checked-empty states;
- omit overall percentage before import denominator freezes;
- omit ETA in the first release;
- keep technical child jobs separate from product progress.

### ONB-005 / #152

- admin diagnostics should expose queue age, heartbeat, reconcile lag, rate-limit state, first/last progress, and aggregate stage durations without raw personal payloads.

### ONB-006 / #153, ONB-020 / #260, and ONB-021 / #261

- apply the transaction/lock budgets in section 13;
- run operation-specific representative fixtures before increasing batch size;
- do not treat the current synthetic import/index numbers as deletion proof.

## 16. Rejected alternatives

- public completion-time promise from CI timings;
- adopting a competitor’s unverified “two minute” claim;
- one weighted overall progress percentage;
- time-smoothed progress animation detached from persisted work;
- index and analysis wave both set to 50 merely for visual symmetry;
- one account-sized immutable job;
- treating the 25-task worker slice as the product wave;
- parallel provider requests;
- increasing worker replicas before queue-age/direct-user evidence;
- engine pooling without cancellation/state-isolation proof;
- production load against third-party providers;
- running the benchmark against a developer or production database;
- using import/index evidence to claim an exact destructive-delete batch size.

## 17. Remaining validation and limitations

The following are deliberately not claimed as measured:

- real Lichess/Chess.com response latency or rate-limit frequency;
- Neon latency and lock behavior;
- Render local Stockfish binary depth-12 performance;
- multi-worker throughput;
- end-to-end preparation parent/reconcile latency;
- actual three-month account-size distribution;
- production CPU/memory isolation;
- cleanup/destructive query performance.

Before user-visible timing language or capacity expansion:

1. deploy the durable import/preparation telemetry;
2. run low-volume staging/canary imports against owned/public test accounts without parallel requests;
3. capture production-like local-binary analysis on representative 16/40/80-ply games;
4. verify direct-user preemption and oldest-queue-age targets;
5. review the ETA eligibility gates with real samples.

## 18. Queue impact

ONB-007 resolves the program’s initial numeric preparation, import-loop, progress, ETA, stall, and scaling defaults. No new implementation task is required: the work belongs to the already allocated ONB-008, ONB-010 through ONB-014, ONB-017/018, and diagnostic/lifecycle owners listed above.

After ONB-007 review/merge, the next deterministic READY research task by canonical order is ONB-005 / #152, followed by ONB-006 / #153. ONB-017 remains separately READY implementation work with ONB-011/019 schema-collision coordination.
