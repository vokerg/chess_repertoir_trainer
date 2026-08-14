# GitHub Issues Coordination

Last updated: 2026-08-14

GitHub Issues is the execution layer for the Onboarding and Data Lifecycle program. Repository documents remain the detailed product, architecture, acceptance, and historical source.

## Program

- Repository: `vokerg/chess_repertoir_trainer`
- Program tracker: [#147](https://github.com/vokerg/chess_repertoir_trainer/issues/147)
- Task mapping: one issue per immutable `ONB-###` task

| ONB task | GitHub issue |
| --- | --- |
| ONB-000 | [#147](https://github.com/vokerg/chess_repertoir_trainer/issues/147) |
| ONB-001 | [#148](https://github.com/vokerg/chess_repertoir_trainer/issues/148) |
| ONB-002 | [#149](https://github.com/vokerg/chess_repertoir_trainer/issues/149) |
| ONB-003 | [#150](https://github.com/vokerg/chess_repertoir_trainer/issues/150) |
| ONB-004 | [#151](https://github.com/vokerg/chess_repertoir_trainer/issues/151) |
| ONB-005 | [#152](https://github.com/vokerg/chess_repertoir_trainer/issues/152) |
| ONB-006 | [#153](https://github.com/vokerg/chess_repertoir_trainer/issues/153) |
| ONB-007 | [#154](https://github.com/vokerg/chess_repertoir_trainer/issues/154) |
| ONB-008 | [#193](https://github.com/vokerg/chess_repertoir_trainer/issues/193) |
| ONB-009 | [#194](https://github.com/vokerg/chess_repertoir_trainer/issues/194) |
| ONB-010 | [#195](https://github.com/vokerg/chess_repertoir_trainer/issues/195) |
| ONB-011 | [#199](https://github.com/vokerg/chess_repertoir_trainer/issues/199) |
| ONB-012 | [#200](https://github.com/vokerg/chess_repertoir_trainer/issues/200) |
| ONB-013 | [#201](https://github.com/vokerg/chess_repertoir_trainer/issues/201) |
| ONB-014 | [#202](https://github.com/vokerg/chess_repertoir_trainer/issues/202) |
| ONB-015 | [#203](https://github.com/vokerg/chess_repertoir_trainer/issues/203) |
| ONB-016 | [#224](https://github.com/vokerg/chess_repertoir_trainer/issues/224) |
| ONB-017 | [#253](https://github.com/vokerg/chess_repertoir_trainer/issues/253) |
| ONB-018 | [#254](https://github.com/vokerg/chess_repertoir_trainer/issues/254) |
| ONB-019 | [#259](https://github.com/vokerg/chess_repertoir_trainer/issues/259) |
| ONB-020 | [#260](https://github.com/vokerg/chess_repertoir_trainer/issues/260) |
| ONB-021 | [#261](https://github.com/vokerg/chess_repertoir_trainer/issues/261) |
| ONB-022 | [#272](https://github.com/vokerg/chess_repertoir_trainer/issues/272) |
| ONB-023 | [#273](https://github.com/vokerg/chess_repertoir_trainer/issues/273) |
| ONB-024 | [#274](https://github.com/vokerg/chess_repertoir_trainer/issues/274) |
| ONB-025 | [#276](https://github.com/vokerg/chess_repertoir_trainer/issues/276) |
| ONB-026 | [#280](https://github.com/vokerg/chess_repertoir_trainer/issues/280) |

All currently allocated ONB IDs are mapped. Do not create a second issue for an existing ONB ID. New tasks receive a new immutable ID and issue in the same coordination change.

## Coordination umbrellas

- [#257 — Durable Account Import and Background Refresh](https://github.com/vokerg/chess_repertoir_trainer/issues/257) groups ONB-011 through ONB-015 plus ONB-025 into the planned delivery sequence `#199 → #200 → (#201 + #202) → #203 → #276`.

A coordination umbrella may summarize an existing multi-task delivery track and record cross-track dependencies. It does not receive an ONB ID, replace any task issue, own runtime scope, alter task priority/status/order, or authorize claims. `TASKS.md` and the individual task files remain authoritative.

For #257, material coordination includes preparation #253/#254, lifecycle persistence/execution #259/#260, throughput #154, Activity Feed import reconciliation #248, and the post-cutover authenticated stale-refresh trigger #276. ONB-007 supplies initial operational defaults and validation gates without changing the umbrella's delivery ownership.

## Related programs

- [#122 — Visual Transformation Program](https://github.com/vokerg/chess_repertoir_trainer/issues/122)
- [#133 — Complete onboarding, empty states, accessibility, and responsive polish](https://github.com/vokerg/chess_repertoir_trainer/issues/133)
- [#105 — Repertoire Builder North Star program](https://github.com/vokerg/chess_repertoir_trainer/issues/105)

Material collisions or dependencies must be recorded in both affected issue threads.

## Sources of truth

- `FOUNDATION.md`, `MASTER_PLAN.md`, `EXPERIENCE_BLUEPRINT.md`, and `DECISIONS.md`: product, interaction, and architecture direction.
- `ROADMAP.md`, `TASKS.md`, and task files: order, dependencies, scope, and acceptance.
- GitHub Issues: claim, assignee, branch, PR, blocker, and execution status.
- `reports/`: append-only evidence and completion record.

When repository metadata and issue state disagree, stop and reconcile before substantive work.

## State mapping

| Repository state | Issue state | Rule |
| --- | --- | --- |
| PROPOSED, READY, BLOCKED | Open | Blockers and dependencies are explicit. |
| CLAIMED | Open | Claimant, scope, and branch are recorded before substantive work. |
| IN_PROGRESS | Open | Meaningful state changes are visible. |
| REVIEW | Open | Reviewable PR and validation are linked. |
| DONE | Closed completed | Close only after acceptance, report, docs, and validation. |
| SUPERSEDED | Closed not planned | Link replacement and rationale. |

## Claim protocol

1. Read root and program AGENTS guidance.
2. Re-inspect current code and relevant branches/PRs.
3. Confirm task is READY or explicitly authorized by the user and dependencies are sufficient for its bounded scope.
4. Check active branches/issues for file and decision collisions.
5. Create a branch containing ONB ID and issue number.
6. Update task claim metadata.
7. Comment on the issue with claimant, exact scope, exclusions, and branch.
8. Move task to CLAIMED/IN_PROGRESS.
9. Begin substantive work.

Recommended branch:

```text
onb-007/issue-154-throughput-progress-benchmark
```

## Work updates

Comment only on meaningful changes:

- claim/release;
- blocker;
- decision or scope change;
- implementation/research start;
- PR;
- validation failure that changes risk;
- review readiness;
- completion or supersession.

## Allocation and handoff notes

ONB-001 allocated ONB-008 through ONB-010 as bounded lifecycle/readiness/Angular implementation tasks.

ONB-002 allocated ONB-011 through ONB-015 as bounded import persistence, worker, provider-adapter, and cutover tasks. Coordination umbrella #257 packages those existing tasks without changing their canonical states and records preparation, lifecycle, operations, Activity Feed, and throughput handoffs.

Current account-import execution state: ONB-011/#199 and ONB-012/#200 are `DONE`; ONB-013/#201 has merged runtime PR #357 and completion reconciliation PR #376; ONB-014/#202 remains `REVIEW` after merged runtime PR #356 because its required real low-volume Chess.com canary is still outstanding; ONB-015/#203 remains `PROPOSED` until both provider adapters are completed.

ONB-025 / #276 is the bounded post-cutover follow-up for automatic stale forward refresh on authenticated application bootstrap. It depends on ONB-015 and must not invoke the legacy synchronous provider path.

ONB-003 allocated:

- ONB-017 / #253 — preparation run/target/batch persistence, bounded database selection, globally serialized admission, and atomic child-job creation;
- ONB-018 / #254 — progressive preparation reconciliation, import pipelining, first-analysis lane, stage-specific account fairness, and acknowledged controls.

ONB-004 allocated:

- ONB-019 / #259 — durable destructive operation, preview/idempotency, resource fences, audit, opening provenance, and deleted-identity tombstone;
- ONB-020 / #260 — bounded account/game un-analysis, un-index, purge, account-delete coordinator and legacy-route cutover;
- ONB-021 / #261 — whole-user deletion, OAuth/auth recreation safety, and mobile local-purge handshake.

ONB-004 also defines the administrator mutation boundary consumed by ONB-005, the retained shared-position boundary consumed by ONB-006, and the acknowledged import/preparation drain required from ONB-011/012/015/017/018.

ONB-005 allocated:

- ONB-022 / #272 — migration-free server-only administrator authorization, verified-session context, capabilities, and bounded read-only diagnostics;
- ONB-023 / #273 — lazy direct-link Angular administrator diagnostics with server authority and no required static navigation entry;
- ONB-024 / #274 — capability-gated preview/execute/status/audit adapters over ONB-019/020/021, with signed recent factor age and one-use reverification binding.

ONB-005 completed through squash-merged PR #275 after three adversarial self-review rounds. ONB-022 is `DONE` through runtime PR #284 and completion reconciliation PR #298. ONB-023 is `DONE` through runtime PR #307 and completion reconciliation PR #312. ONB-024 remains `PROPOSED` behind the applicable lifecycle services and proven signed reverification.

ONB-006 allocated:

- ONB-026 / #280 — dedicated candidate/run persistence, database statement-trigger grace reset, 30-day first-observed grace, input-page-bounded reconcile/observe/dry-run/delete phases, plies-first maintenance locking, observational dry-run/status/control contracts, canonical service plus manual command, and disabled-by-default unscheduled execution.

ONB-026 remains `PROPOSED` until its task-file promotion gates are met. ONB-024 may later expose the canonical cleanup service; it must not own parallel deletion SQL or worker phases.

ONB-007 supplies operational defaults and validation gates to existing owners rather than allocating a new implementation task:

- ONB-008 / #193 and ONB-010 / #195 — exact counts, fixed-denominator percentages, milestones, checked-empty/rate-limit/stall states, and no public ETA;
- ONB-011 / #199 — import counters/checkpoints and bounded-write/telemetry-compatible persistence;
- ONB-012 / #200 — one executor and initial 1-second poll, 15-second heartbeat, 2-minute stale, and 30-second recovery defaults;
- ONB-013 / #201 — serial 14-day Lichess windows, 100-row writes, one-minute 429 cooldown, and a low-volume canary;
- ONB-014 / #202 — serial calendar-month Chess.com access, cache validators, 100-row writes, and a low-volume canary;
- ONB-017 / #253 — 50/3/10 preparation waves and four-batch/200-task/40-analysis global caps;
- ONB-018 / #254 — one-second active/five-second idle reconciliation, three-indexed first-analysis threshold, one-game fallback, and stall codes;
- ONB-022 / #272 — queue age, heartbeat, reconcile lag, rate-limit, and stage-duration diagnostics;
- ONB-026 / #280 — at most 500 input Position/candidate rows inspected per transaction initially, transaction p90 below one second, lock-wait p90 below 250 ms, and measured reduction before release if budgets are breached;
- ONB-020 / #260 and ONB-021 / #261 — operation-specific transaction/lock budgets beginning at no more than 100 game IDs per transaction.

ONB-016 was explicitly authorized as parallel product/experience research. It refines ONB-010 and cross-program handoffs without taking implementation ownership from the other programs.

ONB-007 is `DONE` through squash-merged PR #266. ONB-005 is `DONE` through squash-merged PR #275. ONB-006 is `DONE` through squash-merged PR #281. ONB-017 is `DONE` through runtime PR #282 and completion reconciliation PR #293; issue #253 is closed completed. ONB-022 is `DONE` through runtime PR #284 and completion reconciliation PR #298; issue #272 is closed completed. ONB-023 is `DONE` through runtime PR #307 and completion reconciliation PR #312; issue #273 is closed completed. ONB-013 is being reconciled to `DONE` through PR #376 while issue #201 remains open until that reconciliation merges. ONB-014 remains `REVIEW` on issue #202. No onboarding implementation task is currently unclaimed `READY`; ONB-015, ONB-025, ONB-026, and the other dependency-blocked implementation tasks remain `PROPOSED` until their task-file gates are satisfied. Issue creation, an umbrella, or a numeric handoff alone is not permission to claim blocked work.

## Completion

Before closing:

- accepted deliverable exists;
- task metadata is complete;
- report exists at `reports/ONB-###-YYYY-MM-DD-<slug>.md`;
- validation performed/skipped is recorded;
- ROADMAP, TASKS, STATUS, DECISIONS, and OPEN_QUESTIONS are reassessed;
- follow-up tasks have IDs/issues or are explicitly mapped to existing owners;
- PR/branch/final commit are linked;
- residual risks and queue impact are stated.
