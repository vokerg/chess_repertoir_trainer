# ONB-007 — Third self-review addendum

Date: 2026-08-04

Task: [ONB-007](../tasks/ONB-007-throughput-progress-benchmark.md)

Pull request: [#266](https://github.com/vokerg/chess_repertoir_trainer/pull/266)

Corrected evidence: [`artifacts/ONB-007-2026-08-04-ci-benchmark-summary.json`](artifacts/ONB-007-2026-08-04-ci-benchmark-summary.json)

## Outcome

A third independent review found a real timing-boundary defect in the retained benchmark and several related observability/safety gaps. The harness was corrected and rerun. The new evidence supersedes only the provider total/first-commit timings in the 2026-08-03 artifact. The index, admission, Stockfish, worker-wave, progress, ETA, and conservative configuration conclusions remain materially unchanged.

## Problems found

### 1. Provider total timing started after work had begun

The benchmark created the provider sync promise before entering `timed(() => promise)`. Any synchronous setup and early asynchronous work performed before the timer wrapper was therefore omitted.

### 2. The first-commit observer could create an unhandled rejection

The observer used `void syncPromise.finally(...)`. A rejected sync operation would produce a second rejected promise from `finally`, and that detached promise was not observed.

### 3. The observer could miss a final committed row

The loop stopped when the sync promise settled without performing a guaranteed final database observation. A commit and promise resolution occurring around the same polling boundary could therefore report `null`.

### 4. Network isolation was implicit rather than enforced globally

Provider calls were stubbed inside each import sample, but unexpected fetches outside those stubs were not rejected explicitly.

### 5. Worker-wave timing omitted important benchmark semantics

The report did not state that the job was already queued before an in-process worker started with a 5 ms poll interval. Those values measure immediate worker execution and settlement, not arbitrary idle-worker wake, deployment startup, or external queue delay.

### 6. The disposable-name check accepted arbitrary substrings

A database name merely containing `ci`, `test`, or `benchmark` anywhere could pass. The guard now requires one of those values as a separator-delimited name token.

### 7. Worker-wave depth was not driven by the wave input

The analysis wave happened to use depth 12 because the global environment was set to 12, but the wave input’s `depth` field was output metadata rather than execution configuration. The harness now sets the executor depth from the analysis-wave input.

## Corrections

- Timer, CPU, and RSS baselines are captured before invoking the provider service.
- Provider execution begins synchronously after the baseline is captured; it is not deferred behind the observer query.
- The observer attaches both fulfillment and rejection handlers without creating a detached rejected promise.
- The observer checks the database before evaluating terminal sync state on every iteration.
- `globalThis.fetch` rejects every request outside the explicit synthetic Lichess or Chess.com stub.
- Observer and worker poll intervals are constants included in the output metadata.
- Worker-wave output records that the job was queued before worker startup.
- Analysis-wave depth sets `STOCKFISH_ANALYSIS_DEPTH` from the wave input.
- Disposable database names require a `ci`, `test`, or `benchmark` token separated by `_`, `-`, or a string boundary.

## Corrected benchmark

GitHub Actions run: `30877363202` / #1905

Benchmark source head: `1b6b8307102b05e6162a63eaa5f1dcc0b2bb743f`

Artifact: `8880111972`

Artifact digest: `sha256:1373fffd91323a28b5cf96f8b6c71776b456b5df6350f56a3eb342162e6783d2`

Environment:

- Node `v22.23.1`;
- Linux x64;
- four logical AMD EPYC 7763 CPUs;
- local PostgreSQL 16 CI service;
- Stockfish npm WASM worker;
- depth 12 and MultiPV 1 for the production-depth profiles;
- first-import observer poll 2 ms;
- benchmark worker poll 5 ms;
- worker-state observer poll 5 ms.

## Corrected provider observations

| Provider and games | Total p50 | Total observed p90 | First committed p50 | First committed observed p90 |
| --- | ---: | ---: | ---: | ---: |
| Lichess 50 | 99.3 ms | 99.9 ms | 6.8 ms | 7.3 ms |
| Lichess 200 | 353.0 ms | 362.2 ms | 6.8 ms | 7.6 ms |
| Chess.com 50 | 96.0 ms | 106.8 ms | 6.9 ms | 11.3 ms |
| Chess.com 200 | 347.2 ms | 351.2 ms | 7.7 ms | 9.7 ms |

The magnitudes remain comparable to the earlier run, but only these corrected provider figures use a valid start boundary. Both runs remain synthetic local persistence baselines and exclude provider/network and Neon behavior.

## Reconfirmed processing observations

- 50 medium games: first worker settlement 40.5 ms p50 / 45.3 ms observed maximum; total wave 1.714 s p50 / 1.725 s observed maximum.
- Three short depth-12 games: first worker settlement 1.338 s p50 / 1.754 s observed maximum; total wave 3.100 s p50 / 3.609 s observed maximum.
- Medium 40-ply depth-12 direct analysis: 1.355 s p50 / 1.722 s observed maximum.
- Medium 40-ply combined process: 1.672 s p50 / 2.650 s observed maximum.
- Fresh WASM first-position startup: about 294 ms p50 and 295–301 ms observed maxima across the depth-12 profiles.
- 50-task admission: 5.84 ms p50 / 6.49 ms observed p90.

The three-sample analysis and worker-wave observed p90 remains the maximum sample. These are CI baselines, not production percentiles or SLOs.

## Decision impact

No architectural decision changes:

- index / first-analysis / analysis-tail initial waves remain 50 / 3 / 10;
- global preparation caps remain conservative configurable seeds;
- exact persisted counts and fixed-denominator percentages remain authoritative;
- weighted overall progress remains prohibited;
- public ETA remains disabled;
- durable import timing, reconcile cadence, provider window size, bulk write size, and scaling remain implementation validation responsibilities.

The benchmark evidence taxonomy is tightened: current service/worker observations are measured; future durable-import and preparation settings remain conservative starting configuration.

## Remaining limitations

- The 2 ms first-import observer adds polling latency and database load.
- Worker timing begins after task persistence and starts an in-process worker immediately. It excludes idle polling up to the production interval, deployment wake, and unrelated queue wait.
- Provider responses remain synthetic.
- PostgreSQL remains runner-local rather than Neon.
- Stockfish remains WASM rather than the hosted local binary.
- Generated PGNs remain deterministic legal length profiles rather than a production complexity distribution.
- Complete preparation-parent/reconcile duration remains unmeasured.

## Validation

CI `30877363202` / #1905 passed lint, build, all opening audits, architecture guardrails, migrations, the corrected clean-build benchmark command, corrected benchmark artifact upload, and the full repository test suite.

## Files inspected in this review

- `apps/api/benchmarks/onboarding-throughput-safe.mjs`
- `apps/api/package.json`
- `apps/api/src/modules/jobs/job-worker.config.ts`
- `apps/api/src/modules/jobs/job-worker.service.ts`
- `.github/workflows/ci.yml`
- current `main` commits since the previous review
- PR #266 metadata, diff, reviews, comments, and review threads
- issue #154
- ONB-004 completion-state precedent
- ONB-007 reports, evidence, task, and canonical program records
