# Repertoire Builder V2 decision model

Last updated: 2026-08-09

Status: **Agreed product direction; implementation planned through RB-027–RB-031**

This document records the product-owner review of the current Builder and the agreed V2 decision model. It is a target plan, not a claim that V2 behavior already exists on `main`.

## Why V2 exists

The current Builder got several important things right: the board-first Cockpit, compact candidate preview, focused decision brief, reviewed opening plans, manual move entry, recursive branch queue, explicit defer/ignore/stop states, and course preview/apply boundaries are worth preserving.

The review found a deeper problem in the decision semantics. The current product mixes four different concepts — repertoire intent, opponent-response relevance, broad Player Chess Profile similarity, and opening classification — into badges and setup controls that look more authoritative than they are.

V2 keeps the interaction model and changes the authority model.

## Core model

Builder alternates between two questions:

| Decision role | Question | Primary authority |
| --- | --- | --- |
| **Your move** | Which move should become part of my repertoire? | Selected persona applied to peer population, Masters and engine evidence |
| **Opponent response** | Which replies are important enough that I should prepare for them? | Peer frequency/relevance, exact personal encounters, objective danger and course state |

Persona applies only to **your** choices. It cannot make an opponent move aligned or conflicting with the repertoire.

The recursive flow remains:

```text
choose one setup target
        |
        v
   YOUR MOVE
peer <-> Masters <-> engine
   persona interprets evidence
        |
  accept one move
        |
        v
 OPPONENT RESPONSES
frequency + personal encounters + danger
        |
select/defer/ignore important replies
        |
        v
   YOUR MOVE
        ...
```

## One setup dialog, not two persona steps

Normal new-draft setup remains one focused dialog. Persona appears exactly once.

The target surface should contain:

1. repertoire side and starting scope;
2. speed population;
3. rating target;
4. one persona: **Balanced / Solid / Aggressive / Surprise**.

Useful starting-scope shortcuts should reuse existing starting-position/session mechanics. Examples are White full repertoire or a common first move (`1.e4`, `1.d4`, `1.c4`, `1.Nf3`) and Black full repertoire or a response scope such as `against 1.e4` or `against 1.d4`.

The normal setup should not ask the user to configure:

- an opponent-response coverage percentage;
- persona-specific coverage defaults;
- a hard low/medium/high maximum theory burden;
- a second persona/objective page.

If an independent theory preference later returns, it must have understandable operational semantics rather than being a static classification ceiling.

## Revised personas

The current personas are too tightly coupled to static opening traits. V2 treats them as empirical ranking policies for user moves.

### Balanced

**Question:** What practical move tends to work for players around my level without creating an unjustified objective concession?

- peer evidence is the strongest practical signal;
- Masters and engine evidence validate the choice;
- raw popularity alone is not enough;
- small engine differences may be ignored when peer evidence is clearly better.

### Solid

**Question:** What is the most established, dependable choice?

- Master practice carries more authority;
- engine quality is stricter;
- peer evidence remains relevant but does not override strong theoretical/objective evidence casually;
- static labels such as `SOLID` or `POSITIONAL` explain the resulting chess but do not define the rank by themselves.

### Aggressive

**Question:** Where can I create active or imbalanced play while remaining genuinely justified?

- strong practical peer results matter;
- meaningful Master support distinguishes it from a speculative surprise weapon;
- a bounded additional engine cost is acceptable;
- opening knowledge can explain why the position is sharp/dynamic, but the label is secondary to the empirical evidence.

### Surprise

**Question:** Which uncommon viable move performs unexpectedly well against the selected target population?

A credible Surprise candidate requires a combination of:

- low target-population frequency;
- score materially above the normal score from the same position;
- sufficient sample size;
- preferably low Master frequency, showing that the move is genuinely uncommon in established practice;
- bounded objective cost with reliable engine evidence.

A tiny sample with a high win rate is not enough. A static `SURPRISE` opening-classification label is not enough. An uncommon candidate that lacks objective evidence must not be advertised as safe.

### Aggressive versus Surprise

The distinction is deliberate:

- **Aggressive = backed aggression.** Active, forcing or imbalanced choices that retain meaningful mainstream/Master justification.
- **Surprise = practical anomaly.** Less expected choices whose target-population results are unusually strong despite lower frequency and lower Master adoption, while remaining objectively viable.

## Peer versus Masters evidence

Peer and Masters data should not be collapsed into one vague `target fit` concept.

For user moves the useful comparison is:

- how often peers choose the move;
- how the move scores relative to the peer baseline from the same position;
- how often Masters choose it;
- how Masters score where meaningful;
- objective engine cost relative to the best supported candidate.

For example, if peers normally score 51% from a position and a candidate scores 58% across a credible sample, the useful practical signal is approximately `+7 percentage points versus the position baseline`, not simply `58% > 50%`.

V2 must calibrate this with deterministic benchmark positions before locking new weights. The product should not replace one arbitrary weight table with another.

## Personal evidence: familiarity, not profile fit

The user wants to know whether a candidate is something they actually play.

Builder should answer directly:

- **Common for you**;
- **Rare for you**;
- **New to you**;
- and, when supported, **Common for you · results below your baseline** or the positive equivalent.

Underlying factual evidence should include:

