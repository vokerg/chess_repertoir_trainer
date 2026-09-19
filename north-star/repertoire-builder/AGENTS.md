# Repertoire Builder north-star instructions

These instructions apply to every file and task under `north-star/repertoire-builder/`.

The documents in this directory define target product direction. They do not prove that a capability already exists. Before any repo-specific design or implementation claim, inspect the current repository and the nearest implementation pattern.

## Required entry points

Before proposing, claiming, implementing, reviewing, or closing work, read:

1. root [`AGENTS.md`](../../AGENTS.md) and applicable `.github/instructions` and `.github/skills`;
2. [`README.md`](README.md);
3. [`FOUNDATION.md`](FOUNDATION.md);
4. [`NORTH_STAR.md`](NORTH_STAR.md);
5. [`FEATURES.md`](FEATURES.md);
6. [`ROADMAP.md`](ROADMAP.md);
7. [`TASKS.md`](TASKS.md);
8. [`GITHUB_ISSUES.md`](GITHUB_ISSUES.md);
9. [`STATUS.md`](STATUS.md);
10. the selected file under [`tasks/`](tasks/).

Read [`DECISIONS.md`](DECISIONS.md) and [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md) whenever the task could change product direction, ranking logic, data interpretation, architecture, UX, or scope.

## Program rules

- The north star is an interactive, human-controlled repertoire builder. Do not reduce it to an automatic PGN generator or a static recommendation list.
- Player-profile conclusions are recommendations, never hard constraints. The user may deliberately build a repertoire with a different character.
- Preserve evidence boundaries: opening character, target-population behavior, player behavior, and the current repertoire target are separate inputs.
- Keep recommendations explainable. Do not replace evidence with an opaque score or an LLM assertion.
- Opening classification is an agreed dependency, but its classification method is intentionally unspecified in this plan. Do not invent and lock that method inside an unrelated task.
- LLM participation is optional and unresolved. Core factual selection, filtering, ownership, and persistence must not depend on unverifiable generated text.
- The move-choice experience must eventually be visual. Exact visual composition remains an explicit discovery task.
- Traps and trap-oriented repertoires are tracked as a future concept. Do not present a traps database as existing until implemented and verified.

## Task states

Use only these values in task files:

- `PROPOSED` — recorded but not ready to start.
- `READY` — dependencies and scope are sufficient for a claim.
- `CLAIMED` — ownership and branch are recorded and visible on the shared base; substantive work has not started.
- `IN_PROGRESS` — implementation or focused discovery is underway.
- `BLOCKED` — cannot proceed; the blocker is recorded.
- `REVIEW` — implementation is complete and awaiting review or validation.
- `DONE` — accepted completion report exists and required planning documents are updated.
- `SUPERSEDED` — replaced by another identified task or decision.

Task IDs are permanent. Never renumber existing tasks when priorities change. Change `Order` in [`TASKS.md`](TASKS.md) instead.

Priority meanings:

- `P0` — immediate foundation or critical dependency.
- `P1` — important next capability or major north-star risk.
- `P2` — valuable follow-on, independent research, or expansion.
- `P3` — optional or deliberately deferred exploration.

## GitHub Issues execution layer

