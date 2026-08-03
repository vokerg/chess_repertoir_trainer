# ONB-007 — Benchmark preparation throughput and define truthful progress semantics

Status: REVIEW

Priority: P0

Order: 50

Delivery class: Research

Planning maturity: Research and reproducible benchmark complete; review and merge pending

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
- Representative 10/50/200-game import/admission fixtures: complete.
- 16/40/80-ply index/tag fixtures: complete.
- Depth-1 and depth-12 WASM analysis plus combined process fixtures: complete.
- Actual worker-wave measurements for 50-game index and three-game analysis: complete.
- CPU/RSS/environment metadata and limitations: complete.
- Wave, backlog, reconcile, import-loop, stall, and scaling defaults: complete.
- Exact progress and later ETA eligibility policy: complete.
- Implementation acceptance budgets and handoffs: complete.

## Out of scope result

No production scaling, worker replica, provider load test, queue infrastructure, public ETA, or unmeasured optimization was introduced.

## Questions owned

Resolved in `reports/ONB-007-2026-08-03-throughput-progress-benchmarks.md`.

Production/provider validation remains an implementation telemetry gate rather than an unresolved architecture question.

## Acceptance criteria result

- Reproducible metadata: satisfied by `apps/api/benchmarks/onboarding-throughput-safe.mjs` and the committed evidence summary.
- Exact progress without ETA: satisfied; public ETA remains disabled.
- Wave-size recommendation tied to evidence: satisfied with 50-game index, three-game first analysis, and 10-game analysis tail.
- Scaling/stall thresholds: satisfied in the report.
- Representative lengths/account sizes: satisfied by 16/40/80-ply and 10/50/200-game profiles.
- Bounded implementation budgets: satisfied through explicit handoffs.

## Required validation result

- Current worker/import/index/analysis paths reinspected.
- Synthetic provider responses used; no third-party load generated.
- Benchmark required a fresh local disposable PostgreSQL database.
- CI #1840 passed lint, build, audits, architecture guardrails, migrations, benchmark, and the full test suite.
- Results record p50/p90 and explicit environment/limitations.
- Local clone remained unavailable because this runtime could not resolve `github.com`; GitHub Actions supplied execution validation.

## Completion updates

- Added safe benchmark harness and package command.
- Added committed benchmark evidence summary.
- Added research report with numeric defaults and progress/ETA policy.
- Refined dependent task acceptance/budgets and canonical program documents.
- No production runtime behavior, schema, migration, dependency, deployment, or user-facing estimate changed.

## Completion

Report: `reports/ONB-007-2026-08-03-throughput-progress-benchmarks.md`

Benchmark evidence: `reports/artifacts/ONB-007-2026-08-03-ci-benchmark-summary.json`

Benchmark harness: `apps/api/benchmarks/onboarding-throughput-safe.mjs`

Pull request: [#266](https://github.com/vokerg/chess_repertoir_trainer/pull/266)

Completed at: review pending
