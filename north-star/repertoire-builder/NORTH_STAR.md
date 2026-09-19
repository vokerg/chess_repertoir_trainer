# Repertoire Builder North Star

Last updated: 2026-08-09

This document describes the intended end-state experience. It is not a claim that all V2 behavior already exists.

## Product promise

> Build a repertoire you will actually want to play, for the opponents and time controls you actually expect, while staying in control of every important choice.

The product researches, prioritizes, compares, plans preparation, and assembles course material. The player remains the repertoire author.

## Entry points

- Build a new White or Black repertoire from the initial position, a common first-move scope, a named opening, move sequence, or position.
- Improve an existing course from a gap, early ending, repeated deviation, weak result, changed target environment, or user move worth reconsidering.
- Build an alternative persona for the same opening without replacing the original.

The standalone Player Chess Profile can inspire a build, but broad profile similarity is not a primary Builder recommendation authority.

## Setup flow

Setup remains **one focused dialog**. Persona appears exactly once.

Normal setup captures:

1. repertoire side and starting scope;
2. speed preset: All speeds, Blitz and slower, Blitz, or Bullet;
3. rating target: All players, My peers, My peers and one group higher, or one explicit benchmark group;
4. one persona: Balanced, Solid, Aggressive, or Surprise.

Useful starting scopes reuse the existing starting-position/session model, for example White full repertoire or `1.e4` / `1.d4` / `1.c4` / `1.Nf3`, and Black full repertoire or a scope against a common first move.

Normal setup does **not** ask for a coverage percentage or a hard low/medium/high theory ceiling. Coverage is calculated from the opponent replies the user actually selects. A future independent theory preference must have understandable operational semantics before returning.

Selecting **Start building** closes the dialog and opens the routed workbench.

## Two decision roles

Builder alternates between two different questions.

### User move — choose the repertoire move

Question: **Which move should become part of my repertoire?**

A small candidate set is ranked according to the selected persona using separated evidence centered on:

- selected target-population frequency and performance;
- Masters practice;
- objective engine quality/cost;
- existing-course relationship where relevant.

Personal move history is factual context: whether the move is common, rare, or new for the user; how it has performed with adequate sample qualification; and when it was last played. It is not represented as broad `Profile fit`.

Opening classification and reviewed opening knowledge explain what kind of chess the candidate creates and which plans/caveats matter. They are secondary explanation rather than the main persona-ranking mechanism.

The user may preview or manually enter another legal move and receive the same evidence before accepting it.

### Persona semantics

**Balanced** prefers practical peer-tested choices. Peer evidence is primary; Masters and engine evidence validate that practicality. Small objective differences may be accepted when target-population evidence is clearly better.

**Solid** prefers established, dependable choices. Masters and objective quality carry more authority than in Balanced. Static opening labels can describe the resulting chess but do not define the rank by themselves.

**Aggressive** prefers active or imbalanced choices with strong practical evidence and meaningful Master justification. A bounded additional objective cost is acceptable. Aggressive remains more mainstream/theoretically justified than Surprise.

**Surprise** prefers uncommon but viable choices that materially overperform the normal result from the same position in the selected target population. Rarity, sample sufficiency, low Master frequency, and objective safety are explicit. A tiny high-result sample or a static `SURPRISE` classification label is not enough.

Exact numeric weights and statistical treatment are versioned implementation details and must be calibrated against representative positions before being locked.

### Opponent response — choose what to prepare

Question: **Which replies are important enough that this repertoire should prepare for them?**

Persona does not apply to the opponent. An opponent reply cannot become `Target Conflict` merely because the user chose a different style or lower-theory preference.

Preparation priority is driven by separated evidence centered on:

- selected target-population frequency/relevance;
- exact-position personal encounters;
- objective danger for uncommon but challenging replies;
- existing course coverage/gaps;
- Masters as secondary context where useful.

The system may recommend a preparation set, but the user can add, remove, defer, or explicitly ignore replies.

## Coverage is feedback

For the currently selected opponent replies, Builder shows the cumulative share of target-population games they represent, e.g. `Selected replies represent 82% of target games`.

Coverage is not a persona property and is not configured before the responses are visible. A versioned deterministic policy may propose a reasonable default set; it must not simply conceal the previous fixed persona percentages behind new wording.

