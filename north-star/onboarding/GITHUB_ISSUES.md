# GitHub Issues Coordination

Last updated: 2026-07-30

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

Do not create a second issue for an existing ONB ID. New tasks receive a new immutable ID and issue in the same coordination change.

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
onb-003/issue-150-progressive-preparation-orchestration
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

## Allocation notes

ONB-001 allocated ONB-008 through ONB-010 as bounded lifecycle/readiness/Angular implementation tasks.

ONB-002 allocated ONB-011 through ONB-015 as bounded import persistence, worker, provider-adapter, and cutover tasks.

ONB-016 was explicitly authorized as parallel product/experience research. It refines ONB-010 and cross-program handoffs without promoting blocked implementation work or taking ownership from ONB-003, ONB-007, VT-302, Player Chess Profile, tactical training, or Repertoire Builder.

All allocated implementation issues remain `PROPOSED` until their dependency conditions in `TASKS.md` and task files are satisfied. Issue creation is planning allocation, not permission to claim or implement them early.

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
