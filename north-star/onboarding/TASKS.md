# Onboarding and Data Lifecycle Task Queue

Last updated: 2026-08-26

This is the canonical ordered queue. IDs are immutable. GitHub Issues carry execution visibility; task files carry detailed scope, acceptance, claim metadata, and completion evidence.

| Order | ID | GitHub issue | Priority | Status | Task | Delivery class | Delivery/dependency state |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 0 | ONB-000 | [#147](https://github.com/vokerg/chess_repertoir_trainer/issues/147) | P0 | DONE | Establish program foundation and master plan | Research/planning | PR #156 |
| 10 | ONB-001 | [#148](https://github.com/vokerg/chess_repertoir_trainer/issues/148) | P0 | DONE | Define onboarding lifecycle and default preparation recipe | Research | PR #197 |
| 20 | ONB-002 | [#149](https://github.com/vokerg/chess_repertoir_trainer/issues/149) | P0 | DONE | Design bounded recent-first import and historical backfill | Research | PR #204 |
| 30 | ONB-003 | [#150](https://github.com/vokerg/chess_repertoir_trainer/issues/150) | P0 | DONE | Design progressive indexing and analysis orchestration | Research | PR #256 |
| 40 | ONB-004 | [#151](https://github.com/vokerg/chess_repertoir_trainer/issues/151) | P0 | DONE | Define safe purge, un-index, un-analyse, and user deletion invariants | Research | PR #263 |
| 50 | ONB-007 | [#154](https://github.com/vokerg/chess_repertoir_trainer/issues/154) | P0 | DONE | Benchmark preparation throughput and define truthful progress semantics | Research | PR #266 |
| 60 | ONB-005 | [#152](https://github.com/vokerg/chess_repertoir_trainer/issues/152) | P1 | DONE | Design administrator authentication, diagnostics, and action model | Research | PR #275 |
| 70 | ONB-006 | [#153](https://github.com/vokerg/chess_repertoir_trainer/issues/153) | P1 | DONE | Design database-only orphan shared-position cleanup | Research | PR #281; allocated ONB-026 |
| 75 | ONB-016 | [#224](https://github.com/vokerg/chess_repertoir_trainer/issues/224) | P1 | DONE | Define lightweight onboarding product and experience blueprint | Research/product design | PR #225 |
| 77 | ONB-017 | [#253](https://github.com/vokerg/chess_repertoir_trainer/issues/253) | P0 | DONE | Persist preparation execution boundary and bounded child-job batches | Implementation | Runtime PR #282; completion PR #293 |
| 78 | ONB-018 | [#254](https://github.com/vokerg/chess_repertoir_trainer/issues/254) | P0 | DONE | Implement progressive preparation reconciliation and control | Implementation | Runtime PR #385; completion PR #397 |
| 80 | ONB-008 | [#193](https://github.com/vokerg/chess_repertoir_trainer/issues/193) | P0 | DONE | Persist onboarding disposition and readiness projection | Implementation | Runtime PR #398, squash `512c248`; completion reconciled 2026-08-26 |
| 90 | ONB-009 | [#194](https://github.com/vokerg/chess_repertoir_trainer/issues/194) | P0 | READY | Implement onboarding lifecycle commands | Implementation | All hard dependencies delivered; fresh collision check required before claim |
| 100 | ONB-010 | [#195](https://github.com/vokerg/chess_repertoir_trainer/issues/195) | P1 | PROPOSED | Build functional onboarding and Home re-entry | Implementation | Depends on ONB-009 plus delivered ONB-008/016/import/preparation foundations |
| 110 | ONB-011 | [#199](https://github.com/vokerg/chess_repertoir_trainer/issues/199) | P0 | DONE | Persist durable account-import runs and scope coverage | Implementation | Runtime PR #339 |
| 120 | ONB-012 | [#200](https://github.com/vokerg/chess_repertoir_trainer/issues/200) | P0 | DONE | Build durable account-import worker and API lifecycle | Implementation | Runtime PR #352; completion PR #354 |
| 130 | ONB-013 | [#201](https://github.com/vokerg/chess_repertoir_trainer/issues/201) | P0 | DONE | Implement bounded Lichess import adapter | Implementation | Runtime PR #357; completion PR #376 |
| 140 | ONB-014 | [#202](https://github.com/vokerg/chess_repertoir_trainer/issues/202) | P0 | DONE | Implement bounded Chess.com import adapter | Implementation | Runtime PR #356; completion PR #383; real canary #2812 |
| 150 | ONB-015 | [#203](https://github.com/vokerg/chess_repertoir_trainer/issues/203) | P1 | DONE | Cut over account sync and preparation handoff | Implementation | Runtime PR #400, squash `c89442f`; completion reconciled 2026-08-26 |
| 155 | ONB-025 | [#276](https://github.com/vokerg/chess_repertoir_trainer/issues/276) | P1 | READY | Trigger daily stale account refresh on authenticated app bootstrap | Implementation | ONB-015/019 delivered; recheck ONB-010/020 integration surfaces before claim |
| 160 | ONB-019 | [#259](https://github.com/vokerg/chess_repertoir_trainer/issues/259) | P0 | DONE | Persist destructive lifecycle operations, fences, audit, and provenance | Implementation | Runtime PR #386, squash `d9175c5`; completion reconciled 2026-08-26 |
| 170 | ONB-020 | [#260](https://github.com/vokerg/chess_repertoir_trainer/issues/260) | P0 | READY | Implement account and imported-game destructive lifecycle coordinator | Implementation | ONB-004/007/011/012/015/017/018/019 delivered; fresh collision check required |
| 180 | ONB-021 | [#261](https://github.com/vokerg/chess_repertoir_trainer/issues/261) | P0 | PROPOSED | Implement whole-user deletion and mobile purge handshake | Implementation | Depends on ONB-020 plus delivered ONB-019 foundation and mobile contracts |
| 185 | ONB-026 | [#280](https://github.com/vokerg/chess_repertoir_trainer/issues/280) | P1 | READY | Implement bounded orphan shared-position cleanup | Implementation | ONB-006/007/019 delivered; claim-time schema/migration and PostgreSQL capability checks mandatory |
| 190 | ONB-022 | [#272](https://github.com/vokerg/chess_repertoir_trainer/issues/272) | P1 | DONE | Build administrator authorization and read-only diagnostics foundation | Implementation | Runtime PR #284; completion PR #298 |
| 200 | ONB-023 | [#273](https://github.com/vokerg/chess_repertoir_trainer/issues/273) | P2 | DONE | Build administrator diagnostics Angular feature | Implementation | Runtime PR #307; completion PR #312 |
| 210 | ONB-024 | [#274](https://github.com/vokerg/chess_repertoir_trainer/issues/274) | P1 | PROPOSED | Add administrator lifecycle previews and controls | Implementation | Depends on canonical lifecycle services, applicable ONB-020/021/026 delivery, and proven reverification |

## Current ready queue

Only `READY` tasks may be newly claimed unless the user explicitly authorizes otherwise.

1. **ONB-009 / #194** — lowest-order unclaimed ready task; onboarding lifecycle commands.
2. **ONB-025 / #276** — independent stale-account-refresh follow-up over the delivered durable account-import path.
3. **ONB-020 / #260** — destructive account/game coordinator over the delivered ONB-019 foundation.
4. **ONB-026 / #280** — shared-position cleanup implementation; claim-time PostgreSQL and migration checks are mandatory.

`READY` does not waive each task file's claim-time collision, environment, migration, or provider/deployment checks.

## Recently reconciled runtime delivery

- ONB-008 runtime PR #398 merged as `512c248689f41a1164be3da63dc22cc97041614b`; issue #193 is closed completed.
- ONB-019 runtime PR #386 merged as `d9175c5d60448399b7297393afc55db747717ce2`; issue #259 is closed completed.
- ONB-015 runtime PR #400 merged as `c89442fbe8945854f0d6d7545e947beb7bebccfe`; issue #203 is closed completed.

Append-only completion records dated 2026-08-26 reconcile those already-accepted runtime deliveries and remove the stale `READY`/`REVIEW` bookkeeping that remained in the repository.

## Ownership carried forward

- ONB-009 owns authenticated onboarding preparation lifecycle commands; it must not duplicate destructive commands.
- ONB-010 owns functional Angular onboarding/Home re-entry.
- ONB-020 owns account/game destructive execution and final immediate DELETE/raw-reset compatibility cutover.
- ONB-021 owns whole-user deletion/mobile purge.
- ONB-025 owns opportunistic authenticated stale-account refresh, not cron scheduling.
- ONB-026 owns shared-position cleanup and stays separate from account/user purge.
- ONB-024 is a thin administrator adapter over canonical lifecycle/cleanup services; it must not create a second mutation state machine.
