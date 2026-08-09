# GitHub Issues coordination

Last updated: 2026-08-09

GitHub Issues is the execution layer for this north-star program. Repository documents remain the detailed planning, architecture, acceptance, and historical source.

## Program location

- Repository: `vokerg/chess_repertoir_trainer`
- Program tracker: [#105 — Repertoire Builder North Star program](https://github.com/vokerg/chess_repertoir_trainer/issues/105)
- Task mapping: one GitHub issue per immutable `RB-###` task

| RB task | GitHub issue |
| --- | --- |
| RB-001 | [#89](https://github.com/vokerg/chess_repertoir_trainer/issues/89) |
| RB-002 | [#90](https://github.com/vokerg/chess_repertoir_trainer/issues/90) |
| RB-003 | [#91](https://github.com/vokerg/chess_repertoir_trainer/issues/91) |
| RB-004 | [#92](https://github.com/vokerg/chess_repertoir_trainer/issues/92) |
| RB-005 | [#93](https://github.com/vokerg/chess_repertoir_trainer/issues/93) |
| RB-006 | [#94](https://github.com/vokerg/chess_repertoir_trainer/issues/94) |
| RB-007 | [#95](https://github.com/vokerg/chess_repertoir_trainer/issues/95) |
| RB-008 | [#96](https://github.com/vokerg/chess_repertoir_trainer/issues/96) |
| RB-009 | [#97](https://github.com/vokerg/chess_repertoir_trainer/issues/97) |
| RB-010 | [#98](https://github.com/vokerg/chess_repertoir_trainer/issues/98) |
| RB-011 | [#99](https://github.com/vokerg/chess_repertoir_trainer/issues/99) |
| RB-012 | [#100](https://github.com/vokerg/chess_repertoir_trainer/issues/100) |
| RB-013 | [#101](https://github.com/vokerg/chess_repertoir_trainer/issues/101) |
| RB-014 | [#102](https://github.com/vokerg/chess_repertoir_trainer/issues/102) |
| RB-015 | [#103](https://github.com/vokerg/chess_repertoir_trainer/issues/103) |
| RB-016 | [#104](https://github.com/vokerg/chess_repertoir_trainer/issues/104) |
| RB-017 | [#114](https://github.com/vokerg/chess_repertoir_trainer/issues/114) |
| RB-018 | [#116](https://github.com/vokerg/chess_repertoir_trainer/issues/116) |
| RB-019 | [#218](https://github.com/vokerg/chess_repertoir_trainer/issues/218) |
| RB-020 | [#219](https://github.com/vokerg/chess_repertoir_trainer/issues/219) |
| RB-021 | [#240](https://github.com/vokerg/chess_repertoir_trainer/issues/240) |
| RB-022 | [#241](https://github.com/vokerg/chess_repertoir_trainer/issues/241) |
| RB-023 | [#242](https://github.com/vokerg/chess_repertoir_trainer/issues/242) |
| RB-024 | [#243](https://github.com/vokerg/chess_repertoir_trainer/issues/243) |
| RB-025 | [#290](https://github.com/vokerg/chess_repertoir_trainer/issues/290) |
| RB-026 | [#310](https://github.com/vokerg/chess_repertoir_trainer/issues/310) |

RB-021 through RB-025 are complete, including RB-025 final reconciliation through PR #300. RB-026 runtime shipped through PR #311 and is in completion review through documentation-only PR #314. Issue #310 remains open until that required closure reconciliation is approved and squash-merged. RB-016 remains independently blocked on real-use evidence.

Do not create a second issue for an existing `RB-###` task. New repository tasks receive a new immutable RB ID and a new GitHub issue in the same change or coordination session.

## Sources of truth

- `FOUNDATION.md`, `NORTH_STAR.md`, and `DECISIONS.md`: product direction.
- `TASKS.md` and individual `tasks/RB-###-*.md`: ordering, dependencies, detailed scope, acceptance criteria, and claim metadata.
- GitHub Issues: assignee, execution state, blockers, active branch, and pull-request visibility.
- `reports/`: append-only completion evidence.

When an issue and repository metadata disagree, stop and reconcile them before substantive work. Do not silently choose one.

## State mapping

| Repository state | GitHub issue state | Rule |
| --- | --- | --- |
| PROPOSED, READY, BLOCKED | Open | Record blockers and dependency issue links in the issue. |
| CLAIMED | Open | Assign the issue or comment with claimant, exact scope, and branch before substantive work. |
| IN_PROGRESS | Open | Keep ownership, branch, and progress visible in the issue. |
| REVIEW | Open | Link the reviewable pull request and record validation status. |
| DONE | Closed as completed | Close only after accepted work, report, documentation updates, and validation summary. |
| SUPERSEDED | Closed as not planned | Link the replacement task/issue and explain the rationale. |

A blocked task stays open. Its blocker must be explicit and linked.

## Claim and branch protocol

Before work:

1. Read the repository task and inspect current code and relevant pull requests.
2. Confirm the mapped GitHub issue.
3. Record the claimant and exact scope in the repository task file.
4. Assign the issue when appropriate; otherwise add a comment naming the agent/session.
5. Record the branch in the issue.
6. Prefer a branch name containing the RB ID and issue number, for example `rb-008/issue-96-visual-candidate-prototype`.
7. Make the claim visible before substantive implementation or research.

## Pull-request protocol

Every implementation or review pull request must be visible from its GitHub issue.

- Include the RB ID and issue reference in the pull-request title or body.
- Recommended title pattern: `RB-008: prototype visual candidate choices (#96)`.
- Use `Closes #<issue>` only when merging the pull request should complete the task; otherwise use `Refs #<issue>`.
- Immediately after opening a pull request, ensure the issue or pull-request body records scope, validation performed, validation pending, and review readiness.
- Do not close an issue merely because a pull request was opened or CI passed.

## Work-session updates

Contributors should update the issue during meaningful state changes:

- claim or ownership transfer;
- start of substantive work;
- newly discovered blocker;
- scope or dependency change;
- pull-request creation or replacement;
- validation failure that changes delivery risk;
- request for review;
- completion, rejection, or supersession.

Avoid low-value comments for every commit. Issues should record decisions and state changes another contributor needs to understand.

## Dependency links

Repository task files remain the complete dependency definition. Material execution dependencies should also be linked in issue bodies or comments using direct issue references.

When a dependency changes:

1. update the task file;
2. update `TASKS.md` if ordering or dependency changed;
3. update affected issue references or comments;
4. reassess the roadmap and queue in the completion report.

## Completion protocol

Before closing an issue as completed:

- implementation or research is accepted;
- the task file is updated;
- `reports/RB-###-YYYY-MM-DD-<slug>.md` exists;
- validation performed and skipped is recorded;
- pull request and final branch are linked where applicable;
- `STATUS.md`, `TASKS.md`, `ROADMAP.md`, `DECISIONS.md`, and `OPEN_QUESTIONS.md` are updated as required;
- new tasks have both RB IDs and GitHub issues;
- queue reprioritization was explicitly considered.

The final issue update should link or name the report and state residual risks, new tasks, and queue impact.
