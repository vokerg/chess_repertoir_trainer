# Repertoire Builder Foundation

Last updated: 2026-07-26

This document records the stable agreements behind the repertoire-builder program. It describes target direction, not current product behavior.

## 1. Product premise

The north star is a **human-in-the-loop repertoire architect**.

The product should help a player construct and continuously evolve a repertoire that:

- is objectively defensible within the player's chosen risk tolerance;
- fits positions the player enjoys or deliberately wants to learn;
- is relevant to the time controls and rating populations the player expects;
- uses master practice, population practice, engine evaluation, personal games, tags and existing courses as evidence;
- covers important opponent responses without pretending every legal move must be studied now;
- remains reviewable, explainable, editable and owned by the player.

The system proposes and organizes. The user decides.

## 2. Four separate evidence layers

Do not collapse these layers into one profile or one unexplained score.

### 2.1 Intrinsic opening profile

A side-aware description of an opening or variation: soundness, sharpness, tacticality, solidity, theoretical status, practical risk, learning burden and future dimensions.

The classification method is intentionally independent and unresolved.

### 2.2 Target-population profile

How moves and openings behave in a selected playing environment:

- provider/population source;
- one product speed preset;
- one peer-rating target;
- move frequency and score;
- response diversity;
- changes across benchmark bands and presets.

This layer describes the environment, not the user.

### 2.3 Player Chess Profile

What the player tends to choose and how well those choices work, calculated from filtered personal games and analysis.

Preference and performance are separate.

### 2.4 Repertoire target

The intent of the repertoire being built now. It can deliberately differ from the measured player profile or factual peer level.

Examples:

- general-purpose repertoire;
- Bullet repertoire;
- Blitz and slower repertoire;
- solid `1.d4` repertoire;
- sharp or dubious `1.d4` repertoire;
- low-theory repertoire;
- future trap-oriented repertoire.

## 3. User control is foundational

Profile conclusions and factual peer ranges are suggestions/defaults, never hard constraints.

The system must distinguish:

- profile-derived recommendation;
- factual player-level evidence;
- explicit repertoire intent;
- manual user choice.

Manual choice wins. The application may warn about tradeoffs but must not silently override it.

## 4. Speed targeting uses product presets

The first product contract exposes exactly four presets:

- **All speeds** — bullet, blitz, rapid, classical and correspondence;
- **Blitz and slower** — blitz, rapid, classical and correspondence;
- **Blitz**;
- **Bullet**.

UltraBullet is excluded.

The upstream Lichess API may accept arbitrary speed arrays, but arbitrary combinations are not part of the product target. A combined preset uses one mixed Lichess Explorer response; the MVP does not fetch and weight every speed separately.

Default: **Blitz and slower**.

## 5. Rating targeting and player level

The product peer bands are aligned directly to the nine Lichess Explorer groups:

- `<1000`;
- `1000–1199`;
- `1200–1399`;
- `1400–1599`;
- `1600–1799`;
- `1800–1999`;
- `2000–2199`;
- `2200–2499`;
- `2500+`.

Lichess ratings classify directly. Chess.com bullet, blitz and rapid ratings map into the same bands through versioned approximate source ranges in the shared rating-normalization domain. Raw cross-provider ratings must not be averaged or compared directly.

The population target supports:

- all players;
- my peers;
- my peers plus one adjacent higher band;
- one explicit benchmark group.

Default: **My peers and above**, defined as the resolved peer interval plus exactly one higher group where available.

RB-001 provides an on-demand peer resolver from owned imported standard games:

1. last three months;
2. all history when no recent evidence exists;
3. `1400–1599` as the generic fallback containing rating 1500.

It resolves a dominant contiguous interval from the band distribution and returns visible provenance. The exact dominance threshold is versioned and tested by RB-001.

RB-002 later owns durable multi-account storage/snapshot, confidence, exclusions and override semantics. The factual result remains inspectable and can be overridden for a particular repertoire target without being mutated.

## 6. Player Chess Profile principles

The Chess Profile is a standalone product capability and a north-star input.

It should be recalculable for selected periods, accounts, speed presets, colors and rating context. Conclusions retain:

- total and analysed game counts;
- color and speed context;
- peer/benchmark context;
- baseline comparison;
- opening-position outcome;
- score and confidence;
- supporting openings and games.

Tags are useful signals but not a complete statistical model.

The profile should distinguish what the player chooses, what produces good positions/results, what holds against peers or stronger players and what changes by context.

## 7. Opening classification dependency

The plan assumes every named opening can be resolved to a side-aware opening profile.

Agreed needs include soundness, sharpness/tacticality, positional/solid character, mainline/sideline status, theory burden and side perspective.

Algorithm, curation, hierarchy, storage, taxonomy, confidence and update process remain assigned to RB-003.

## 8. Candidate selection and explanation

At a user decision point, compare a small set of meaningful candidate moves using separated evidence:

- engine evaluation;
- master practice;
- selected population practice;
- personal familiarity/results;
- existing repertoire coverage/conflict;
- opening character and learning burden;
- target fit;
- advisory profile fit.

At an opponent decision point, prioritize responses using selected-population frequency, personal occurrence, danger, objective relevance, existing coverage and coverage budget.

Every recommendation exposes reasons, sample size and missing evidence.

## 9. Visual interaction is required

The final choice experience is visual, not only SAN tables.

The substantial builder should be a routed, resumable workbench. Exact boards/cards/branch-map composition remains a prototype task.

## 10. Existing courses use the same mechanism

New repertoire generation and existing-course improvement are entry points into the same decision process.

Existing courses should eventually enter from uncovered responses, early endings, repeated deviations, weak choices, changed population targets or alternative personas.

Accepted changes should reuse current course-tree/reintegration patterns after reinspection.

## 11. Traps and repertoire personas

The plan reserves room for solid, sharp, positional, dubious, low-theory and future traps-oriented personas, including multiple courses from the same opening with different intent.

Traps remain research; no data source or schema is assumed.

## 12. LLM boundary

LLM integration is optional.

Possible roles include explanation, summarization, naming and conversational navigation. An LLM is not the factual source of engine data, population statistics, ownership, writes or opening classification without a later reviewed task.

## 13. Delivery philosophy

Advance through small deliveries with standalone value that compound toward the north star.

Unknown UX and optional AI work must not block deterministic evidence foundations or the standalone Chess Profile.

## 14. Verified repository anchors at foundation creation

These anchors must be reverified by each task:

- local named opening lookup;
- imported-game filters and game-recorded ratings;
- game tags and position-level personal move/results analysis;
- shared Masters/rated Lichess Opening Explorer and cache;
- course trees and line editor;
- course review, continuation gaps and endings;
- analysis-tree preview/reintegration;
- shared versioned rating-normalization domain.

These are implementation inputs, not authorization to reuse them without current inspection.

## 15. Non-goals of the foundation

This foundation does not decide:

- exact opening-classification mechanics;
- the durable RB-002 multi-account formula and persistence;
- the exact RB-001 dominant-range threshold;
- candidate-ranking weights;
- final builder UI;
- whether/how an LLM is used;
- traps data source/schema;
- builder-session persistence;
- final API field names beyond the agreed preset/target concepts.

Those details belong to ordered tasks and evidence-based implementation decisions.
