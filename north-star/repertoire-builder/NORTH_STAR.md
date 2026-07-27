# Repertoire Builder North Star

Last updated: 2026-07-27

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

Create another course for the same opening with a different objective, such as solid, sharp, dubious, low-theory, slower-play focused, blitz-focused, or eventually traps-focused.

## Setup flow

Setup is a focused dialog that captures enough intent to rank evidence without forcing premature detail or containing the recursive builder itself.

Expected dimensions:

1. side and starting point;
2. accounts or player identity to use;
3. speed preset: All speeds, Blitz and slower, Blitz, or Bullet;
4. rating target: All players, My peers, My peers and above, or one explicit benchmark group;
5. repertoire objective and persona;
6. coverage and theory tolerance;
7. whether profile suggestions should initialize the target.

Defaults may come from factual player-level evidence or the Player Chess Profile, but every suggested value remains editable. The dialog visibly separates factual peer evidence, profile recommendation, and selected repertoire intent.

Selecting **Start building** closes the dialog and opens the routed workbench. The setup dialog does not own recursive candidate decisions, branch progress, draft navigation, or resume behavior.

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
- repertoire-target fit;
- optional validated trap evidence when a future reviewed source exists.

The recommendation is explicit but non-binding. A candidate may be labelled as profile-aligned, target-aligned, objectively safest, most practical, sharpest, lowest theory, or deliberately dubious when supported by data.

Trap evidence, if implemented later, must not become an opaque reason to recommend a move. It must expose setup soundness, practical temptation, punishment, safe defenses, target-population sample, confidence, and provenance separately.

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

The core builder is a routed, resumable, board-first workbench launched from the setup dialog.

The accepted default composition uses:

- one readable primary board and current move sequence;
- a compact candidate switcher that updates the board and evidence;
- focused objective, population, master, personal, theory, profile-fit, and target-fit evidence;
- explicit profile-versus-target disagreement;
- an opponent-response coverage queue;
- pending, selected, deferred, ignored, and completed states;
- branch queue and coverage progress;
- navigation through accepted and pending branches;
- preview before course changes are written.

The simultaneous multi-board candidate landscape is not the default because it is visually heavy and reduces board readability, particularly on mobile. A deliberate mini-board comparison mode may be added later if structural comparison proves important enough, but it is not required for the first production workbench.

The recursive workflow must not depend on a modal remaining open.

## Player profile relationship

The Chess Profile may initialize recommendations such as:

- sharp positions appear to fit recent blitz results;
- solid structures work better as Black;
- theory-heavy branches correlate with early mistakes;
- a style works against peers but not the next benchmark group.

The builder must show that these are derived conclusions with sample size and confidence.

The player can choose a different target. The UI should distinguish:

- `Factual peer evidence`;
- `Recommended from your profile`;
- `Selected for this repertoire`;
- `Manually chosen despite tradeoff`.

## Target environment

A target uses one product speed preset:

- All speeds;
- Blitz and slower;
- Blitz;
- Bullet.

For the MVP, a combined preset is represented by one mixed Lichess Explorer population. Separate per-speed weighting is not required unless later evidence demonstrates a material recommendation problem.

A target rating population can be:

- all players;
- around the player's resolved peer interval;
- the peer interval plus one adjacent higher group;
- one explicit Lichess-benchmark group.

The factual peer interval is resolved from versioned provider-aware rating evidence and remains inspectable. A manual target override does not mutate that factual result.

Population evidence should reflect the selected preset and rating target. Master evidence remains a separate source rather than being treated as the only definition of correctness.

## Trap-oriented repertoire boundary

A future traps-oriented persona is a willingness to prioritize practical temptation and tactical punishment within explicit objective-risk limits. It is not permission to recommend unsound lines without warning.

A trustworthy trap occurrence requires:

- normalized trigger-position and move identity;
- a practically tempting opponent response;
- bounded punishment;
- explicit safe defenses or refutations;
- setup soundness separate from practical success;
- rating/speed population context;
- engine and source versions;
- editorial review and lifecycle state.

Opening name and ECO are descriptive links, not trap identity. Related positions may share a trap family without being collapsed into one occurrence.

RB-014 recommends proving this through a bounded curated data/validator pilot before any production database, API, UI, or builder integration is introduced.

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
- adapt a general course for a different speed preset;
- adapt a peer-level repertoire for the next stronger group;
- create a second persona without replacing the original;
- defer low-priority branches while keeping an explicit backlog.

## Explainability target

Every proposed move or coverage decision should answer:

- Why is this shown?
- Why is it recommended or not recommended?
- Which datasets contributed?
- How much evidence exists?
- What changes if the speed preset, rating target, or persona changes?
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