- exact-position move games/occurrences;
- share of the user's moves from that position where meaningful;
- personal score;
- position-relative result comparison with adequate sample qualification;
- last-played date;
- effective account/side/rated/speed filters.

Familiarity should use all eligible indexed history. A game from 2024 still matters to the question "do I know/play this move?". Recency should be displayed separately rather than turning the Player Chess Profile's default three-month window into an invisible familiarity cutoff.

The standalone Player Chess Profile remains useful elsewhere. Broad matches such as `Sound + Positional + Mainline` should not be presented inside Builder as proof that a specific move is familiar or suited to the player.

V2 therefore removes primary `Profile Aligned/Conflict` from Builder decisions. Personal history is primarily informational rather than a persona-ranking authority, so repeated old habits do not automatically outrank better empirical choices.

## Opponent responses: preparation, not fit

Opponent turns should not show `Target Conflict` because the opponent chose a high-theory opening. The opponent is not constrained by the user's persona.

The relevant question is preparation priority.

A useful response row should explain facts such as:

```text
...c5   18% of target games   faced 192 times   high preparation priority
...e6   10% of target games   faced 73 times
...d6    3% of target games   rare, but objectively dangerous
```

Priority should combine separated evidence:

- peer frequency/relevance;
- personal encounters;
- objective danger;
- existing course coverage/gap;
- Masters only as secondary context where useful.

## Coverage becomes feedback

The current 50–100% setup slider asks the user to configure an implementation concept before seeing the responses. V2 removes it from normal setup.

Instead, the opponent-response surface should produce a deterministic **recommended preparation set** and show the resulting coverage:

```text
Recommended preparation
[x] ...e5   45%
[x] ...c5   18%
[x] ...e6   10%
[x] ...d5    9%
[ ] ...d6    3%

Selected replies represent 82% of target games.
```

The user remains in control: add, remove, defer or ignore responses before acceptance. Every accepted response still creates its own continuation branch through the existing session reducer.

The exact recommendation/stopping rule must be versioned and tested. V2 does not hide the old 70/80/85 persona defaults behind new labels.

## Opening classification and opening knowledge

Both remain valuable, but with a clearer role.

**Empirical ranking answers:** Why is this move a good candidate for this target and persona?

**Opening classification/knowledge answers:** What kind of chess does this move create, and what strategic plans/caveats should I understand?

Opening knowledge stays ranking-neutral. Classification is secondary descriptive evidence rather than the cornerstone of persona fit.

Normal Builder UI should keep the opening name and reviewed plans while removing ECO codes/badges such as `A01`, which add little to this decision surface.

## Cockpit presentation

RB-026's three-zone Cockpit remains the base layout.

### User move row

A compact V2 row should tend toward:

```text
#1 Bf4   +0.25   Peers 20% · +6pp   Masters 8%
          Rare for you · 4 games
```

rather than:

```text
#1 Bf4   +0.25   20% target play
          Target Aligned   Profile Aligned
```

### Focused decision brief

The brief should explain dominant tradeoffs deterministically:

```text
Why Balanced prefers Bf4

Strong practical result
Peers choose it in 20% of games and score +6pp versus the
normal result from this position.

Established enough
Seen in 8% of Master games.

Objectively safe
Only 0.02 below the best stored line.

Your experience
Rare for you — 4 games. Last played Oct 2024.
```

Opening identity, intrinsic traits and strategic plans follow as explanatory context.

### Opponent response row

Opponent rows foreground preparation evidence and selection state, not persona/profile fit.

## What V2 preserves

- large primary board;
- engine evaluation bar;
- candidate preview on the board;
- compact candidate switcher;
- focused decision brief;
- opening descriptions, plans, conditions and caveats;
- evidence detail expansion;
- deterministic `why ranked here` explanation;
- manual legal move entry;
- branch queue and branch preview;
- multiple opponent-response selection;
- defer, ignore, stop and reopen semantics;
- mandatory course preview/apply;
- optional generated interpretation as read-only/non-authoritative;
- route-local session boundary until persistence is separately justified.

## Implementation order

### RB-027 / #317 — empirical persona ranking V2

Define and calibrate the new user-move authority model before UI copy is finalized.

### RB-028 / #318 — factual personal move evidence

Provide common/rare/new, results and recency at the exact position and remove broad Profile Fit from Builder.

### RB-029 / #319 — opponent preparation and computed coverage

Remove opponent target/profile fit, produce a recommended response set and make coverage observable feedback.

### RB-030 / #320 — single-dialog setup

Persona appears once. Keep side/scope, speed, rating target and persona; remove the coverage slider and hard theory control.

### RB-031 / #321 — Cockpit evidence hierarchy V2

Integrate the final evidence models into the already-shipped Cockpit, including ECO removal and clear rank explanations.

RB-016 outcome feedback remains blocked. It should evaluate post-V2 behavior rather than calibrating the semantics that V2 is replacing.

## Decisions intentionally not locked yet

- exact numeric persona weights;
- exact peer overperformance shrinkage/confidence formula;
- exact common/rare personal thresholds;
- exact recommended opponent-response stopping rule;
- whether an uncommon candidate requires bounded on-demand engine evaluation or can be supported entirely by existing stored analysis;
- whether a future understandable soft theory preference is valuable after V2 is used.

These belong to the new tasks and must be backed by representative positions and tests.
