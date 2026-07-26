# Repertoire Builder North Star

Last updated: 2026-07-26

This document describes the intended end-state experience. It is not an implementation specification and does not claim that the workflow exists today.

## Product promise

> Build a repertoire you will actually want to play, for the opponents and time controls you actually expect, while staying in control of every important choice.

The product performs research, prioritization, comparison, coverage planning, and course assembly. The player remains the repertoire author.

## Entry points

### Build a new repertoire

Start from White, Black, a first move, a named opening, a move sequence, or a position.

### Improve an existing course

Start from a course gap, early ending, repeated deviation, weak result, profile mismatch, or changed target environment.

### Build from a Chess Profile

Start with profile-derived suggestions, then accept, edit, or reject the proposed intent.

### Build an alternative persona

Create another course for the same opening with a different objective, such as solid, sharp, dubious, low-theory, classical, blitz-focused, or eventually traps-focused.

## Setup flow

The setup should capture enough intent to rank evidence without forcing premature detail.

Expected dimensions:

1. side and starting point;
2. accounts or player identity to use;
3. selected speed set, or controlled General mode;
4. rating target: general, own level, own level plus normalized grades, or custom;
5. repertoire objective and persona;
6. coverage and theory tolerance;
7. whether profile suggestions should initialize the target.

Every suggested setup value remains editable.

## The interactive decision loop

The builder alternates between two different decision types.

### User move: choose a direction

The system presents a small set of meaningful candidate moves. Each candidate should make its position and tradeoffs visually understandable.

Evidence can include:

- objective evaluation;
- master use;
- selected population use and score;
- personal use and results;
- opening character;
- learning burden;
- existing-course relationships;
- player-profile fit;
- repertoire-target fit.

The recommendation is explicit but non-binding. A candidate may be labelled as profile-aligned, target-aligned, objectively safest, most practical, sharpest, lowest theory, or deliberately dubious when supported by data.

### Opponent move: choose coverage

The system shows the opponent continuations that matter for the selected target.

The user may:

- include a response now;
- include all responses above a selected coverage threshold;
- always include responses seen in personal games;
- include a dangerous uncommon response;
- defer a response;
- explicitly ignore a response for this repertoire version.

Deferred work is a first-class state, not an accidental unfinished course.

### Continue recursively

For every covered opponent response, the builder proposes the next user choice. It continues until branch-specific stopping rules are met.

Possible stopping inputs include:

- practical frequency becoming negligible;
- selected cumulative coverage reached;
- depth or theory budget reached;
- transposition to existing coverage;
- stable or forced continuation;
- deliberate user stop;
- branch deferred for later.

The final stopping model remains open.

## Visual workbench target

The final builder should be a routed, resumable workbench. A small dialog may launch it, but the core workflow should not depend on a modal remaining open.

The exact visual design is unresolved. It must nevertheless support:

- current board and move sequence;
- visual comparison of candidate consequences;
- evidence and explanation;
- target and profile context;
- branch queue and coverage progress;
- deferred decisions;
- navigation through accepted and pending branches;
- preview before course changes are written.

Candidate visualization may use multiple board previews, one main board with interactive previews, position cards, or another proven composition. This requires prototype work with realistic data before production architecture is locked.

## Player profile relationship

The Chess Profile may initialize recommendations such as:

- sharp positions appear to fit recent blitz results;
- solid structures work better as Black;
- theory-heavy branches correlate with early mistakes;
- a style works against peers but not one grade above.

The builder must show that these are derived conclusions with sample size and confidence.

The player can choose a different target. The UI should distinguish:

- `Recommended from your profile`;
- `Selected for this repertoire`;
- `Manually chosen despite tradeoff`.

## Target environment

A target can use one speed or a combination, including bullet plus blitz or blitz plus rapid. General mode uses controlled weighting.

A target rating population can be:

- general;
- around the player's resolved level;
- the player's level plus one or more normalized grades;
- custom.

Population evidence should reflect the selected environment. Master evidence remains a separate source rather than being treated as the only definition of correctness.

## Course output

Before writing, the user should see:

- selected lines and branches;
- achieved population coverage;
- deferred responses;
- conflicts or transpositions with existing courses;
- approximate learning burden;
- missing or low-confidence evidence;
- intended course/chapter organization.

The user can save to a new course or merge into an existing course when supported by the selected entry point and existing architecture.

## Existing-course adaptation

The same workbench should support targeted maintenance:

- cover a frequent opponent response;
- extend a line that ends too early;
- reconsider a user move;
- adapt a general course for selected speeds;
- adapt a current-level repertoire for stronger opposition;
- create a second persona without replacing the original;
- defer low-priority branches while keeping an explicit backlog.

## Explainability target

Every proposed move or coverage decision should answer:

- Why is this shown?
- Why is it recommended or not recommended?
- Which datasets contributed?
- How much evidence exists?
- What changes if speed, rating target, or persona changes?
- What objective or practical cost is being accepted?

A narrative layer may eventually help explain this, but deterministic source evidence remains visible.

## North-star success

The program succeeds when a user can:

1. define the environment and intent of a repertoire;
2. visually choose between meaningful continuations;
3. cover the opponent responses that matter;
4. create or update a trainable course;
5. understand why every recommendation was made;
6. maintain multiple repertoire personas;
7. return after real games and evolve the material using new evidence.

A future quality metric should measure not only course size, but whether recommended and trained choices are played, remembered, and associated with improved opening outcomes in later games.
