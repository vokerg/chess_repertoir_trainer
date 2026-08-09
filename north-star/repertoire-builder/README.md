# Repertoire Builder North Star

Last updated: 2026-08-09

The Repertoire Builder program defines how the product constructs and evolves a personal opening repertoire from population evidence, the player's own games and profile, existing courses, reviewed opening knowledge, and explicit user choices.

## Current state

The deterministic capability chain is integrated into `main`. The authenticated `/builder` route is current product behavior, not a future-only prototype.

Current runtime includes:

- peer population and player-level resolution;
- deterministic opening classification and Player Chess Profile evidence;
- versioned repertoire targets and editable profile-derived defaults;
- deterministic candidate evidence and ranking;
- bounded Builder session and queue behavior;
- the board-first Builder workbench;
- the three-zone Builder Cockpit composition keeping the board/candidates, focused decision brief, and branch/action controls visible as one desktop workspace;
- mandatory course preview and explicit apply;
- exact existing-course entry points from course-review findings;
- reviewed side-aware opening knowledge as explanatory, ranking-neutral evidence;
- complete strategic-knowledge coverage of the pinned generated opening book through RB-025, with explicit unavailable behavior for arbitrary names outside that book;
- deterministic opening-knowledge coverage/editorial tooling and hard all-book regression gates;
- optional generated candidate and completion interpretations behind explicit disabled-by-default boundaries;
- bounded reviewed-opening grounding for the explicit AI game-review consumer.

RB-025 / #290 is complete through implementation PRs #302/#304 and final reconciliation PR #300.

RB-026 / #310 is runtime-complete through squash-merged PR #311. Completion PR #314 only adds the required closure report and reconciles current Builder program/task/issue metadata; it contains no additional Builder runtime implementation.

The remaining RB-016 outcome-evaluation task is independently blocked on sufficient real Builder/course usage and follow-up-game evidence.

Do not copy a future “next task” into this file. [`STATUS.md`](STATUS.md) and the mapped GitHub issues own volatile readiness, blockers, and current execution state.

## Read in this order

1. [`STATUS.md`](STATUS.md) — current runtime, completed chain, active/blocked work, and residual risks.
2. [`AGENTS.md`](AGENTS.md) — task claim, branch, issue, validation, report, and completion protocol.
3. [`TASKS.md`](TASKS.md) — canonical task inventory and ordering.
4. [Program issue #105](https://github.com/vokerg/chess_repertoir_trainer/issues/105) and mapped child issues — live ownership, branch, PR, blocker, and completion state.
5. [`FOUNDATION.md`](FOUNDATION.md) — stable product and data principles.
6. [`NORTH_STAR.md`](NORTH_STAR.md) — target interaction and long-term product outcome.
7. [`FEATURES.md`](FEATURES.md) — capability catalog and planning maturity.
8. [`ROADMAP.md`](ROADMAP.md), [`DECISIONS.md`](DECISIONS.md), and [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md).

Detailed immutable work items live under [`tasks/`](tasks/). Completion and research evidence lives under [`reports/`](reports/).

## Authority boundaries

- Candidate ranking, Builder reducers/queue behavior, and course preview/apply are deterministic authorities.
- Static opening knowledge is reviewed explanatory evidence and does not alter candidate ranking or write courses by itself.
- Generated interpretation is optional, explicit, gated, bounded, and non-authoritative.
- The curated traps pilot remains research evidence rather than a production traps feature.
- Outcome claims remain unavailable until RB-016's real-usage evidence gate is satisfied.

## Documentation boundary

This directory contains both current program status and target/research material. Runtime claims must be verified against code, tests, canonical current-state documentation, and `STATUS.md`. Planned, optional, blocked, and research behavior must remain labelled as such.
