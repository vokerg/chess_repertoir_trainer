# Repertoire Builder North Star

Status: active program execution. The planning foundation is merged to `main`; the rated Lichess Peer games population-evidence baseline is also merged, while the interactive repertoire builder remains target behavior rather than current product behavior.

This workspace defines the long-term program for constructing and evolving a personal chess repertoire from engine evaluation, opening populations, the user's own games, existing courses, and explicit user choices.

## Current delivery boundary

Available in the current product through PR #80:

- shared Masters and rated Lichess Opening Explorer infrastructure;
- configurable Peer games population evidence by month, rating group, and selected speeds;
- a reusable Peer games widget in Opening Analysis.

Still planned:

- controlled General and combined-speed weighting;
- explainable per-speed population components and direct filter provenance;
- player-level resolution, opening classification, Player Chess Profile, candidate ranking, visual builder flow, course materialization, and outcome feedback.

See [Status](STATUS.md) and [RB-001](tasks/RB-001-population-evidence.md) for the exact delivered-versus-remaining assessment.

## Entry points

- [Foundation](FOUNDATION.md) — agreed product and data principles.
- [North star](NORTH_STAR.md) — target interactive repertoire-building experience.
- [Feature catalog](FEATURES.md) — capabilities, standalone value, north-star role, and planning maturity.
- [Roadmap](ROADMAP.md) — ordered delivery stages and gates.
- [Task queue](TASKS.md) — canonical priority and execution order.
- [Jira coordination](JIRA.md) — Epic/task mapping, workflow transitions, branch/PR visibility, and synchronization rules.
- [Status](STATUS.md) — current program state and active work.
- [Decisions](DECISIONS.md) — locked and provisional choices.
- [Open questions](OPEN_QUESTIONS.md) — unresolved product, data, UX, and architecture questions.
- [Agent instructions](AGENTS.md) — required reading, task claiming, reporting, Jira, and queue-update protocol.

Individual work items live under [`tasks/`](tasks/). Every completed task produces a report under [`reports/`](reports/). Meaningful status reconciliations may add explicitly non-completion reports. Every existing task also maps to one Jira Task under Epic `CRT-2`.

## Scope boundary

This directory is deliberately separate from canonical current-state architecture documentation. It may describe unimplemented target behavior, but every such statement must remain clearly labelled as planned, provisional, optional, or open. Current product behavior must be verified against the implementation and canonical current-state documentation before planning claims are updated.
