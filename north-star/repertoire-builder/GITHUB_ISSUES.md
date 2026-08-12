# GitHub Issues coordination

Last updated: 2026-08-11

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
| RB-027 | [#317](https://github.com/vokerg/chess_repertoir_trainer/issues/317) |
| RB-028 | [#318](https://github.com/vokerg/chess_repertoir_trainer/issues/318) |
| RB-029 | [#319](https://github.com/vokerg/chess_repertoir_trainer/issues/319) |
| RB-030 | [#320](https://github.com/vokerg/chess_repertoir_trainer/issues/320) |
| RB-031 | [#321](https://github.com/vokerg/chess_repertoir_trainer/issues/321) |

## Current coordination state

RB-026 is complete through runtime PR #311 and documentation completion PR #314. Builder V2 planning PR #324 and merged-state planning reconciliation PR #326 are integrated.

Builder V2 execution is complete through RB-027–RB-031:

- #317 / RB-027 — empirical user-move personas, `DONE`, P0; runtime PR #325 / squash `34dadd25`, final runtime CI #2392;
- #318 / RB-028 — factual personal move evidence, `DONE`, P1; PR #327, implementation head `9d0a65a5`, CI #2409;
- #319 / RB-029 — opponent preparation and computed coverage, `DONE`, P1; runtime PR #331 plus corrective PR #333 after the post-merge authority audit; policy `2026-08-opponent-preparation-v1`;
- #320 / RB-030 — single-dialog setup, `DONE`, P1; PR #335, final head `621ee6abb9a311646859357f8de41d4a6c4528e7`, CI #2478, squash `9bfcf3f5`;
- #321 / RB-031 — Cockpit evidence hierarchy, `DONE`, P1; PR #336, final head `a7ed94bdad896bc852685ad25de1dc87bee89e8f`, CI #2486, squash `e6c024af`.

RB-016 / #104 remains open and `BLOCKED`. Its blocker is now only the evidence gate: enough post-V2 Builder/course use, training, and later games must exist before adoption/outcome analysis is meaningful.

There is no unclaimed `READY` Builder task. Do not create implementation work simply to keep the queue active.

Do not create a second issue for an existing `RB-###` task. New repository tasks receive a new immutable RB ID and a new GitHub issue in the same coordination change.

## Sources of truth

- `FOUNDATION.md`, `NORTH_STAR.md`, `BUILDER_V2_PLAN.md`, and `DECISIONS.md`: product direction and stable decisions.
- `TASKS.md` and individual `tasks/RB-###-*.md`: ordering, dependencies, detailed scope, acceptance criteria, and claim metadata.
- GitHub Issues: assignee, execution state, blockers, active branch, and pull-request visibility.
- `reports/`: append-only completion/research evidence.

When issue and repository metadata disagree, stop and reconcile them before substantive work.

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

1. Read the repository task and `BUILDER_V2_PLAN.md` when relevant, then inspect current code and relevant pull requests.
2. Confirm the mapped GitHub issue and live dependency state.
3. Record the claimant and exact scope in the repository task file.
4. Assign the issue when appropriate; otherwise add a claim comment.
5. Record the branch in the issue.
6. Use a short-lived branch from current `main` containing the RB ID where practical.
7. Make the claim visible before substantive implementation or research.

With RB-027–RB-031 complete, a future Builder session must not treat historical V2 task ordering as a live queue. RB-016 stays blocked until its usage gate is satisfied; otherwise a genuinely new requirement needs a new task/issue.

## Pull-request protocol

Every implementation or review pull request must be visible from its GitHub issue.

- Include the RB ID and issue reference in the pull-request title or body.
- Use `Closes #<issue>` only when merging the pull request should complete the task; otherwise use `Refs #<issue>`.
- Record source/target branches, scope, validation performed/pending, and review readiness.
- Do not close an issue merely because a pull request exists or CI passed.
- Never commit directly to `main`; merge only through the accepted squash-merge flow.

## Work-session updates

Update issues on meaningful state changes: claim/transfer, implementation start, blocker, material scope/dependency change, PR creation/replacement, validation failure changing delivery risk, request for review, completion/rejection/supersession.

Avoid low-value comments for every commit.

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

The final issue update should name the report, residual risks, new tasks, and queue impact.
