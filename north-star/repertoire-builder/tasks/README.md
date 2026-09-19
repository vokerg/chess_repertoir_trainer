# Task Files

Each executable work item has one file named `RB-###-<slug>.md`.

## Source of truth

- `TASKS.md` owns global order and priority.
- The individual task file owns scope, claim, dependencies, acceptance criteria, implementation notes, and completion report links.
- `STATUS.md` owns the shared current-state summary.

## Claiming

Follow the full protocol in `../AGENTS.md`.

A claim is valid only after the task file records the owner and branch and that change is visible on the shared coordination base. Do not use chat statements, local edits, or an unpushed branch as a claim.

## Claim metadata

Use these fields exactly:

```text
Status: CLAIMED
Claimed by: <agent or contributor identity>
Claim branch: <branch>
Claimed at: YYYY-MM-DD
Claim scope: <precise bounded scope>
```

When work begins, change `Status` to `IN_PROGRESS`.

## Completion

A task cannot become `DONE` without:

- an implementation or discovery report under `../reports/`;
- validation status;
- task and program status updates;
- queue and roadmap assessment;
- new tasks recorded where needed.

Use `_TEMPLATE.md` for new tasks. Existing task IDs are immutable.
