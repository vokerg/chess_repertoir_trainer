# ONB-007 — Self-review addendum

Date: 2026-08-03

Task: [ONB-007](../tasks/ONB-007-throughput-progress-benchmark.md)

Parent report: [`ONB-007-2026-08-03-throughput-progress-benchmarks.md`](ONB-007-2026-08-03-throughput-progress-benchmarks.md)

Pull request: [#266](https://github.com/vokerg/chess_repertoir_trainer/pull/266)

## 1. Purpose and precedence

This addendum records a fresh self-review of the ONB-007 branch after the first review-ready state.

It does not replace the measured artifact or change the initial configuration recommendations. It narrows several claims so measured facts, policy choices, and implementation validation gates are not conflated.

Where the parent report or canonical decision wording says a value was “measured,” this addendum has precedence unless the value appears directly in the committed CI benchmark artifact.

## 2. Findings

### 2.1 The retained command was not clean-checkout reproducible

The benchmark imports compiled modules from `apps/api/dist`, but the original package command invoked the harness without building first. It worked in benchmark CI only because the workflow had already run the repository build.

Correction:

```text
npm run benchmark:onboarding --workspace=apps/api
```

now runs the API build before starting the harness. The caller must still provide an already migrated disposable local PostgreSQL database through `DATABASE_URL`.

### 2.2 Direct measurements and implementation-start defaults need separate labels

Directly measured in CI #1840:

- current synthetic Lichess and Chess.com normalization/persistence through the existing synchronous adapters;
- current `JobRun`/`JobTask` creation for 10, 50, and 200 tasks;
- current index/opening-assignment and tag-refresh service paths;
- current depth-1 and depth-12 WASM analysis paths;
- current combined process path;
- actual current worker execution for one 50-game index wave and one three-game analysis wave.

Not directly measured because the owning implementation does not exist yet:

- 14-day durable Lichess window execution;
- duplicate-safe 100-row bulk import transactions;
- durable import poll, heartbeat, stale, and recovery behavior;
- preparation reconciliation cadence and wake hints;
- global multi-parent admission caps under production contention;
- complete preparation-parent duration;
- Neon lock/network behavior;
- Render local-binary Stockfish behavior;
- lifecycle deletion and orphan-cleanup batch performance.

The latter values remain evidence-informed, conservative implementation-start defaults. They are configuration, controlled-clock/concurrency-test, telemetry, and canary inputs—not benchmark observations or production performance facts.

### 2.3 Small-sample percentiles are observed sample quantiles

The depth-12 direct profiles and worker-wave profiles used three successful samples. Their reported p90 is therefore the maximum observed sample under the nearest-rank calculation; it is not a statistically stable production p90 estimate.

The five-sample provider/admission profiles and 12-game index profiles are also baseline samples, not deployment SLO evidence.

Consequences:

- the values remain useful for choosing conservative first implementation sizes;
- they must be described as CI observations when quoted;
- production alerting or user timing language must not calibrate directly from them;
- implementation telemetry gates in the parent report remain mandatory.

### 2.4 Synthetic legal PGNs cover length, not human-game complexity

The harness generates deterministic legal 16-, 40-, and 80-ply games. This covers execution-length dimensions and reproducibility, but does not establish that the positions match real user opening, middlegame, tactical, or endgame complexity distributions.

The report’s “representative” claim therefore means representative synthetic scale profiles, not empirically representative production chess positions or three-month account distributions.

### 2.5 Database safety wording was broader than the guard

The harness refuses remote databases and requires a local database name containing `ci`, `test`, or `benchmark`. It also refuses any database containing `AppUser`, `ImportedGame`, `Position`, or `JobRun` rows.

It does not prove that every unrelated/static table is empty. Wording such as “refuses any non-empty database” should be read as “refuses a database containing existing user/game/position/job runtime data.” Static opening/reference data is outside the destructive cleanup performed by the harness.

### 2.6 Worker depth configuration was verified

A suspected configuration-order problem was not confirmed.

`defaultJobTaskExecutorRegistry` calls `getLocalBatchStockfishAnalysisConfig()` when each analysis task executes. The harness sets `LOCAL_BATCH_STOCKFISH_ANALYSIS_ENABLED`, `STOCKFISH_ENGINE`, `STOCKFISH_ANALYSIS_DEPTH`, and timeout values before starting worker waves. The recorded analysis worker wave therefore did execute with the intended WASM depth-12 configuration.

The `depth` field passed to the benchmark helper is descriptive metadata rather than the executor’s configuration source. Later harness changes should assert that helper metadata matches the runtime configuration to prevent drift.

### 2.7 Provider policy remains externally supported

Current official provider guidance still supports serial access:

- Lichess requires one request at a time and a full-minute pause after HTTP 429;
- Chess.com documents unlimited serial PubAPI access, possible HTTP 429 under parallel access, and `ETag`/`Last-Modified` cache validators.

That guidance supports serial execution and retry/caching behavior. It does not measure or justify the selected 14-day Lichess window or 100-row database batch by itself.

## 3. Result validity

No benchmark number is withdrawn.

The measured artifact remains valid for its recorded environment and current repository paths. The corrections change interpretation and reproducibility wording, not the underlying observations.

The initial defaults remain suitable as conservative configuration seeds because they are bounded, remain below direct-user priority, and require implementation-level validation before expansion. They must not be presented as production-optimal values.

## 4. Required interpretation by implementation tasks

ONB-011 through ONB-014 and ONB-017/018 must:

- preserve every numeric value as configuration;
- test controlled-clock lifecycle timing rather than treating poll/heartbeat values as benchmark output;
- test 100-row writes and 14-day planning with large fixtures and low-volume canaries;
- collect production-like queue, execution, provider, database, and engine telemetry before increasing capacity;
- use exact counts and fixed-denominator percentages while public ETA remains disabled.

ONB-005/006/020/021 must not reuse the import/index timings as evidence for administrative, cleanup, or destructive transaction sizes.

## 5. Validation impact

The previous benchmark CI #1840 remains the source of the committed measurements.

This self-review adds no production behavior, schema, migration, dependency, worker-count, provider-load, or user-visible timing change. The final branch must pass normal CI after current `main` is reconciled. The retained benchmark command should also be rerun once through its package command to prove the clean-build correction.
