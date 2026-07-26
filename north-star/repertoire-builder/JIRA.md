# Jira coordination

Last updated: 2026-07-26

Jira is the currently documented execution mirror for this north-star program. Repository documents remain the detailed planning, architecture, acceptance, and historical source.

The continued use of Jira is now under review because the ChatGPT Atlassian connector is not installed or connected on the target Atlassian site. A GitHub-native replacement is described below but is not activated by this document alone.

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

Do not create a second Jira issue for an existing `RB-###` task while Jira remains the approved execution tracker.

## Current connector clarification

The Atlassian/Rovo connector was retested on 2026-07-26 with a direct search for CRT-4. It returned HTTP 403 with the explicit detail:

```text
The app is not installed on this instance
```

This is materially different from a Jira project-permission failure:

- the user may have sufficient access to the CRT project;
- granting user permissions does not install the ChatGPT/Rovo app on the Atlassian site;
- the Atlassian site administrator must install/approve the app or reconnect the site integration;
- until that happens, this ChatGPT session cannot discover the cloud ID, inspect CRT issues, add comments, change assignees or transition workflow state.

No Jira state should be inferred from this connector error. The repository records only the last verified Jira state.

## Sources of truth

- `FOUNDATION.md`, `NORTH_STAR.md`, and `DECISIONS.md`: product direction.
- `TASKS.md` and individual `tasks/RB-###-*.md`: ordering, dependencies, detailed scope, acceptance criteria, and claim metadata.
- Jira, while retained: assignee, execution status, blockers, active branch, pull request visibility, and day-to-day coordination.
- `reports/`: append-only completion evidence.

When Jira and repository metadata disagree, stop and reconcile them before substantive work. Do not silently choose one.

When Jira is unreachable through the available agent tooling:

- do not claim that Jira was inspected or updated;
- record the exact error and a synchronization checklist;
- a human may perform the Jira update manually;
- keep the task out of `DONE` until the selected execution tracker is synchronized.

## Workflow mapping

The CRT project was last verified to support `To Do`, `In Progress`, `In Review`, and `Done`.

| Repository state | Jira state | Rule |
| --- | --- | --- |
| PROPOSED, READY, BLOCKED | To Do | Record blockers with Jira issue links or comments. |
| CLAIMED | To Do | Assign or comment with claimant and branch; the visible claim must exist before substantive work. |
| IN_PROGRESS | In Progress | Transition with the first meaningful work commit. |
| REVIEW | In Review | Transition when a reviewable PR or explicit review artifact exists. |
| DONE | Done | Only after accepted work, repository report, documentation updates, and validation summary. |
| SUPERSEDED | Done | Comment with replacement task/Jira and rationale before closing. |

A blocked task stays `To Do` unless work is actively underway and becomes blocked mid-task. In that case it may remain `In Progress`, but the blocker must be explicit and linked.

## Claim and branch protocol while Jira remains active

Before work:

1. Read the repository task and inspect current code and relevant PRs.
2. Confirm Jira is the mapped issue under `CRT-2`.
3. Record the claimant and exact scope in the repository task file.
4. Assign the Jira when an assignable human account is appropriate; otherwise add a comment naming the agent/session.
5. Record the branch in Jira.
6. Use a branch name containing both keys where practical, for example `rb-008/crt-10-visual-candidate-prototype`.
7. Make the claim visible before substantive implementation or research.

A branch created only for scope reconciliation is not automatically a task claim. RB-002 branch `rb-002/crt-4-player-level-reconciliation` remains documentation-only until the execution tracker is reconciled and the task file records an actual claim.

## Pull-request protocol while Jira remains active

Every implementation or review PR must be visible from Jira.

- Include the Jira key and RB ID in the PR title or body, preferably both.
- Recommended PR title pattern: `CRT-10 RB-008: prototype visual candidate choices`.
- Include the Jira key in branch and commit naming where practical so Atlassian development integration can associate activity.
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

ChatGPT, Copilot, Codex, and human contributors must update the selected execution tracker during meaningful state changes:

- claim or ownership transfer;
- start of substantive work;
- newly discovered blocker;
- scope or dependency change;
- PR creation or replacement;
- validation failure that changes delivery risk;
- request for review;
- completion, rejection, or supersession.

Avoid low-value comments for every commit. Tracker comments should record decisions and state changes that another contributor needs to understand.

## Dependency links

While Jira remains active, use Jira `Blocks` links for material execution dependencies. Repository task files remain the complete dependency definition, but important blockers must also be visible in Jira.

When a dependency changes:

1. update the task file;
2. update `TASKS.md` if ordering or dependency changed;
3. add, remove, or explain the tracker dependency;
4. comment on affected active issues;
5. reassess the roadmap and queue in the completion report.

## Completion protocol

Before transitioning the execution item to `Done`:

- implementation or research is accepted;
- the task file is updated;
- `reports/RB-###-YYYY-MM-DD-<slug>.md` exists;
- validation performed and skipped is recorded;
- PR and final branch are visible in the tracker where applicable;
- `STATUS.md`, `TASKS.md`, `ROADMAP.md`, `DECISIONS.md`, and `OPEN_QUESTIONS.md` are updated as required;
- new tasks have both RB IDs and execution-tracker items;
- queue reprioritization was explicitly considered.

The final tracker comment should link or name the report and state residual risks, new tasks, and queue impact.

## GitHub-native alternative under review

GitHub Actions is not a replacement for Jira by itself. Actions executes automation; it does not provide the primary durable issue description, assignee, discussion, dependency and planning surface.

A coherent GitHub-native replacement would use:

- **GitHub Issues** — one issue per immutable `RB-###` task;
- **GitHub Projects** — queue order, status, priority, assignee and roadmap views;
- **branches and pull requests** — implementation state and review;
- **GitHub Actions** — validation and policy enforcement, such as checking RB IDs, issue links, reports, task status and required documentation.

Potential advantages:

- one authentication and permission model;
- direct issue/branch/PR/commit linkage;
- connector access already works for this repository;
- less synchronization drift between code and execution tracking;
- Actions can enforce repository-specific completion rules.

Potential costs:

- migration of CRT-2 and CRT-3 through CRT-18 history and links;
- replacement of Jira `Blocks` relationships with GitHub issue dependencies, task lists or Project fields;
- recreation of statuses, priorities and reporting views;
- decision about whether Jira history remains read-only or is closed with migration comments.

## Migration decision gate

Do not create duplicate GitHub execution issues for every RB task until the user explicitly approves migration.

A migration decision should specify:

1. whether GitHub Issues or GitHub Projects is the operational source of truth;
2. the issue naming and label convention;
3. status and priority fields;
4. dependency representation;
5. whether existing CRT issues are closed, frozen or kept as a read-only historical mirror;
6. which GitHub Actions checks are required;
7. the one-time synchronization report and cutover date.

Until that decision is made, repository planning remains authoritative and Jira remains the documented but currently inaccessible execution mirror.

## Maintenance rule

Agents with tracker access must perform tracker updates themselves. Agents without access must not pretend the tracker was updated; they must leave a clearly marked synchronization checklist in the report and keep the task out of `DONE` until synchronization is completed.
