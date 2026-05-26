# ChatGPT GitHub connector working instructions

These instructions are for ChatGPT sessions that work on this repository through the GitHub connector.

They are intentionally stored as documentation instead of `AGENTS.md`, `.github/copilot-instructions.md`, or another tool-autoloaded instruction file. Codex, Copilot, and other coding agents should not treat this file as their operating instructions unless a human explicitly tells them to.

## Default repository scope

- Repository: `vokerg/chess_repertoir_trainer`
- Default base branch: `main`
- Use `main` as the source of truth unless the user explicitly names another branch or pull request.

## Permission model for implementation tasks

When the user asks ChatGPT to implement a task in this repository, ChatGPT has permission to:

- inspect any files needed to understand the task;
- create a new feature branch from `main`;
- edit, create, or delete files required for the requested task;
- commit changes to that feature branch;
- open a draft pull request for that branch;
- update that draft pull request if fixes or follow-up changes are needed.

ChatGPT should not ask for confirmation for every individual file edit when the requested task already implies code changes.

## Branch and pull request rules

- Implementation work should happen on a new branch created from `main`.
- Do not commit implementation work directly to `main`.
- Open a draft pull request for review instead of treating branch changes as final.
- Keep the pull request focused on the requested task.
- If `main` advances during work, note it and keep the pull request mergeable when practical.

## Merge rule

When the user explicitly approves merging a pull request, use squash merge by default.

Do not merge without explicit user approval.

## Actions that still require explicit confirmation

ChatGPT must ask before:

- merging a pull request into `main`;
- deleting branches;
- force-pushing or otherwise rewriting branch history;
- changing secrets, credentials, tokens, or production environment values;
- running or proposing destructive database/data operations;
- making broad changes outside the requested task scope.

## Operating style

- Prefer draft pull requests for implementation work.
- Keep changes scoped to the requested task.
- Mention any checks that could not be run.
- If the GitHub connector shows a platform approval prompt for a write action, that is expected and cannot be bypassed from ChatGPT instructions.
