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
8. [`STATUS.md`](STATUS.md);
9. the selected file under [`tasks/`](tasks/).

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

## Claim protocol

No agent may begin substantive work on a task without claiming it.

1. Confirm the task is `READY`, or document why a blocked/proposed task is being converted to `READY`.
2. Reinspect the current repo, relevant open PRs, and dependencies. Do not rely only on these planning documents.
3. Create a task branch from the current user-approved base. Never work directly on `main`.
4. Update only the selected task file with:
   - `Status: CLAIMED`;
   - `Claimed by`;
   - `Claim branch`;
   - `Claimed at` using an ISO date;
   - the exact claimed scope.
5. Make the claim visible on the shared coordination base before substantive work. Use a small claim-only PR or another user-approved coordination mechanism. A local or unpushed edit is not a claim.
6. After the claim is visible, change the task to `IN_PROGRESS` with the first meaningful implementation or discovery commit.

Do not claim a parent and all of its children merely to reserve future work. Claim the smallest executable task.

A claim with no visible progress for seven days is stale. Do not silently take it over. Record the stale state, coordinate with the user or owner, then release or transfer it explicitly.

## Parallel-work rules

- Prefer one task per branch.
- Tasks may run in parallel only when their dependency sections allow it.
- Do not edit another agent's task file except to resolve an explicitly coordinated transfer, unblock, or review outcome.
- Avoid broad changes to `TASKS.md` while unrelated claims are being recorded. Normal claim metadata belongs in the individual task file.
- Shared contracts, schemas, migrations, and route registration are collision points. Tasks touching them must name those files during claiming and coordinate before implementation.
- Existing parallel work is a dependency, not permission to duplicate it. Integrate or adapt it after inspecting the actual branch or PR.

## Implementation discipline

- Inspect the owning API routes, schemas/contracts, services, repositories, tests, Angular data access, stores, pages, and shared components relevant to the task.
- Use existing repository architecture: thin Fastify routes, transport-independent services, Prisma repositories, shared Zod contracts where consumed across workspaces, Angular feature data access and stores.
- Prefer small deliveries that improve the current product while advancing the north star.
- Do not add persistence, queues, background jobs, LLM infrastructure, or dependencies without task-specific justification.
- Treat profile calculations as statistical claims. Preserve sample size, analysed coverage, filters, baseline, and confidence behind conclusions.
- Keep arbitrary speed combinations possible. Do not hard-code only single-speed presets.
- Reuse the rating-normalization domain for cross-account level comparison once it is available on the working base.

## Completion protocol

A task is not complete when code is written.

Every completed task must:

1. create `reports/RB-###-YYYY-MM-DD-<slug>.md` using the report template;
2. update its task file to `REVIEW` or `DONE` as appropriate;
3. update [`STATUS.md`](STATUS.md);
4. update [`TASKS.md`](TASKS.md) if order, priority, dependency, or status changed;
5. update [`ROADMAP.md`](ROADMAP.md) when delivery sequence or gates changed;
6. update [`DECISIONS.md`](DECISIONS.md) for locked, revised, or rejected decisions;
7. update [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md) for resolved or newly discovered questions;
8. add any new work as new task files with new immutable IDs;
9. explicitly recommend whether the queue should remain unchanged or be reprioritized.

The completion report must state:

- purpose and delivered scope;
- files and architecture areas changed;
- decisions made and evidence used;
- validation performed and skipped;
- limitations and residual risks;
- impact on standalone product value and the north star;
- new tasks proposed;
- queue and roadmap changes recommended.

Do not mark a task `DONE` without a report. Do not merge any branch without explicit user approval.

## Planning-document hygiene

- `FOUNDATION.md` records stable agreements; revise it only when the user changes a foundational principle.
- `NORTH_STAR.md` describes the target end-to-end experience, not current behavior.
- `FEATURES.md` records feature value and planning maturity.
- `ROADMAP.md` records stages and gates, not detailed task execution.
- `TASKS.md` is the canonical ordered queue.
- Individual task files own execution scope, claims, acceptance criteria, and completion links.
- `DECISIONS.md` records decisions and their state.
- `OPEN_QUESTIONS.md` records uncertainty without disguising it as a decision.
- `STATUS.md` records the current shared truth.
- Reports are append-only historical evidence. Correct factual errors explicitly rather than rewriting history without note.
