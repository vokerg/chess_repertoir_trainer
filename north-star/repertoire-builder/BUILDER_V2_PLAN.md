# Repertoire Builder V2 decision model

Last updated: 2026-08-11

Status: **Delivered through RB-027–RB-031; retained as the V2 decision-model design record**

This document records the product-owner review of the Builder and the agreed V2 decision model. RB-027 through RB-031 now implement that model: empirical `USER_MOVE` personas, factual exact-position personal evidence, role-specific opponent preparation/computed coverage, one-dialog setup, and the final Cockpit evidence hierarchy are integrated. Future changes require new evidence and explicit version/task changes rather than silently treating this plan as an unfinished queue.

## Why V2 exists

The Builder got several important things right: the board-first Cockpit, compact candidate preview, focused decision brief, reviewed opening plans, manual move entry, recursive branch queue, explicit defer/ignore/stop states, and course preview/apply boundaries were worth preserving.

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

RB-030 implements normal new-draft setup as one focused dialog. Persona appears exactly once.

The integrated target surface contains:

1. repertoire side and starting scope;
2. speed population;
3. rating target;
4. one persona: **Balanced / Solid / Aggressive / Surprise**.

Starting-scope shortcuts reuse existing starting-position/session mechanics: White full repertoire or common first moves (`1.e4`, `1.d4`, `1.c4`, `1.Nf3`), Black full response scope or preparation against those same first moves, plus custom FEN/PGN/SAN/UCI input. Exact existing-course launches keep their source position rather than applying a broader setup scope.

The normal setup does not ask the user to configure:

- an opponent-response coverage percentage;
- persona-specific coverage defaults;
- a hard low/medium/high maximum theory burden;
- a second persona/objective page.

The existing V1 target contract still receives fixed compatibility values for reproducibility: coverage `80` and a non-restrictive theory ceiling `HIGH`. They are compatibility material, not V2 user choices. If an independent theory preference later returns, it must have understandable operational semantics rather than being a static classification ceiling.

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

Opponent turns do not use Target/Profile fit. The relevant question is preparation priority.

A useful response row explains facts such as:

```text
...c5   18% of target games   faced 192 times   recommended
...e6   10% of target games   faced 73 times   recommended
...d6    3% of target games   rare, but objectively dangerous
```

RB-029 implements role-specific policy `2026-08-opponent-preparation-v1`. It uses separated evidence centered on:

- peer frequency/relevance;
- personal encounters;
- objective danger;
- existing course coverage/transposition context;
- Masters as secondary context where useful.

A post-merge correctness audit of the original PR #331 found that preparation had been applied after generic candidate truncation and that API/AI/course/provenance/default-selection boundaries were incomplete. Corrective PR #333 moved role-specific discovery/preparation authority before final truncation, aligned AI with the same decision path, supplied real opponent-side course context, returned authoritative policy provenance, default-selected the recommended set, and kept unknown selected coverage unavailable rather than fabricating `0%`.

## Coverage becomes feedback

V2 removes the old setup coverage slider from the user flow.

The opponent-response surface produces a deterministic recommended preparation set and reports selected target-population coverage:

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

The recommendation rule is versioned as part of `2026-08-opponent-preparation-v1`; V2 does not hide the old 70/80/85 persona defaults behind new labels.

## Opening classification and opening knowledge

Both remain valuable, but with a clearer role.

**Empirical ranking answers:** Why is this move a good candidate for this target and persona?

**Opening classification/knowledge answers:** What kind of chess does this move create, and what strategic plans/caveats should I understand?

Opening knowledge stays ranking-neutral. Classification is secondary descriptive evidence rather than the cornerstone of persona fit. RB-027 enforces that separation in preset USER_MOVE ranking authority.

RB-031 keeps opening identity and reviewed plans while removing normal ECO codes/badges and obsolete primary Target/Profile-fit chips from the decision surface.

## Cockpit presentation

RB-026's three-zone Cockpit remains the base layout. RB-031 implements the final V2 hierarchy inside it without replacing the workspace or recreating ranking in Angular.

### User move row

The V2 row foregrounds engine, selected target-population and Masters evidence plus factual personal/course context rather than opaque fit badges.

### Focused decision brief

The brief leads with deterministic ranking/preparation facts and authoritative reasons. Opening identity, intrinsic traits and strategic plans follow as explanatory context.

### Opponent response row

Opponent rows foreground Recommended/Optional preparation status, target-population contribution, personal/danger/course evidence and editable selection state, not persona/profile fit.

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

## Delivery record

### RB-027 / #317 — empirical persona ranking V2

**DONE.** Runtime PR #325 / squash `34dadd25`; final runtime CI #2392.

### RB-028 / #318 — factual personal move evidence

**DONE.** Runtime PR #327; implementation head `9d0a65a5`; final runtime CI #2409.

### RB-029 / #319 — opponent preparation and computed coverage

**DONE.** Original PR #331 plus corrective PR #333; role-specific policy `2026-08-opponent-preparation-v1`. See `reports/RB-029-2026-08-10-opponent-preparation-closure.md`.

### RB-030 / #320 — single-dialog setup

**DONE.** PR #335 final head `621ee6abb9a311646859357f8de41d4a6c4528e7` passed CI #2478 (`31420953443`) and squash-merged as `9bfcf3f5b4337c827719f5ee170bcd5f67b6f3c2`. See `reports/RB-030-2026-08-11-single-dialog-setup-v2-closure.md`.

### RB-031 / #321 — Cockpit evidence hierarchy V2

**DONE.** PR #336 final head `a7ed94bdad896bc852685ad25de1dc87bee89e8f` passed CI #2486 (`31422515093`) and squash-merged as `e6c024afec1753838dec900181ca4023d6114676`. See `reports/RB-031-2026-08-10-cockpit-evidence-hierarchy-closure.md`.

RB-016 outcome feedback remains blocked. It should evaluate real post-V2 behavior after enough material has been built, trained and encountered in later games.

## Decisions after V2 delivery

The delivered policies are explicit and versioned:

- RB-027 owns current preset user-move weights, sample floors, Surprise overperformance gate and stored-engine boundary;
- RB-028 owns current factual personal Common/Rare and qualified-result thresholds through `2026-08-personal-move-v1`;
- RB-029 owns current opponent recommendation/discovery/stopping semantics through `2026-08-opponent-preparation-v1`;
- RB-030 fixes V1 setup compatibility to coverage `80` and theory ceiling `HIGH` while removing those as V2 user decisions;
- RB-031 owns the final V2 presentation hierarchy but not ranking authority.

Still open only as future evidence questions, not unfinished V2 delivery:

- whether a genuinely understandable independent theory preference is valuable after real usage;
- whether any current policy thresholds need recalibration after representative post-V2 outcome evidence;
- whether the V1 target contract should receive a future structural version that removes compatibility fields.

Future changes to ranking, personal-evidence, opponent-preparation or target semantics must be explicit, evidence-backed, versioned where appropriate, and allocated to a new task or a legitimately unblocked existing task rather than silently changing the meaning of integrated Builder decisions.
