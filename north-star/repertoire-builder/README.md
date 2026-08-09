# Repertoire Builder North Star

Last updated: 2026-08-09

The Repertoire Builder program defines how the product constructs and evolves a personal opening repertoire from population evidence, the player's own games, existing courses, reviewed opening knowledge, and explicit user choices.

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

## Builder V2 product revision

Hands-on product review of the integrated Builder exposed a semantic problem rather than a need to replace the Cockpit. The agreed V2 direction keeps the board-first workspace, branch queue, opening plans, manual move entry and course boundaries while changing what drives and explains decisions.

Read [`BUILDER_V2_PLAN.md`](BUILDER_V2_PLAN.md) for the complete revision. The key changes are:

- personas apply only to the user's repertoire move, not to opponent replies;
- Balanced/Solid/Aggressive/Surprise become empirical interpretations of peer, Masters and engine evidence;
- broad Player Chess Profile fit is removed from the primary Builder decision model and replaced by factual exact-position personal familiarity/results;
- opponent replies become preparation priorities driven by peer relevance, personal encounters, danger and course state;
- coverage becomes computed feedback from selected replies rather than a setup slider/persona default;
- normal setup remains one dialog and shows persona exactly once;
- opening classification/knowledge remain useful secondary explanation, while ECO codes leave the normal Builder surface.

Execution is planned through RB-027–RB-031 / issues #317–#321. RB-016 outcome feedback remains blocked and should evaluate post-V2 usage rather than calibrating the semantics V2 is replacing.

## Read in this order

1. [`STATUS.md`](STATUS.md) — current runtime, completed chain, active/blocked work, and residual risks.
2. [`AGENTS.md`](AGENTS.md) — task claim, branch, issue, validation, report, and completion protocol.
3. [`TASKS.md`](TASKS.md) — canonical task inventory and ordering.
4. [Program issue #105](https://github.com/vokerg/chess_repertoir_trainer/issues/105) and mapped child issues — live ownership, branch, PR, blocker, and completion state.
5. [`FOUNDATION.md`](FOUNDATION.md) — stable product and data principles.
6. [`NORTH_STAR.md`](NORTH_STAR.md) — target interaction and long-term product outcome.
7. [`BUILDER_V2_PLAN.md`](BUILDER_V2_PLAN.md) — the agreed decision-model revision and migration plan.
8. [`FEATURES.md`](FEATURES.md) — capability catalog and planning maturity.
9. [`ROADMAP.md`](ROADMAP.md), [`DECISIONS.md`](DECISIONS.md), and [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md).

Detailed immutable work items live under [`tasks/`](tasks/). Completion and research evidence lives under [`reports/`](reports/).

## Authority boundaries

- Candidate ranking, Builder reducers/queue behavior, and course preview/apply are deterministic authorities.
- Static opening knowledge is reviewed explanatory evidence and does not alter candidate ranking or write courses by itself.
- Player Chess Profile remains a separate deterministic capability; Builder V2 does not treat broad profile similarity as direct move familiarity.
- Generated interpretation is optional, explicit, gated, bounded, and non-authoritative.
- The curated traps pilot remains research evidence rather than a production traps feature.
- Outcome claims remain unavailable until RB-016's real-usage evidence gate is satisfied.

## Documentation boundary

This directory contains both current program status and target/research material. Runtime claims must be verified against code, tests, canonical current-state documentation, and `STATUS.md`. Planned, optional, blocked, and research behavior must remain labelled as such.
