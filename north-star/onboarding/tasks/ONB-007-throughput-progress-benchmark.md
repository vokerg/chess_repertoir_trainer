# ONB-007 — Benchmark preparation throughput and define truthful progress semantics

Status: IN_PROGRESS

Priority: P0

Order: 50

Delivery class: Research

Planning maturity: Claimed; current implementation inspection and benchmark design in progress

GitHub issue: [#154](https://github.com/vokerg/chess_repertoir_trainer/issues/154)

Claimed by: ChatGPT/Codex research session for `vokerg`

Claim branch: `onb-007/issue-154-throughput-progress-benchmark`

Claimed at: 2026-08-03

Claim scope: inspect current import, job, indexing, analysis, tagging/tactical, worker, deployment, fixture, and progress-reporting paths; define and run safe reproducible local/CI benchmark harnesses where possible; separate deterministic processing from provider-network observations; produce measured defaults, truthful progress/ETA policy, operational budgets, task handoffs, and canonical documentation; no production scaling, provider load test, queue replacement, or speculative optimization

## Outcome

Measure current import, indexing, analysis, and derived-refresh throughput so first-value targets, wave policy, resource limits, progress wording, and any future estimate are evidence-based.

## Why this task exists

The proposed recent-first flow depends on a single background worker and expensive per-game Stockfish tasks. The user-visible batch target of roughly 50 and any completion expectation are currently assumptions.

## Current repository anchors to inspect

- `apps/api/src/modules/jobs/`
- `apps/api/src/modules/analysis/`
- `apps/api/src/modules/imported-games/`
- provider import services
- worker and Stockfish configuration
- existing performance/regression tests and scripts
- `docs/deployment.md`
- representative database fixtures or safe local datasets

## Dependencies

- ONB-000.
- Feed evidence into ONB-002 and ONB-003.
- Coordinate progress wording with ONB-001 and cleanup budgets with ONB-006.
- Consume ONB-016 first-value milestones and ONB-003 lane-order handoff.

## In scope

- Reproducible fixture/data profiles and benchmark harness boundary.
- p50/p90 durations for import, index, analyse, process, and derived refresh.
- Time to first imported/indexed/analysed value and default-scope completion.
- CPU, memory, database, provider, and engine-startup observations.
- Wave-size and queued-backlog recommendation.
- Exact versus estimated progress policy.
- Minimum evidence/confidence before showing an ETA.
- Stalled-work and scaling triggers.
- Performance budgets for implementation tasks.

## Out of scope

- Production scaling changes.
- Additional queue infrastructure or worker replicas.
- Unsupported load against third-party providers.
- Optimizations without a demonstrated bottleneck.
- User-facing ETA before evidence exists.

## Questions owned

See `OPEN_QUESTIONS.md` under ONB-007.

## Acceptance criteria

- Results are reproducible and record runtime, database, engine, depth, and fixture metadata.
- Exact count progress remains possible without ETA.
- Wave-size recommendation is tied to first-value and operational data.
- Scaling/stall thresholds are explicit.
- Benchmarks cover representative game lengths and account sizes.
- Findings feed bounded implementation acceptance budgets.

## Required validation

- Reinspect current worker and analysis paths.
- Run narrow benchmark harnesses in a safe local/test environment.
- Separate provider-network measurements from deterministic local processing.
- Record variance and limitations, not just averages.
- Avoid drawing production conclusions from one machine without qualification.

## Completion updates

- Report, benchmark artifacts, decisions, open questions, queue, issue #154, and implementation budgets/tasks.

## Completion

Report: none

Pull request: none

Completed at: none
