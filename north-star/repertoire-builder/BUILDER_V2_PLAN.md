# Repertoire Builder V2 decision model

Last updated: 2026-08-10

Status: **Agreed product direction; RB-027 and RB-028 implemented, RB-029–RB-031 remain incremental delivery work**

This document records the product-owner review of the Builder and the agreed V2 decision model. It is both the target plan for the remaining V2 tasks and a coordination record for the portions already implemented. RB-027's empirical `USER_MOVE` ranking and RB-028 factual exact-position personal evidence are now implemented; opponent preparation/coverage, setup consolidation and final Cockpit hierarchy remain downstream work.

## Why V2 exists

The current Builder got several important things right: the board-first Cockpit, compact candidate preview, focused decision brief, reviewed opening plans, manual move entry, recursive branch queue, explicit defer/ignore/stop states, and course preview/apply boundaries are worth preserving.

The review found a deeper problem in the decision semantics. The product mixed four different concepts — repertoire intent, opponent-response relevance, broad Player Chess Profile similarity, and opening classification — into badges and setup controls that looked more authoritative than they were.

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

V2 treats personas as empirical ranking policies for user moves. RB-027 implemented this authority model as a versioned deterministic policy.

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

- **Aggressive = backed aggression.** Active or imbalanced practical choices with stronger mainstream/Master support and more tolerance for bounded objective cost.
- **Surprise = practical anomaly.** Less expected choices whose target-population results are unusually strong despite lower frequency and lower Master adoption, while remaining objectively viable.

## Peer versus Masters evidence

Peer and Masters data are not collapsed into one vague `target fit` concept.

For user moves the implemented corpus comparison is:

- how often peers choose the move;
- how the move scores relative to the target-side baseline from the same exact position;
- how often Masters choose it;
- how Masters score relative to their same-position target-side baseline where meaningful;
- objective engine cost relative to the best usable stored candidate.

For example, if peers normally score 51% from a position and a candidate scores 58% across a credible sample, the useful practical signal is approximately `+7 percentage points versus the position baseline`, not simply `58% > 50%`.

RB-027 locked a versioned policy after representative deterministic tests rather than leaving this as an unversioned weight table. The current empirical preset floors are 20 selected-population games and 10 Masters games. Surprise rarity contributes only after at least +3 percentage points versus the selected-position baseline. The exact persona weights and objective guardrails are recorded in `reports/RB-027-2026-08-10-empirical-persona-ranking-v2-closure.md`.

Objective evidence uses only already-stored legal, internally consistent roots at depth at least 12 with score/mate evidence. RB-027 did not add candidate-specific on-demand or unbounded engine analysis.

## Personal evidence: familiarity, not profile fit

The user wants to know whether a candidate is something they actually play.

Builder now answers directly:

- **Common for you**;
- **Rare for you**;
- **New to you**;
- and, when supported, **Common for you · results below position baseline** or the positive equivalent.

Underlying factual evidence includes:

- exact-position move games/occurrences;
- share of the user's moves from that position;
- personal score;
- position-relative result comparison with adequate sample qualification;
- last-played date;
- effective account/side/rated/speed filters and explicit all-indexed-history scope.

Familiarity uses all eligible indexed history. A game from 2024 still matters to the question "do I know/play this move?". Recency is displayed separately rather than turning the Player Chess Profile's default three-month window into an invisible familiarity cutoff.

The standalone Player Chess Profile remains useful elsewhere. Broad matches such as `Sound + Positional + Mainline` are not presented inside Builder as proof that a specific move is familiar or suited to the player.

RB-028 implements this model through Candidate Decision V4 and factual policy `2026-08-personal-move-v1`. The new all-history/context fields remain presentation evidence and do not enter the existing personal ranking input.

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

RB-029 owns this policy. RB-027 intentionally leaves `OPPONENT_RESPONSE` ranking semantics unchanged; RB-028 factual personal evidence is available as separated encounter context.

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

Opening knowledge stays ranking-neutral. Classification is secondary descriptive evidence rather than the cornerstone of persona fit. RB-027 enforces that separation in preset USER_MOVE ranking authority.

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

**DONE.** Runtime PR #325 / squash `34dadd25`; final runtime CI #2392. Candidate Decision V3 introduced the versioned preset USER_MOVE corpus semantics.

### RB-028 / #318 — factual personal move evidence

**DONE.** Runtime PR #327; implementation head `9d0a65a5`; final runtime CI #2409. Candidate Decision V4 carries factual Common/Rare/New, recency/share, qualified result context and effective all-indexed history scope without adding new preset ranking authority.

### RB-029 / #319 — opponent preparation and computed coverage

**READY; next unclaimed policy task.** Remove opponent target/profile fit, produce a recommended response set and make coverage observable feedback.

### RB-030 / #320 — single-dialog setup

**READY.** Persona appears once. Keep side/scope, speed, rating target and persona; remove the coverage slider and hard theory control.

### RB-031 / #321 — Cockpit evidence hierarchy V2

**PROPOSED.** Integrate the final evidence models into the already-shipped Cockpit, including ECO removal and clear rank explanations after RB-029 settles opponent semantics.

RB-016 outcome feedback remains blocked. It should evaluate post-V2 behavior rather than calibrating semantics that V2 is replacing.

## Decisions intentionally not locked yet

RB-027 resolved the user-move persona weights, target-position baseline semantics, empirical sample floors, Surprise overperformance gate, bounded candidate seeding, and stored-engine evidence boundary for its current ranking-policy version.

RB-028 resolved the factual personal thresholds for policy `2026-08-personal-move-v1`: 5 distinct indexed games plus 20% exact-position move share for Common; at least 10 known-result games plus +/-5 percentage points versus the same-position baseline for a qualified result label.

Still open under downstream tasks:

- exact recommended opponent-response stopping rule — RB-029;
- V1 target-field compatibility/removal details required by setup/coverage changes — RB-029/RB-030;
- whether a future understandable soft theory preference is valuable after V2 is used — deferred product evidence;
- final compact evidence hierarchy and responsive wording — RB-031.

Future changes to RB-027 ranking policy or RB-028 personal-evidence thresholds must be explicit, evidence-backed, and versioned rather than silently changing the meaning of existing Builder decisions.
