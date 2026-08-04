# ONB-007 — Benchmark preparation throughput and define truthful progress semantics

Status: REVIEW

Priority: P0

Order: 50

Delivery class: Research

Planning maturity: Research, corrected reproducible benchmark, and three self-review rounds complete; user-authorized squash merge pending final standard CI

GitHub issue: [#154](https://github.com/vokerg/chess_repertoir_trainer/issues/154)

Claimed by: ChatGPT/Codex research session for `vokerg`

Claim branch: `onb-007/issue-154-throughput-progress-benchmark`

Claimed at: 2026-08-03

Claim scope: inspect current import, job, indexing, analysis, tagging/tactical, worker, deployment, fixture, and progress-reporting paths; define and run safe reproducible local/CI benchmark harnesses; separate deterministic processing from provider-network observations; produce measured defaults, truthful progress/ETA policy, operational budgets, task handoffs, and canonical documentation; no production scaling, provider load test, queue replacement, or speculative optimization

## Outcome

Measure current import, indexing, analysis, and derived-refresh throughput so first-value targets, wave policy, resource limits, progress wording, and any future estimate are evidence-based.

## Why this task exists

The recent-first flow depends on one background worker and expensive per-game Stockfish tasks. The proposed wave size and any completion expectation required measurement rather than intuition or competitor marketing.

## Repository anchors inspected

- `apps/api/src/worker.ts`
- `apps/api/src/modules/jobs/`
- `apps/api/src/modules/analysis/`
- `apps/api/src/modules/imported-games/`
- current Lichess and Chess.com import services/routes
- worker and Stockfish configuration
- existing analysis/index tests and test runner
- `.github/workflows/ci.yml`
- `docs/deployment.md`
- `docs/imported-game-job-processing.md`
- onboarding foundation, decisions, reports, queue, and dependent tasks

## Dependencies

- ONB-000.
- Consumed ONB-001 exact-progress rule, ONB-002 import handoff, ONB-003 lane/batch model, ONB-004 lifecycle transaction constraints, and ONB-016 first-value milestones.
- Feeds operational defaults into ONB-008, ONB-010 through ONB-014, ONB-017/018, and budget guidance into ONB-005/006/020/021.

## In scope result

- Reproducible disposable-database benchmark harness: complete.
- Synthetic 10/50/200-game import/admission scale fixtures: complete.
- Deterministic legal 16/40/80-ply index/tag length fixtures: complete.
- Depth-1 and depth-12 WASM analysis plus combined process fixtures: complete.
- Actual worker-wave measurements for 50-game index and three-game analysis: complete.
- CPU/RSS/environment metadata and limitations: complete.
- Conservative wave, backlog, reconcile, import-loop, stall, and scaling configuration defaults: complete.
- Exact progress and later ETA eligibility policy: complete.
- Implementation acceptance budgets and handoffs: complete.
- Self-review separation of directly measured observations from implementation-start defaults: complete.
- Provider timing boundary, observer failure handling, global network isolation, worker-wave metadata, depth configuration, and database-name guard corrections: complete.

## Out of scope result

No production scaling, worker replica, provider load test, queue infrastructure, public ETA, or unmeasured optimization was introduced.

## Questions owned

Resolved in:

- `reports/ONB-007-2026-08-03-throughput-progress-benchmarks.md`;
- `reports/ONB-007-2026-08-03-self-review-addendum.md`;
- `reports/ONB-007-2026-08-04-third-self-review-addendum.md`.

The 2026-08-04 corrected evidence supersedes provider total/first-commit timings in the 2026-08-03 artifact. Production/provider validation remains an implementation telemetry gate rather than an unresolved architecture question.

## Acceptance criteria result

- Reproducible metadata: satisfied by `apps/api/benchmarks/onboarding-throughput-safe.mjs` and the committed evidence summaries; the package command builds the API before execution.
- Exact progress without ETA: satisfied; public ETA remains disabled.
- Wave-size recommendation tied to evidence: satisfied as conservative initial configuration with 50-game index, three-game first analysis, and 10-game analysis tail.
- Scaling/stall thresholds: satisfied as operational policy and telemetry gates, not production measurements.
- Length/account-size coverage: satisfied by synthetic 16/40/80-ply and 10/50/200-game scale profiles; actual production position complexity and account distributions remain unmeasured.
- Bounded implementation budgets: satisfied through explicit handoffs and implementation validation requirements.
- Provider timing validity: satisfied after moving the baseline before synchronous service invocation and rerunning the benchmark.
- Failure-safe observation: satisfied by explicit fulfillment/rejection handling and a final database observation after sync settlement.
- Network isolation: satisfied by rejecting all fetches outside explicit synthetic provider stubs.

## Required validation result

- Current worker/import/index/analysis paths reinspected.
- Synthetic provider responses used; no third-party load generated.
- Benchmark required a local disposable PostgreSQL database with no existing user/game/position/job rows and a `ci`, `test`, or `benchmark` database-name token.
- CI #1840 passed lint, build, audits, architecture guardrails, migrations, benchmark, and the full test suite.
- CI #1883 passed the clean-build benchmark package command, artifact upload, and all repository gates.
- CI #1905 passed lint, build, all opening audits, architecture guardrails, migrations, the corrected benchmark, corrected artifact upload, and the full repository test suite.
- Results record observed sample p50/p90 values and explicit environment/limitations; three-sample p90 values are nearest-rank maxima rather than stable production percentiles.
- Self-review verified that worker analysis configuration is loaded at task execution; the harness now also drives that configuration from the analysis-wave input.
- Worker-wave output records the 5 ms benchmark poll/observer intervals and that jobs are queued before immediate in-process worker startup.
- Local clone remained unavailable because this runtime could not resolve `github.com`; GitHub Actions supplied execution validation.

## Completion updates

- Added safe benchmark harness and clean-build package command.
- Added original and corrected committed benchmark evidence summaries.
- Added research report and two self-review addenda with numeric defaults, progress/ETA policy, evidence corrections, and remaining limitations.
- Corrected provider timer boundaries, observer rejection/final-observation behavior, network isolation, depth configuration, worker-wave metadata, and disposable-name matching.
- Refined dependent task acceptance/budgets and canonical program documents.
- No production runtime behavior, schema, migration, dependency, deployment, or user-facing estimate changed.

## Completion

Report: `reports/ONB-007-2026-08-03-throughput-progress-benchmarks.md`

First self-review addendum: `reports/ONB-007-2026-08-03-self-review-addendum.md`

Third self-review addendum: `reports/ONB-007-2026-08-04-third-self-review-addendum.md`

Original benchmark evidence: `reports/artifacts/ONB-007-2026-08-03-ci-benchmark-summary.json`

Corrected benchmark evidence: `reports/artifacts/ONB-007-2026-08-04-ci-benchmark-summary.json`

Benchmark harness: `apps/api/benchmarks/onboarding-throughput-safe.mjs`

Pull request: [#266](https://github.com/vokerg/chess_repertoir_trainer/pull/266)

Completed at: review accepted; squash merge and post-merge DONE reconciliation pending
