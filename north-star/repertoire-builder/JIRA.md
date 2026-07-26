# Jira coordination

Last updated: 2026-07-26

Jira is the execution mirror for this north-star program. Repository documents remain the detailed planning, architecture, acceptance, and historical source.

## Jira location

- Project: `CRT` — Chess Repertoire Trainer
- Epic: `CRT-2` — Repertoire Builder north-star program
- Task mapping: one Jira Task per immutable `RB-###` task

| RB task | Jira |
| --- | --- |
| RB-001 | CRT-3 |
| RB-002 | CRT-4 |
| RB-003 | CRT-5 |
| RB-004 | CRT-6 |
| RB-005 | CRT-7 |
| RB-006 | CRT-8 |
| RB-007 | CRT-9 |
| RB-008 | CRT-10 |
| RB-009 | CRT-11 |
| RB-010 | CRT-12 |
| RB-011 | CRT-13 |
| RB-012 | CRT-14 |
| RB-013 | CRT-15 |
| RB-014 | CRT-16 |
| RB-015 | CRT-17 |
| RB-016 | CRT-18 |

Do not create a second Jira for an existing `RB-###` task. New repository tasks receive a new immutable RB ID and a new Jira under `CRT-2` in the same change or coordination session.

## Sources of truth

- `FOUNDATION.md`, `NORTH_STAR.md`, and `DECISIONS.md`: product direction.
- `TASKS.md` and individual `tasks/RB-###-*.md`: ordering, dependencies, detailed scope, acceptance criteria, and claim metadata.
- Jira: assignee, execution status, blockers, active branch, pull request visibility, and day-to-day coordination.
- `reports/`: append-only completion evidence.

When Jira and repository metadata disagree, stop and reconcile them before substantive work. Do not silently choose one.

## Workflow mapping

The CRT project supports `To Do`, `In Progress`, `In Review`, and `Done`.

| Repository state | Jira state | Rule |
| --- | --- | --- |
| PROPOSED, READY, BLOCKED | To Do | Record blockers with Jira issue links or comments. |
| CLAIMED | To Do | Assign or comment with claimant and branch; the visible claim must exist before substantive work. |
| IN_PROGRESS | In Progress | Transition with the first meaningful work commit. |
| REVIEW | In Review | Transition when a reviewable PR or explicit review artifact exists. |
| DONE | Done | Only after accepted work, repository report, documentation updates, and validation summary. |
| SUPERSEDED | Done | Comment with replacement task/Jira and rationale before closing. |

A blocked task stays `To Do` unless work is actively underway and becomes blocked mid-task. In that case it may remain `In Progress`, but the blocker must be explicit and linked.

## Claim and branch protocol

Before work:

1. Read the repository task and inspect current code and relevant PRs.
2. Confirm Jira is the mapped issue under `CRT-2`.
3. Record the claimant and exact scope in the repository task file.
4. Assign the Jira when an assignable human account is appropriate; otherwise add a comment naming the agent/session.
5. Record the branch in Jira.
6. Use a branch name containing both keys where practical, for example `rb-008/crt-10-visual-candidate-prototype`.
7. Make the claim visible before substantive implementation or research.

## Pull-request protocol

Every implementation or review PR must be visible from Jira.

- Include the Jira key and RB ID in the PR title or body, preferably both.
- Recommended PR title pattern: `CRT-10 RB-008: prototype visual candidate choices`.
- Include the Jira key in commit messages where practical so Atlassian development integration can associate branches and commits.
- Immediately after opening a PR, add a Jira comment containing:
  - PR URL;
  - source and target branches;
  - scope summary;
  - validation performed and still pending;
  - whether the issue is ready for `In Review`.
- Transition Jira to `In Review` when the PR or review artifact is genuinely reviewable.
- Do not mark Jira `Done` merely because a PR was opened or CI passed.

If automatic Development-panel linkage is unavailable, the Jira comment is mandatory.

## Work-session updates

ChatGPT, Copilot, Codex, and human contributors must update Jira during meaningful state changes:

- claim or ownership transfer;
- start of substantive work;
- newly discovered blocker;
- scope or dependency change;
- PR creation or replacement;
- validation failure that changes delivery risk;
- request for review;
- completion, rejection, or supersession.

Avoid low-value comments for every commit. Jira comments should record decisions and state changes that another contributor needs to understand.

## Dependency links

Use Jira `Blocks` links for material execution dependencies. Repository task files remain the complete dependency definition, but important blockers must also be visible in Jira.

When a dependency changes:

1. update the task file;
2. update `TASKS.md` if ordering or dependency changed;
3. add, remove, or explain the Jira link;
4. comment on affected active issues;
5. reassess the roadmap and queue in the completion report.

## Completion protocol

Before transitioning Jira to `Done`:

- implementation or research is accepted;
- the task file is updated;
- `reports/RB-###-YYYY-MM-DD-<slug>.md` exists;
- validation performed and skipped is recorded;
- PR and final branch are visible in Jira where applicable;
- `STATUS.md`, `TASKS.md`, `ROADMAP.md`, `DECISIONS.md`, and `OPEN_QUESTIONS.md` are updated as required;
- new tasks have both RB IDs and Jira issues;
- queue reprioritization was explicitly considered.

The final Jira comment should link or name the report and state residual risks, new tasks, and queue impact.

## Jira maintenance rule

Agents with Jira access must perform the Jira updates themselves. Agents without Jira access must not pretend Jira was updated; they must leave a clearly marked Jira update checklist in the report and keep the task out of `DONE` until synchronization is completed.