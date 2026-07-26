# Repertoire Builder Foundation

Last updated: 2026-07-26

This document records the stable agreements behind the repertoire-builder program. It describes target direction, not current product behavior.

## 1. Product premise

The north star is a **human-in-the-loop repertoire architect**.

The product should help a player construct and continuously evolve a repertoire that:

- is objectively defensible within the player's chosen risk tolerance;
- fits the positions the player enjoys or deliberately wants to learn;
- is relevant to the time controls and rating populations the player expects to face;
- uses master practice, population practice, engine evaluation, personal games, tags, and existing courses as evidence;
- covers the opponent responses that matter without pretending every legal move must be studied now;
- remains reviewable, explainable, editable, and owned by the player.

The system proposes and organizes. The user decides.

## 2. Four separate evidence layers

Do not collapse these layers into one profile or one unexplained score.

### 2.1 Intrinsic opening profile

A side-aware description of an opening or variation: soundness, sharpness, tacticality, solidity, theoretical status, practical risk, learning burden, and other future dimensions.

The program assumes this information will exist in a reusable form. The method for classifying every named opening is intentionally not decided here and will be solved independently.

### 2.2 Target-population profile

How moves and openings behave in a selected playing environment:

- provider or general population;
- one or more speed categories;
- rating range or normalized rating grades;
- move frequency and score;
- response diversity;
- changes across rating bands and speeds.

This layer describes the environment, not the user.

### 2.3 Player chess profile

What the player tends to choose and how well those choices work, calculated from filtered personal games and analysis.

Preference and performance are separate. A player may prefer sharp openings while performing better in solid ones, or may obtain good opening positions without converting them.

### 2.4 Repertoire target

The intent of the repertoire being built now. It can deliberately differ from the measured player profile.

Examples:

- general-purpose repertoire;
- bullet and blitz repertoire;
- blitz and rapid repertoire;
- classical repertoire;
- solid `1.d4` repertoire;
- sharp or dubious `1.d4` repertoire;
- low-theory repertoire;
- future trap-oriented repertoire.

## 3. User control is foundational

Profile conclusions are suggestions, never hard constraints.

The product may say:

> Based on your recent games, you usually prefer sharp positions and perform well in them against peers.

The user may still choose:

- a solid repertoire;
- a deliberately dubious repertoire;
- a second repertoire for another speed;
- a course designed to stretch weaknesses rather than maximize immediate results;
- a trap-oriented repertoire when the supporting data exists.

The system must distinguish between:

- `profile-derived recommendation`;
- `explicit repertoire intent`;
- `manual user choice`.

Manual choice wins. The application may warn about tradeoffs but must not silently override it.

## 4. Speed targeting supports combinations

A repertoire target may select any non-empty combination of:

- bullet;
- blitz;
- rapid;
- classical.

Examples include bullet only, bullet plus blitz, blitz plus rapid, or all four.

`General` is a distinct mode, not a synonym for naively merging every game. It requires controlled weighting so the largest or fastest population does not dominate by accident.

For a selected combination, the system will eventually need explicit or derived weights. The exact defaults remain open. Candidate options include equal weighting, weighting by the user's own playing distribution, and editable weights.

## 5. Rating targeting and multi-account level

The builder should support at least:

- general population;
- around the player's level;
- the player's level plus one normalized grade;
- the player's level plus several normalized grades;
- custom ranges.

Cross-provider comparison should reuse the repository's versioned rating-normalization domain once available on the working base.

A player may have:

- multiple Lichess accounts;
- multiple Chess.com accounts;
- different current ratings by speed;
- accounts with different recency and game volume.

The program therefore requires a reusable **player level resolution** calculation. The exact formula is intentionally open. It must eventually address:

- account selection and exclusions;
- provider and speed normalization;
- current rating versus period rating;
- recency;
- game volume and confidence;
- outlier or inactive accounts;
- whether one level or one level per selected speed is produced.

The resolved level must remain inspectable. The user must be able to see which accounts and ratings contributed and override the result when building a repertoire.

## 6. Player chess profile principles

The Chess Profile is a standalone product capability and a north-star input.

It should be recalculable for a selected period, accounts, speeds, colors, and opponent/rating context. Initial periods should align with existing application filters where practical, including last month, last three months, year to date, one year, all time, and custom ranges.

Conclusions must retain evidence:

- total and analysed game counts;
- color and speed;
- rating context;
- baseline comparison;
- opening-position outcome;
- score and confidence;
- supporting openings and games.

Existing game tags are useful signals, especially opening success, advantage, trouble, disaster, early mistakes, and early blunders. They are not sufficient as the sole explanation or statistical model.

