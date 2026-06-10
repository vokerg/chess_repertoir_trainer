# ChatGPT GitHub connector working instructions

These instructions apply only to ChatGPT sessions using the GitHub connector. They are not project architecture or slash-skill guidance.

## Repository defaults

- Repository: `vokerg/chess_repertoir_trainer`
- Base branch: `main`, unless the user names another branch or pull request.
- Implementation work goes on a focused feature branch and opens as a draft pull request.
- Do not commit implementation work directly to `main`.

## Permission model

For an implementation request, the connector may inspect files, create a branch, edit required files, commit, open a draft pull request, and update that pull request without asking for confirmation for each file.

Explicit confirmation is still required before merging, deleting branches, rewriting history, changing secrets or production values, or performing destructive data operations. Use squash merge when the user explicitly approves a merge.

Platform approval prompts for write actions are expected and cannot be bypassed by repository instructions.
