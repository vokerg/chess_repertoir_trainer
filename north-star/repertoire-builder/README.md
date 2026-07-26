# Repertoire Builder North Star

Status: active program execution. The planning foundation, rated Lichess Peer games population-evidence baseline, and versioned rating-normalization baseline are merged to `main`, while the interactive repertoire builder remains target behavior rather than current product behavior.

This workspace defines the long-term program for constructing and evolving a personal chess repertoire from engine evaluation, opening populations, the user's own games, existing courses, and explicit user choices.

## Current delivery boundary

Available in the current product:

- through PR #80: shared Masters and rated Lichess Opening Explorer infrastructure, configurable Peer games evidence by month/rating group/speed, and a reusable Peer games widget in Opening Analysis;
- through PR #76: the current versioned 13-grade rating-normalization profile for Chess.com and Lichess bullet, blitz, and rapid; source confidence and soft-padding metadata; grade classification/range helpers; `GET /api/rating-normalization/default`; and a reference table in the performance-by-rating lab.

Revised next delivery through RB-001:

- fixed Peer games speed presets: All speeds, Blitz and slower, Blitz, and Bullet;
- rating targets: All players, My peers, My peers and above, or one explicit Lichess group;
- a new versioned normalization profile aligned to Lichess Explorer rating groups, including Chess.com mappings;
- an on-demand peer-band resolver using recent imported games, then all history, then a generic fallback;
- one mixed Lichess response and the existing mixed cache architecture;
- two compact dropdowns replacing raw month and checkbox filters;
- direct requested/effective population provenance.

Still planned after RB-001:

- durable multi-account player-level storage/projection through RB-002;
- opening classification, Player Chess Profile, candidate ranking, visual builder flow, course materialization, and outcome feedback.

See [Status](STATUS.md), [RB-001](tasks/RB-001-population-evidence.md), and [RB-002](tasks/RB-002-player-level-resolution.md) for exact delivered-versus-remaining assessments.

## Entry points

- [Foundation](FOUNDATION.md) — agreed product and data principles.
- [North star](NORTH_STAR.md) — target interactive repertoire-building experience.
- [Feature catalog](FEATURES.md) — capabilities, standalone value, north-star role, and planning maturity.
- [Roadmap](ROADMAP.md) — ordered delivery stages and gates.
- [Task queue](TASKS.md) — canonical priority and execution order.
- [GitHub Issues coordination](GITHUB_ISSUES.md) — program/task mapping, issue-state rules, branch/PR visibility, and synchronization protocol.
- [Program issue #105](https://github.com/vokerg/chess_repertoir_trainer/issues/105) — top-level GitHub execution tracker.
- [Status](STATUS.md) — current program state and active work.
- [Decisions](DECISIONS.md) — locked and provisional choices.
- [Open questions](OPEN_QUESTIONS.md) — unresolved product, data, UX, and architecture questions.
- [Agent instructions](AGENTS.md) — required reading, task claiming, reporting, GitHub Issues, and queue-update protocol.

Individual work items live under [`tasks/`](tasks/). Every completed task produces a report under [`reports/`](reports/). Meaningful status reconciliations may add explicitly non-completion reports. Every existing task maps to one GitHub issue under program tracker [#105](https://github.com/vokerg/chess_repertoir_trainer/issues/105).

## Scope boundary

This directory is deliberately separate from canonical current-state architecture documentation. It may describe unimplemented target behavior, but every such statement must remain clearly labelled as planned, provisional, optional, or open. Current product behavior must be verified against the implementation and canonical current-state documentation before planning claims are updated.