The profile should distinguish:

- what the player chooses;
- what produces good opening positions;
- what produces good results;
- what holds against peers;
- what holds against stronger players;
- what changes by speed, color, and period.

## 7. Opening classification dependency

The plan assumes every named opening can be resolved to a side-aware opening profile one way or another.

Agreed high-level needs include dimensions such as:

- soundness or dubiousness;
- sharp/tactical versus positional/solid character;
- principal/mainline/sideline status;
- learning and theory burden;
- White and Black perspectives.

The following remain deliberately blank in this program foundation:

- classification algorithm;
- manual versus derived ownership;
- inheritance model;
- taxonomy details;
- persistence format;
- confidence model;
- update process.

Those decisions belong to the independent opening-classification task and must not be smuggled into player-profile or builder implementation.

## 8. Candidate selection and explanation

At a user decision point, the system should compare a small set of meaningful candidate moves using separated evidence:

- engine evaluation and distance from best;
- master practice;
- selected population practice;
- personal familiarity and results;
- existing repertoire coverage or conflict;
- opening character and learning burden when available;
- fit with the selected repertoire target;
- fit with the player profile, clearly labelled as advisory.

At an opponent decision point, the system should prioritize responses using selected-population frequency, personal occurrence, danger, objective relevance, existing coverage, and the chosen coverage budget.

Every recommendation must expose reasons and limitations. Missing datasets must be visible rather than silently replaced with invented certainty.

## 9. Visual interaction is required

The final choice experience must be visual, not only a table of SAN lines.

The exact composition is open, but it should make positions and consequences understandable through boards, move previews, branch context, or other interactive visual evidence.

A small setup dialog may begin the flow. The substantial builder should be a resumable routed workbench rather than a fragile modal-only wizard.

## 10. Existing courses use the same mechanism

New repertoire generation and existing-course improvement are two entry points into the same decision process.

Existing courses should eventually enter the builder from:

- uncovered opponent responses;
- course endings that stop too early;
- repeated user deviations;
- weak or unsuitable repertoire choices;
- changed speed/rating targets;
- deliberate creation of another course persona.

Accepted changes should reuse existing course-tree and reintegration patterns where they remain appropriate after current-repo inspection.

## 11. Traps and repertoire personas

The plan reserves room for:

- solid, sharp, positional, dubious, low-theory, and other repertoire personas;
- multiple courses beginning from the same opening but targeting different intents;
- a future traps knowledge source and trap-oriented builder mode.

The traps concept is intentionally vague. Required future questions include what constitutes a trap, how positions and refutations are represented, how soundness is labelled, what source data is legitimate, and how a trap line differs from an ordinary practical sideline.

## 12. LLM boundary

LLM integration is possible but not required for the core plan.

Potential roles include:

- explaining evidence and tradeoffs;
- summarizing a player profile;
- narrating why a recommendation fits a target;
- helping organize chapters or names;
- conversational navigation through the builder.

An LLM must not be the unverified source of engine facts, population statistics, ownership checks, course writes, or opening classification unless a later task explicitly establishes a reviewed workflow.

## 13. Delivery philosophy

The program should advance through small deliveries that have value now and compound toward the north star.

Each capability is labelled as one of:

- standalone/general improvement;
- dual-use standalone and north-star enabler;
- north-star-specific;
- optional research.

Unknown UX and optional AI work must not block deterministic evidence foundations or the standalone Chess Profile.

## 14. Verified repository anchors at foundation creation

These anchors were inspected when this foundation was created and must be reverified by future tasks:

- local named opening lookup from generated Lichess opening data;
- imported-game filters for dates, speeds, ratings, colors, openings, tags, and accounts;
- game tags including opening success, advantage, trouble, disaster, early mistakes, and speed categories;
- position-level personal next-move and result analysis;
- cached masters explorer evidence;
- course trees with one trained-side choice and multiple opponent branches;
- line editor integration with engine and personal games;
- course review, continuation gaps, and course endings;
- analysis-tree preview and reintegration into new or existing course lines;
- an open rating-normalization PR defining cross-pool normalized grades.

These are implementation inputs, not authorization to reuse them without inspecting their current state.

## 15. Non-goals of the foundation

This foundation does not decide:

- exact opening-classification mechanics;
- the multi-account level formula;
- candidate-ranking weights;
- exact general-mode weights;
- the final builder UI;
- whether or how an LLM is used;
- traps data source or schema;
- persistence for builder sessions;
- final API boundaries.

Those are assigned to ordered tasks and must be resolved with evidence.
