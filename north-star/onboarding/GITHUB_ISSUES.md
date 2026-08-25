# GitHub Issues Coordination

Last updated: 2026-08-24

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

All allocated ONB IDs are mapped. Do not create a second issue for an existing ONB ID. New tasks receive a new immutable ID and issue in the same coordination change.

## Sources of truth

- `FOUNDATION.md`, `MASTER_PLAN.md`, `EXPERIENCE_BLUEPRINT.md`, and `DECISIONS.md`: product, interaction, and architecture direction.
- `ROADMAP.md`, `TASKS.md`, and task files: order, dependencies, scope, and acceptance.
- GitHub Issues: claim, assignee, branch, PR, blocker, and execution status.
- `reports/`: append-only evidence and completion records.

When repository metadata and issue state disagree, reconcile them before substantive work.

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
3. Confirm the task is `READY` or explicitly authorized by the user.
4. Check active branches/issues for file, schema, and decision collisions.
5. Create a branch containing ONB ID and issue number.
6. Update task claim metadata.
7. Comment on the issue with claimant, exact scope, exclusions, and branch.
8. Move the task to `CLAIMED`/`IN_PROGRESS`.
9. Begin substantive work.

## Current execution state

### Preparation/product path

- ONB-017 / #253 — `DONE`; preparation persistence/admission delivered through runtime PR #282 and completion PR #293.
- ONB-018 / #254 — `DONE`; preparation reconciliation/control delivered through runtime PR #385, squash commit `9b0293271a2c1a9f24a77939e828c3ee1aca8ffd`, exact-head CI #2998, and completion reconciliation PR #397.
- ONB-008 / #193 — unclaimed `READY`; now the deterministic lowest-order ready task. It consumes the delivered preparation/import evidence to own disposition/readiness projection.
- ONB-009 / #194 — `PROPOSED`; depends on ONB-008 and must not duplicate destructive lifecycle commands.
- ONB-010 / #195 — `PROPOSED`; depends on ONB-008/009 and consumes ONB-016.

### Durable account-import path

- ONB-011 / #199, ONB-012 / #200, ONB-013 / #201, and ONB-014 / #202 — `DONE`.
- ONB-015 / #203 — `REVIEW` on PR #400 from branch `account-import/onb-015-account-cutover`; durable account refresh, persisted Angular lifecycle state, provider-neutral derived-state reconciliation, and bounded preparation handoff are implemented. Destructive execution remains ONB-020-owned.
- ONB-025 / #276 — `PROPOSED`; depends on ONB-015 acceptance/merge and must consume the durable refresh command rather than any legacy synchronous provider path.
- Coordination umbrella [#257](https://github.com/vokerg/chess_repertoir_trainer/issues/257) groups this delivery track without changing task ownership or claim rules.

### Destructive lifecycle path

- ONB-019 / #259 — unclaimed `READY`; lifecycle/admin research is complete and prior schema ownership/migration-order gates are resolved. A fresh Prisma/migration collision check is mandatory immediately before claim.
- ONB-020 / #260 and ONB-021 / #261 — `PROPOSED` behind ONB-019 and their additional task-file gates.
- ONB-026 / #280 — `PROPOSED` behind its ONB-019 coordination and cleanup-specific gates.

### Administrator path

- ONB-022 / #272 and ONB-023 / #273 — `DONE`.
- ONB-024 / #274 — `PROPOSED` behind applicable canonical lifecycle services and proven signed reverification.

## Coordination boundaries

- ONB-008 owns user disposition, readiness/presentation projection, warnings/actions, and bounded reveals.
- ONB-009 owns authenticated preparation lifecycle command routes.
- ONB-015 owns normal account-sync cutover and preparation handoff.
- ONB-019/020/021 own destructive lifecycle persistence and execution.
- ONB-010 owns functional Angular onboarding/Home re-entry; Visual Transformation owns final product-wide visual/accessibility polish.
- ONB-026 owns shared-position cleanup implementation; account/user purge must not duplicate it.

## ONB-018 completion record

Runtime PR #385 was accepted after three self-review rounds. The final merge-readiness review found and fixed a failure-atomicity gap in pre-engine analysis setup-failure persistence: the failed run and latest-analysis snapshot are now committed in one owned-game-locked PostgreSQL transaction, preserving a current successful analysis for non-forced work.

Final reviewed runtime head `4e3a3a4ea6f3f0f798d52e08830d051ad13c7b95` passed CI #2998 (`32041962372`) end-to-end and PR #385 squash-merged as `9b0293271a2c1a9f24a77939e828c3ee1aca8ffd`. PR #397 reconciles repository completion metadata and downstream readiness before issue #254 is closed completed.

## ONB-015 review record

PR #400 is the active runtime/reconciliation pull request for ONB-015. The review keeps backend destructive DELETE compatibility and deprecated raw cursor-reset compatibility explicitly temporary while the normal product UI disables deletion and uses durable bounded `/backfill`; final destructive route execution remains ONB-020-owned. Exact final-head validation is recorded on PR #400 before it is marked ready for review. ONB-025 remains blocked until ONB-015 is accepted and merged.

## Completion checklist

Before closing a task issue:

- accepted deliverable exists;
- task metadata is complete;
- report exists at `reports/ONB-###-YYYY-MM-DD-<slug>.md`;
- validation performed/skipped is recorded;
- `ROADMAP.md`, `TASKS.md`, `STATUS.md`, `DECISIONS.md`, and `OPEN_QUESTIONS.md` are reassessed;
- follow-up tasks have IDs/issues or are explicitly mapped to existing owners;
- PR/branch/final commit are linked;
- residual risks and queue impact are stated.