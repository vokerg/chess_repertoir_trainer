# Repertoire Builder North Star

Last updated: 2026-08-11

The Repertoire Builder program defines how the product constructs and evolves a personal opening repertoire from population evidence, the player's own games, existing courses, reviewed opening knowledge, and explicit user choices.

## Current state

The deterministic capability chain and the complete Builder V2 decision/presentation revision are integrated into `main`. The authenticated `/builder` route is current product behavior, not a future-only prototype.

Current runtime includes:

- peer population and player-level resolution;
- deterministic opening classification and Player Chess Profile evidence;
- versioned repertoire targets and editable profile-derived defaults;
- Candidate Decision V4 exact-position selected-population/Masters baselines, per-move result deltas, and versioned factual personal move evidence;
- empirical Balanced/Solid/Aggressive/Surprise ranking for preset `USER_MOVE` decisions through RB-027, with bounded stored-engine guardrails and opening/profile/personal context kept out of preset rank authority;
- RB-028 exact-position `Common for you` / `Rare for you` / `New to you`, all-indexed familiarity, recency/share, qualified result context and effective history scope;
- RB-029 role-specific opponent preparation through `2026-08-opponent-preparation-v1`, with recommended replies, editable selection and computed selected target-population coverage;
- RB-030 one-dialog setup with side/starting scope, speed population, rating target and one persona, including common first-move scopes plus FEN/PGN/SAN/UCI custom roots;
- the board-first RB-026 three-zone Cockpit with RB-031 V2 evidence hierarchy, normal ECO removal and no obsolete primary Target/Profile-fit chips;
- bounded route-local Builder session and branch queue behavior;
- mandatory course preview and explicit apply plus exact existing-course entry points;
- reviewed side-aware opening knowledge as explanatory, ranking-neutral evidence;
- complete strategic-knowledge coverage of the pinned generated opening book through RB-025;
- optional generated candidate and completion interpretations behind explicit disabled-by-default boundaries;
- bounded reviewed-opening grounding for the explicit AI game-review consumer.

RB-027 through RB-031 are `DONE`. RB-030 PR #335 final head `621ee6abb9a311646859357f8de41d4a6c4528e7` passed CI #2478 and was squash-merged as `9bfcf3f5b4337c827719f5ee170bcd5f67b6f3c2`. RB-031 PR #336 final head `a7ed94bdad896bc852685ad25de1dc87bee89e8f` passed CI #2486 and was squash-merged as `e6c024afec1753838dec900181ca4023d6114676`.

RB-016 / #104 is the only remaining Builder execution task and is `BLOCKED` until sufficient post-V2 Builder/course material has been built, trained and encountered in later games. There is no unclaimed `READY` Builder task at this checkpoint.

## Builder V2 product revision

Hands-on product review on 2026-08-09 exposed a semantic problem rather than a need to replace the Cockpit. The delivered V2 model keeps the board-first workspace, branch queue, opening plans, manual move entry and course boundaries while changing what drives and explains decisions.

Read [`BUILDER_V2_PLAN.md`](BUILDER_V2_PLAN.md) for the design record. The integrated authority is:

- personas apply only to the user's repertoire move, not to opponent replies;
- Balanced/Solid/Aggressive/Surprise are versioned empirical interpretations of selected-population, Masters and bounded engine evidence;
- broad Player Chess Profile fit is not preset persona rank authority; exact-position factual personal familiarity/results are separate evidence context;
- opponent replies are preparation priorities driven by target-population relevance, personal encounters, danger and course state;
- coverage is computed feedback from selected replies rather than a setup slider/persona default;
- normal setup is one dialog and shows persona exactly once;
- V1 target coverage/theory fields remain fixed compatibility material rather than hidden V2 choices;
- opening classification/knowledge remain secondary explanation while normal ECO badges/codes are absent from the final Cockpit hierarchy.

## Read in this order

1. [`STATUS.md`](STATUS.md) — current runtime, completed chain, blocked work, and residual risks.
2. [`AGENTS.md`](AGENTS.md) — task claim, branch, issue, validation, report, and completion protocol.
3. [`TASKS.md`](TASKS.md) — canonical task inventory and ordering.
4. [Program issue #105](https://github.com/vokerg/chess_repertoir_trainer/issues/105) and mapped child issues — live ownership, branch, PR, blocker, and completion state.
5. [`FOUNDATION.md`](FOUNDATION.md) — stable product and data principles.
6. [`NORTH_STAR.md`](NORTH_STAR.md) — target interaction and long-term product outcome.
7. [`BUILDER_V2_PLAN.md`](BUILDER_V2_PLAN.md) — the V2 decision-model revision and migration narrative.
8. [`FEATURES.md`](FEATURES.md) — capability catalog and planning maturity.
9. [`ROADMAP.md`](ROADMAP.md), [`DECISIONS.md`](DECISIONS.md), and [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md).

Detailed immutable work items live under [`tasks/`](tasks/). Completion and research evidence lives under [`reports/`](reports/).

## Authority boundaries

- Candidate ranking, opponent preparation, Builder reducers/queue behavior, and course preview/apply are deterministic authorities.
- Preset `USER_MOVE` persona ranking is versioned empirical policy over selected-population, Masters and bounded objective evidence.
- Factual exact-position personal history is presentation/decision context, not hidden preset persona authority.
- Opponent recommendation/coverage is role-specific deterministic policy, not persona judgment.
- Static opening knowledge is reviewed explanatory evidence and does not alter candidate ranking or write courses by itself.
- Player Chess Profile remains a separate deterministic capability; broad profile similarity is not direct move familiarity or preset rank authority.
- Generated interpretation is optional, explicit, gated, bounded, and non-authoritative.
- The curated traps pilot remains research evidence rather than a production traps feature.
- Outcome claims remain unavailable until RB-016's real-usage evidence gate is satisfied.

## Documentation boundary

This directory contains both current program status and target/research material. Runtime claims must be verified against code, tests, canonical current-state documentation, and `STATUS.md`. Planned, optional, blocked, and research behavior must remain labelled as such.
