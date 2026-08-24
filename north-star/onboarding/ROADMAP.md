# Onboarding and Data Lifecycle Roadmap

Last updated: 2026-08-24

Program: [#147](https://github.com/vokerg/chess_repertoir_trainer/issues/147)

This roadmap summarizes current delivery order. Detailed historical decisions and validation live in task files, `DECISIONS.md`, and append-only reports.

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
ONB-011 import persistence/coverage — DONE
        +
ONB-017 preparation execution persistence/batches — DONE
        ↓
ONB-012 import worker/API lifecycle — DONE
        ↓
ONB-013 Lichess adapter + ONB-014 Chess.com adapter — DONE
        +
ONB-018 preparation reconciliation/control — DONE
        ↓
ONB-008 disposition/readiness projection — READY
        ↓
ONB-009 lifecycle commands — PROPOSED
        ↓
ONB-010 functional onboarding and Home re-entry — PROPOSED
        +
ONB-016 lightweight experience blueprint — DONE
        ↓
Visual/accessibility integration with #133
        ↓
Production onboarding release
```

ONB-015 / #203 is in `REVIEW` on PR #400 for the account-sync/preparation cutover. It remains an integration lane alongside the product-projection path and preserves ONB-020 ownership of destructive execution.

ONB-025 / #276 remains a post-ONB-015 stale-account-refresh follow-up and does not gate initial onboarding release.

## Supporting administration and data-lifecycle path

```text
ONB-004 destructive invariants — DONE
        +
ONB-005 administrator architecture — DONE
        ├──────────────→ ONB-022 server authorization/read-only diagnostics — DONE
        │                              ↓
        │                    ONB-023 Angular diagnostics — DONE
        │
        └→ ONB-019 operation/fence/audit/provenance foundation — READY
                               ↓
                    ONB-020 account/game coordinator — PROPOSED
                               ↓
                    ONB-021 whole-user/mobile purge — PROPOSED
                               +
                    ONB-006 cleanup research — DONE
                               ↓
                    ONB-026 bounded orphan cleanup implementation — PROPOSED
                               ↓
                    ONB-024 administrator lifecycle adapters — PROPOSED
```

ONB-019 remains independently claimable after a fresh schema/migration collision check. ONB-024 must consume canonical lifecycle/cleanup services and proven signed reverification rather than create parallel mutation semantics.

## Phase 0 — Program foundation

Status: `DONE`.

Delivered canonical planning workspace, master plan, decisions/open questions, execution rules, and issue mapping.

## Phase 1 — Research and contracts

Status: `DONE`.

Completed research/product tasks:

- ONB-001 / #148 — lifecycle/default recipe.
- ONB-002 / #149 — bounded import/backfill.
- ONB-003 / #150 — preparation orchestration.
- ONB-004 / #151 — destructive lifecycle.
- ONB-005 / #152 — administrator architecture.
- ONB-006 / #153 — orphan cleanup.
- ONB-007 / #154 — throughput/progress.
- ONB-016 / #224 — lightweight product/experience blueprint.

The accepted contracts establish repeatable preparation runs, exact coverage, bounded child jobs, acknowledged controls, truthful progress/no public ETA, durable destructive-fence semantics, administrator authorization boundaries, and a separate database-only orphan-cleanup path.

## Phase 2 — Durable account-import foundation

Status: `DONE`.

Delivered:

- ONB-011 / #199 — durable import persistence/contracts/coverage.
- ONB-012 / #200 — authenticated API and restart-safe provider worker lifecycle.

Key properties: immutable mode/source/scope/range, exact account/scope coverage, one non-terminal import per account, claim/heartbeat/fencing/stale recovery, pause/cancel/retry, bounded persistence, and drainable work.

## Phase 3 — Provider adapters

Status: `DONE`.

Delivered:

- ONB-013 / #201 — bounded Lichess adapter.
- ONB-014 / #202 — bounded Chess.com adapter with successful real low-volume canary.

Provider work is serial and bounded, coverage advances conservatively, and failed/incomplete windows are replayable.

## Phase 4 — Preparation execution core

Status: `DONE`.

Delivered:

- ONB-017 / #253 — preparation parent/target/batch persistence, server-side candidate selection, globally serialized bounded admission, retained child evidence.
- ONB-018 / #254 — bounded reconciliation loop, committed-import pipelining, first-analysis lane/fallback, stage fairness, exact milestones/core readiness, restart-safe controls/retry, persisted wake hints, retention reconciliation, and stall telemetry.

ONB-018 runtime PR #385 squash-merged as `9b0293271a2c1a9f24a77939e828c3ee1aca8ffd`. Final reviewed head `4e3a3a4ea6f3f0f798d52e08830d051ad13c7b95` passed CI #2998 (`32041962372`).

Phase exit achieved:

- browser presence is not required for preparation to advance;
- current game/import evidence is authoritative;
- direct-user jobs remain ahead of preparation work;
- queue/admission is bounded;
- core readiness does not wait for full analysis;
- failed work is not automatically retried forever;
- no public ETA is introduced.

## Phase 5 — Product projection and lifecycle commands

Current state:

- **ONB-008 / #193 — `READY`** — persist user disposition and expose one server-owned readiness/presentation projection with exact counts, milestones, deterministic actions, and feature-specific readiness.
- ONB-009 / #194 — `PROPOSED` — authenticated start/pause/resume/cancel/retry/restart/expansion commands after ONB-008 contracts are settled; destructive commands remain ONB-019/020/021-owned.

Exit:

- clients consume one deterministic onboarding projection;
- lifecycle commands are authenticated/idempotent and restore correctly after reload/restart;
- product actions do not infer a second lifecycle state machine.

## Phase 6 — Account-sync cutover and functional onboarding

Current state:

- **ONB-015 / #203 — `REVIEW`** — PR #400 replaces normal synchronous provider traversal with durable import acceptance/status and connects account UI to persisted background execution/preparation handoff; final acceptance/merge is still pending.
- ONB-010 / #195 — `PROPOSED` — functional `/onboarding` and Home re-entry after ONB-008/009.
- ONB-025 / #276 — `PROPOSED` — authenticated stale-account refresh after ONB-015.

Exit:

- no normal account HTTP route performs synchronous provider traversal;
- no all-game/candidate ID arrays cross the API/browser boundary for preparation;
- active import/preparation state survives navigation/reload/device changes;
- onboarding is functional and accessible before final Visual Transformation polish.

## Phase 7 — Destructive lifecycle and cleanup

Current state:

- **ONB-019 / #259 — `READY`** — durable operation/fence/audit/provenance foundation.
- ONB-020 / #260 — `PROPOSED` — account/game un-analysis, un-index, purge, delete coordinator.
- ONB-021 / #261 — `PROPOSED` — whole-user deletion/mobile purge handshake.
- ONB-026 / #280 — `PROPOSED` — bounded orphan shared-position cleanup.

Exit:

- destructive work is previewed, fenced, idempotent, audited, restart-safe, and bounded;
- stale provider/job/synchronous writers cannot commit after the relevant fence;
- shared Position cleanup remains database-proved and separate from account/user purge.

## Phase 8 — Administrator lifecycle controls

Current state:

- ONB-022 / #272 — `DONE`.
- ONB-023 / #273 — `DONE`.
- ONB-024 / #274 — `PROPOSED` behind canonical lifecycle services and proven signed reverification.

Exit:

- administrator mutation UI/API are thin adapters over canonical lifecycle services;
- no second destructive execution path exists;
- recent-auth/reverification evidence is server-verified and one-use where required.

## Operational constraints carried forward

- no weighted overall preparation percentage while import can discover work;
- no public ETA until ONB-007 production-telemetry eligibility gates are satisfied;
- preparation remains below direct-user priority;
- provider I/O and Stockfish execution stay outside long database transactions;
- lifecycle/cleanup work uses bounded transaction sizes and must prove lock/query behavior before increases;
- shared `Position`, `PositionAnalysis`, and caches are not opportunistically deleted by account/user lifecycle operations.

## Next deterministic action

ONB-008 / #193 remains the lowest-order task recorded as unclaimed `READY` in the canonical queue. ONB-015 / #203 is already claimed and in `REVIEW` on PR #400; ONB-019 / #259 remains `READY` on its parallel support path. Every new claim must recheck live branches/PRs and relevant file/schema ownership first.