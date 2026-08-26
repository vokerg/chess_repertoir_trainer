# Onboarding and Data Lifecycle Roadmap

Last updated: 2026-08-26

Program: [#147](https://github.com/vokerg/chess_repertoir_trainer/issues/147)

This roadmap summarizes current delivery order. Detailed historical decisions and validation live in task files, `DECISIONS.md`, `OPEN_QUESTIONS.md`, and append-only reports.

## Product/onboarding critical path

```text
ONB-001 lifecycle/default recipe — DONE
        +
ONB-002 durable bounded import/backfill — DONE
        +
ONB-003 progressive preparation orchestration — DONE
        +
ONB-007 throughput/progress evidence — DONE
        ↓
ONB-011/012 durable import persistence + worker/API — DONE
        +
ONB-013/014 provider adapters — DONE
        +
ONB-017/018 preparation execution + reconciliation — DONE
        ↓
ONB-008 disposition/readiness projection — DONE
        ↓
ONB-009 lifecycle commands — READY
        ↓
ONB-010 functional onboarding/Home re-entry — PROPOSED
        +
ONB-016 lightweight experience blueprint — DONE
        ↓
Visual/accessibility integration
        ↓
Production onboarding release
```

ONB-008 runtime PR #398 is merged as `512c248689f41a1164be3da63dc22cc97041614b`. The next deterministic product-path implementation is ONB-009.

## Account-sync lane

```text
ONB-011/012 durable import foundation — DONE
        +
ONB-013/014 provider adapters — DONE
        +
ONB-017/018 preparation handoff foundation — DONE
        ↓
ONB-015 account-sync cutover/preparation handoff — DONE
        ↓
ONB-025 authenticated stale-account refresh trigger — READY
```

ONB-015 runtime PR #400 is merged as `c89442fbe8945854f0d6d7545e947beb7bebccfe`. Normal account refresh now durably accepts background imports rather than traversing providers inside the request. ONB-025 is an opportunistic return-to-app trigger, not a cron guarantee.

## Destructive lifecycle and cleanup lane

```text
ONB-004 destructive invariants — DONE
        +
ONB-019 operation/fence/audit/provenance foundation — DONE
        ↓
ONB-020 account/game destructive coordinator — READY
        ↓
ONB-021 whole-user/mobile purge — PROPOSED

ONB-006 cleanup design — DONE
        +
ONB-007 transaction/lock budgets — DONE
        +
ONB-019 lifecycle conventions — DONE
        ↓
ONB-026 bounded orphan shared-position cleanup — READY
```

ONB-019 runtime PR #386 is merged as `d9175c5d60448399b7297393afc55db747717ce2`. It supplies durable operations/fences/audit and guarded commit primitives; ONB-020 still owns destructive row execution and final account DELETE/reset compatibility cutover.

ONB-026 remains a separate shared-position maintenance service. Its `READY` state does not waive the required claim-time schema/migration collision check or deployed PostgreSQL transition-relation compatibility verification.

## Administrator lane

```text
ONB-005 administrator architecture — DONE
        ↓
ONB-022 server authorization/read-only diagnostics — DONE
        ↓
ONB-023 Angular diagnostics — DONE
        ↓
ONB-024 administrator lifecycle adapters — PROPOSED
```

ONB-024 must remain a thin adapter over the canonical lifecycle/cleanup services and proven signed reverification. It must not create an administrator-only mutation state machine.

## Phase status

### Phase 0 — Program foundation

`DONE` — canonical planning workspace, master plan, decisions/open questions, execution rules, and issue mapping.

### Phase 1 — Research and contracts

`DONE` — lifecycle/default recipe, bounded import/backfill, preparation orchestration, destructive lifecycle, administration, cleanup, throughput/progress, and lightweight experience blueprint.

### Phase 2 — Durable account-import foundation

`DONE` — ONB-011/012.

### Phase 3 — Provider adapters

`DONE` — ONB-013/014, including the bounded real Chess.com canary evidence recorded by ONB-014.

### Phase 4 — Preparation execution core

`DONE` — ONB-017/018.

### Phase 5 — Product projection and lifecycle commands

Current state:

- ONB-008 / #193 — `DONE`.
- **ONB-009 / #194 — `READY`.**

Exit requires authenticated/idempotent lifecycle commands over the delivered projection/execution state without a second browser state machine.

### Phase 6 — Account-sync cutover and functional onboarding

Current state:

- ONB-015 / #203 — `DONE`.
- ONB-010 / #195 — `PROPOSED` behind ONB-009.
- **ONB-025 / #276 — `READY`** as a bounded post-cutover follow-up.

### Phase 7 — Destructive lifecycle and cleanup

Current state:

- ONB-019 / #259 — `DONE`.
- **ONB-020 / #260 — `READY`.**
- ONB-021 / #261 — `PROPOSED` behind ONB-020.
- **ONB-026 / #280 — `READY`** with mandatory claim-time environment/migration checks.

### Phase 8 — Administrator lifecycle controls

Current state:

- ONB-022 / #272 — `DONE`.
- ONB-023 / #273 — `DONE`.
- ONB-024 / #274 — `PROPOSED` behind applicable canonical lifecycle services and proven signed reverification.

## Operational constraints carried forward

- No weighted overall preparation percentage while import can discover work.
- No public ETA until ONB-007 production-telemetry eligibility gates are satisfied.
- Provider I/O and Stockfish/LLM execution stay outside long database transactions and lifecycle guards.
- Destructive/cleanup work uses bounded transaction sizes, deterministic checkpoints, and measured lock/query behavior.
- Shared `Position`, `PositionAnalysis`, and caches are not opportunistically deleted by account/user lifecycle operations.
- Browser state is not authoritative for durable import, preparation, onboarding, or destructive lifecycle state.

## Next deterministic action

**ONB-009 / #194** is the lowest-order unclaimed `READY` task. ONB-025, ONB-020, and ONB-026 are also ready on independent lanes subject to their task-file claim-time collision and environment checks.