- Program tracker [#105](https://github.com/vokerg/chess_repertoir_trainer/issues/105) owns the program issue checklist.
- Every immutable `RB-###` task maps to exactly one GitHub issue listed in [`GITHUB_ISSUES.md`](GITHUB_ISSUES.md) and [`TASKS.md`](TASKS.md).
- Repository task files own detailed scope and acceptance criteria; GitHub Issues own execution status, assignee, active branch, pull-request visibility, and operational blockers.
- Before work, inspect both the repository task and its GitHub issue.
- Contributors with GitHub access must perform issue updates themselves. Contributors without access must leave an explicit synchronization checklist and must not claim the issue was updated.
- Repository states map to issue state as follows: `PROPOSED`, `READY`, `CLAIMED`, `IN_PROGRESS`, `BLOCKED`, and `REVIEW` remain open; `DONE` closes as completed; `SUPERSEDED` closes as not planned with a replacement reference.
- Material dependencies must be represented using direct issue references as well as repository documentation.
- New RB tasks require a GitHub issue and addition to program tracker #105 in the same coordination change.

## Claim protocol

No agent may begin substantive work on a task without claiming it.

1. Confirm the task is `READY`, or document why a blocked/proposed task is being converted to `READY`.
2. Reinspect the current repo, relevant open pull requests, mapped GitHub issue, and dependencies. Do not rely only on these planning documents.
3. Create a task branch from the current user-approved base. Never work directly on `main`.
4. Update only the selected task file with:
   - `Status: CLAIMED`;
   - `Claimed by`;
   - `Claim branch`;
   - `Claimed at` using an ISO date;
   - the exact claimed scope.
5. Update the issue with the claimant or agent session, exact scope, and branch. Assign it when appropriate.
6. Make the claim visible on the shared coordination base before substantive work. Use a small claim-only pull request or another user-approved coordination mechanism. A local or unpushed edit is not a claim.
7. After the claim is visible, change the task to `IN_PROGRESS` and begin substantive implementation or discovery while keeping the issue open and current.

Prefer branch names containing both identifiers, for example `rb-008/issue-96-visual-candidate-prototype`.

Do not claim a parent and all of its children merely to reserve future work. Claim the smallest executable task.

A claim with no visible progress for seven days is stale. Do not silently take it over. Record the stale state in the repository and issue, coordinate with the user or owner, then release or transfer it explicitly.

## Parallel-work rules

- Prefer one task per branch.
- Tasks may run in parallel only when their dependency sections allow it.
- Do not edit another agent's task file except to resolve an explicitly coordinated transfer, unblock, or review outcome.
- Avoid broad changes to `TASKS.md` while unrelated claims are being recorded. Normal claim metadata belongs in the individual task file.
- Shared contracts, schemas, migrations, route registration, issue dependency references, and integration branches are collision points. Tasks touching them must name those areas during claiming and coordinate before implementation.
- Existing parallel work is a dependency, not permission to duplicate it. Integrate or adapt it after inspecting the actual branch, pull request, and issue.

## Pull-request protocol

Every implementation or review pull request must be visible from its GitHub issue.

- Include the RB ID and issue number in the pull-request title or body.
- Recommended title pattern: `RB-008: prototype visual candidate choices (#96)`.
- Use `Closes #96` only when merging the pull request should complete the task; otherwise use `Refs #96`.
- Immediately after opening or replacing a pull request, ensure the issue or pull-request body records source and target branches, scope, validation performed, validation pending, and review readiness.
- Keep the issue open through review and close it only after accepted completion and required synchronization.
- Do not close an issue merely because a pull request exists, CI passed, or code was merged into an intermediate integration branch.

## Implementation discipline

- Inspect the owning API routes, schemas/contracts, services, repositories, tests, Angular data access, stores, pages, and shared components relevant to the task.
- Use existing repository architecture: thin Fastify routes, transport-independent services, Prisma repositories, shared Zod contracts where consumed across workspaces, Angular feature data access and stores.
- Prefer small deliveries that improve the current product while advancing the north star.
- Do not add persistence, queues, background jobs, LLM infrastructure, or dependencies without task-specific justification.
- Treat profile calculations as statistical claims. Preserve sample size, analysed coverage, filters, baseline, and confidence behind conclusions.
- Use the speed presets and peer-rating target vocabulary defined by RB-001. Do not reintroduce arbitrary product-facing speed arrays or editable speed weights without an explicit reviewed decision.
- Reuse the versioned rating-normalization and peer-resolver domains for cross-account level comparison. Do not create feature-local parity or level tables.

## Completion protocol

A task is not complete when code is written.

Every completed task must:

1. create `reports/RB-###-YYYY-MM-DD-<slug>.md` using the report template;
2. update its task file to `REVIEW` or `DONE` as appropriate;
3. update [`STATUS.md`](STATUS.md);
4. update [`TASKS.md`](TASKS.md) if order, priority, dependency, status, or issue mapping changed;
5. update [`ROADMAP.md`](ROADMAP.md) when delivery sequence or gates changed;
6. update [`DECISIONS.md`](DECISIONS.md) for locked, revised, or rejected decisions;
7. update [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md) for resolved or newly discovered questions;
8. add any new work as new task files with new immutable IDs and GitHub issues added to #105;
9. update the issue with pull request, report, validation, residual risk, new tasks, and queue impact;
10. explicitly recommend whether the queue should remain unchanged or be reprioritized.

The completion report must state:

- purpose and delivered scope;
- files and architecture areas changed;
- decisions made and evidence used;
- validation performed and skipped;
- limitations and residual risks;
- impact on standalone product value and the north star;
- GitHub issue, issue state, branch, and pull request;
- new tasks proposed with issue numbers;
- queue and roadmap changes recommended.

Do not mark a task `DONE` or close its issue as completed without a report and required synchronization. Do not merge any branch without explicit user approval.

## Planning-document hygiene

- `FOUNDATION.md` records stable agreements; revise it only when the user changes a foundational principle.
- `NORTH_STAR.md` describes the target end-to-end experience, not current behavior.
- `FEATURES.md` records feature value and planning maturity.
- `ROADMAP.md` records stages and gates, not detailed task execution.
- `TASKS.md` is the canonical ordered queue and RB-to-issue index.
- `GITHUB_ISSUES.md` records GitHub Issues execution and synchronization policy.
- Individual task files own execution scope, claims, acceptance criteria, and completion links.
- `DECISIONS.md` records decisions and their state.
- `OPEN_QUESTIONS.md` records uncertainty without disguising it as a decision.
- `STATUS.md` records the current shared truth.
- Reports are append-only historical evidence. Correct factual errors explicitly rather than rewriting history without note.