Deferred work remains first-class.

## Personal evidence relationship

The standalone Player Chess Profile remains a separate deterministic product capability for broader tendencies across period, speed, color, and rating context.

Builder V2 instead exposes exact-position personal facts such as:

- `Common for you`;
- `Rare for you`;
- `New to you`;
- `Common for you · results below your baseline`, only with sufficient evidence;
- game/occurrence counts;
- personal score and position-relative comparison;
- last-played date.

Familiarity uses all eligible indexed history. Recency is displayed separately rather than enforced as an invisible three-month cutoff.

## Visual workbench target

The core Builder remains the routed board-first Cockpit delivered through RB-026.

Preserve:

- one readable primary board and engine evaluation bar;
- compact candidate switching that updates the board and focused evidence;
- a persistent decision brief;
- reviewed opening descriptions, plans, conditions, and caveats;
- inspectable deterministic evidence and reasons;
- manual legal move entry;
- actions, branch queue, defer/ignore/stop/reopen controls, and bounded draft preview;
- preview before course changes are written;
- responsive stacking rather than a separate mobile workflow.

V2 changes the evidence hierarchy, not the Cockpit concept.

For user moves, rows foreground engine, target-population, and Masters evidence plus concise factual personal familiarity. For opponent moves, rows foreground preparation priority and selected coverage.

Normal Builder UI keeps the opening name and strategic knowledge but removes ECO codes/badges such as `A01`. Ambiguous labels such as `target play` should be replaced by explicit target-population wording.

The simultaneous multi-board candidate landscape remains rejected as the default.

## Target environment

A target uses one product speed preset: All speeds, Blitz and slower, Blitz, or Bullet.

The current population foundation uses one mixed Lichess Explorer population for combined presets unless later evidence demonstrates a material recommendation problem.

A target rating population can be all players, the resolved peer interval, the peer interval plus one adjacent higher group, or one explicit Lichess benchmark group. The factual peer interval remains inspectable and versioned. Masters remains a separate corpus rather than the only definition of correctness.

## Opening classification and knowledge boundary

Opening classification remains deterministic side-aware intrinsic metadata. Opening knowledge remains reviewed, deterministic, and ranking-neutral.

Their V2 role is explanatory:

- ranking says **why this candidate is strong for the selected target/persona**;
- classification/knowledge says **what kind of chess it creates and what plans/caveats matter**.

They must not silently recreate the old persona policy through hard character/theory-fit badges.

## Course output and adaptation

Before writing, the user should see selected lines/branches, computed target-population coverage for selected replies, deferred/ignored responses, course conflicts/transpositions, and low-confidence evidence.

Course preview/apply remains the write authority. The same workbench supports covering frequent replies, extending early endings, reconsidering a user move, adapting to a different target environment, creating another persona, and deferring low-priority branches.

## Explainability target

Every user-move recommendation should answer:

- Why is this candidate shown and ranked here?
- What do peers do and how does it perform relative to the position baseline?
- What do Masters do?
- What objective cost is accepted?
- Is this move common, rare, or new in my own indexed history?
- What kind of chess and plans does it create?

Every opponent-response decision should answer:

- How common is this reply in the target population?
- Have I actually faced it?
- Is it unusually challenging despite low frequency?
- Is it already covered?
- What share of target games do my selected replies represent?

Deterministic evidence remains authoritative and visible. Generated interpretation may assist but never selects moves or changes state.

## North-star success

The program succeeds when a user can:

1. define one understandable build scope, environment, and persona;
2. visually choose between empirically meaningful user-move candidates;
3. prepare for opponent replies that matter without confusing preparation with persona fit;
4. understand whether a move is familiar/new and whether personal results are concerning without turning history into a hidden constraint;
5. create or update a trainable course through explicit preview/apply;
6. understand why every recommendation or preparation priority was made;
7. maintain multiple repertoire personas;
8. return after real games and evolve the material using new evidence.

RB-016 owns future outcome measurement after sufficient post-V2 usage exists.

See [`BUILDER_V2_PLAN.md`](BUILDER_V2_PLAN.md) for the detailed migration plan and examples.
