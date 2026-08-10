# GitHub Issues coordination

Last updated: 2026-08-10

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

RB-026 is complete: runtime PR #311 and documentation completion PR #314 are merged, and issue #310 is closed as completed. Builder V2 planning PR #324 is squash-merged to `main`.

RB-027 runtime implementation is complete through PR #325 / squash `34dadd25`, with final exact-head CI #2392 green.

RB-028 runtime implementation is complete on PR #327. Implementation head `9d0a65a5` passed full CI #2409 and Candidate Decision V4 carries factual exact-position personal evidence without adding new preset-persona ranking authority.

Builder V2 execution state:

- #317 / RB-027 — empirical user-move personas, `DONE`, P0;
- #318 / RB-028 — factual personal move evidence, `DONE`, P1 pending merge/issue closure of PR #327;
- #319 / RB-029 — opponent preparation and computed coverage, `READY`, P1 and next unclaimed policy task;
- #320 / RB-030 — single-dialog setup, `READY`, P1;
- #321 / RB-031 — Cockpit evidence hierarchy, `PROPOSED`, P1 until RB-029 opponent semantics settle.

RB-016 / #104 remains open and blocked. Its blocker includes completion of the V2 decision model plus sufficient post-V2 Builder/course use and follow-up games.

Do not create a second issue for an existing `RB-###` task. New repository tasks receive a new immutable RB ID and a new GitHub issue in the same coordination change.

## Sources of truth

- `FOUNDATION.md`, `NORTH_STAR.md`, `BUILDER_V2_PLAN.md`, and `DECISIONS.md`: product direction.
- `TASKS.md` and individual `tasks/RB-###-*.md`: ordering, dependencies, detailed scope, acceptance criteria, and claim metadata.
- GitHub Issues: assignee, execution state, blockers, active branch, and pull-request visibility.
- `reports/`: append-only completion evidence.

When an issue and repository metadata disagree, stop and reconcile them before substantive work.

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

1. Read the repository task, `BUILDER_V2_PLAN.md` when relevant, and inspect current code plus relevant pull requests.
2. Confirm the mapped GitHub issue.
3. Record the claimant and exact scope in the repository task file.
4. Assign the issue when appropriate; otherwise add a comment naming the agent/session.
5. Record the branch in the issue.
6. Prefer a branch name containing both identifiers, for example `rb-029/issue-319-opponent-preparation`.
7. Make the claim visible before substantive implementation or research.

RB-028 now supplies settled Candidate Decision V4 factual personal evidence. RB-029 can consume exact personal encounters as separated context. RB-031 must not be claimed as if its remaining opponent semantics were already stable.

## Pull-request protocol

Every implementation or review pull request must be visible from its GitHub issue.

- Include the RB ID and issue reference in the pull-request title or body.
- Use `Closes #<issue>` only when merging the pull request should complete the task; otherwise use `Refs #<issue>`.
- Record source/target branches, scope, validation performed/pending, and review readiness.
- Do not close an issue merely because a pull request exists or CI passed.

## Work-session updates

Update issues on meaningful state changes: claim/transfer, implementation start, blocker, material scope/dependency change, PR creation/replacement, validation failure changing delivery risk, request for review, completion/rejection/supersession.

Avoid low-value comments for every commit.

## Dependency links

Repository task files remain the complete dependency definition. Material execution dependencies should also be represented in issue bodies/comments using direct issue references.

For the V2 queue:

- RB-027 / #317 defines the integrated authoritative preset user-move ranking semantics;
- RB-028 / #318 defines settled factual exact-position personal evidence in Candidate Decision V4 without restoring personal history as preset persona authority;
- RB-029 / #319 owns opponent-response preparation/coverage semantics and must preserve RB-009 state behavior;
- RB-030 / #320 owns setup after V2 target/coverage compatibility is clear;
- RB-031 / #321 integrates the settled evidence into the Cockpit after RB-029;
- RB-016 / #104 remains blocked behind V2 delivery plus real use.

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
