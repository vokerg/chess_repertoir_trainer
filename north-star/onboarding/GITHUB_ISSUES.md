# GitHub Issues Coordination

Last updated: 2026-08-26

GitHub Issues is the execution layer for the Onboarding and Data Lifecycle program. Repository documents remain the product, architecture, acceptance, queue, and historical source of truth.

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

All allocated ONB IDs are mapped. Do not create a second issue for an existing ONB ID.

## State mapping

| Repository state | Issue state | Rule |
| --- | --- | --- |
| PROPOSED, READY, BLOCKED | Open | Blockers/dependencies are explicit. |
| CLAIMED, IN_PROGRESS | Open | Claimant, scope, branch, and meaningful progress are visible. |
| REVIEW | Open | Reviewable PR and validation are linked. |
| DONE | Closed completed | Accepted runtime/report/docs/validation are reconciled. |
| SUPERSEDED | Closed not planned | Replacement and rationale are linked. |

When repository metadata and issue state disagree, reconcile them before substantive work.

## Current execution state

### Product/onboarding path

- ONB-008 / #193 — `DONE`; runtime PR #398 squash-merged as `512c248689f41a1164be3da63dc22cc97041614b`; issue closed completed.
- **ONB-009 / #194 — `READY`; issue open; no runtime PR.**
- ONB-010 / #195 — `PROPOSED`; remains behind ONB-009.

### Durable account-import path

- ONB-011 / #199 through ONB-014 / #202 — `DONE`.
- ONB-015 / #203 — `DONE`; runtime PR #400 squash-merged as `c89442fbe8945854f0d6d7545e947beb7bebccfe`; issue closed completed.
- **ONB-025 / #276 — `READY`; issue open; no runtime PR.** It must consume the delivered durable refresh command and ONB-019 admission semantics.
- Coordination umbrella [#257](https://github.com/vokerg/chess_repertoir_trainer/issues/257) groups the account-import delivery track without changing task ownership.

### Destructive lifecycle path

- ONB-019 / #259 — `DONE`; runtime PR #386 squash-merged as `d9175c5d60448399b7297393afc55db747717ce2`; issue closed completed.
- **ONB-020 / #260 — `READY`; issue open; no runtime PR.**
- ONB-021 / #261 — `PROPOSED` behind ONB-020.
- **ONB-026 / #280 — `READY`; issue open; no runtime PR.** Claim-time schema/migration and deployed PostgreSQL capability checks remain mandatory.

### Administrator path

- ONB-022 / #272 and ONB-023 / #273 — `DONE`.
- ONB-024 / #274 — `PROPOSED` behind applicable canonical lifecycle/cleanup services and proven signed reverification.

## Completion records reconciled on 2026-08-26

The runtime merges for ONB-008, ONB-015, and ONB-019 already satisfied acceptance and closed their issues, but repository task/queue records remained stale. The 2026-08-26 program reconciliation records:

- final runtime PR/head/CI/squash commit for each task;
- `DONE` state in task files and canonical ledgers;
- reassessment of `DECISIONS.md` and `OPEN_QUESTIONS.md`;
- promotion of newly unblocked ONB-009, ONB-020, ONB-025, and ONB-026 to `READY`.

## Claim protocol

1. Read root and program AGENTS guidance.
2. Re-inspect current code and relevant branches/PRs.
3. Confirm the task is `READY` or explicitly authorized by the user.
4. Check active branches/issues for file, schema, route, UI, and decision collisions.
5. Create a task branch; never commit runtime task work directly to `main`.
6. Update task claim metadata.
7. Comment on the issue with claimant, exact scope, exclusions, and branch.
8. Move the task to `CLAIMED`/`IN_PROGRESS`.
9. Begin substantive work.

## Current next action

**ONB-009 / #194** is the lowest-order unclaimed `READY` issue. ONB-025 / #276, ONB-020 / #260, and ONB-026 / #280 are also open and `READY` on independent lanes, subject to their task-specific claim-time checks.
