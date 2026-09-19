# Repertoire Builder Foundation

Last updated: 2026-08-09

This document records stable agreements behind the repertoire-builder program. It describes target direction, not current runtime behavior.

## 1. Product premise

The north star is a **human-in-the-loop repertoire architect**.

The product should help a player construct and continuously evolve a repertoire that:

- is objectively defensible within the chosen practical risk;
- is relevant to the time controls and rating populations the player expects;
- uses peer-population practice, Masters practice, engine evaluation, personal games, reviewed opening knowledge, and existing courses as separated evidence;
- covers important opponent responses without pretending every legal move must be studied now;
- remains reviewable, explainable, editable, and owned by the player.

The system proposes and organizes. The user decides.

## 2. Separate evidence layers

Do not collapse evidence into one profile or one unexplained score.

### 2.1 Intrinsic opening profile

A side-aware deterministic description of an opening or variation: soundness, character, theoretical status, theory burden, roles, confidence, and related reviewed knowledge.

This layer describes the chess. It is not the primary empirical authority for persona ranking.

### 2.2 Target-population profile

How moves behave in the selected playing environment:

- one product speed preset;
- one peer-rating target;
- move frequency;
- target-side score;
- position-relative performance;
- response diversity and sample size.

This layer describes the environment, not the user.

### 2.3 Personal move evidence

Exact-position personal history answers whether the user actually plays a move and how it has worked:

- games/occurrences and share;
- score with sample qualification;
- position-relative result context;
- last-played date;
- effective account/side/rated/speed filters.

For Builder familiarity, all eligible indexed history matters. Recency is a separate fact, not an invisible hard cutoff.

### 2.4 Player Chess Profile

The Player Chess Profile remains a separate standalone capability for broader tendencies across periods, speeds, colors, rating context, and opening characteristics. It must not be presented as proof that a specific Builder move is familiar or suitable.

### 2.5 Repertoire target

The current build target records side/scope, speed population, rating population, and one selected persona. It may deliberately differ from the player's past habits.

## 3. User control is foundational

Factual peer ranges, personal history, profile conclusions, and recommendations are evidence, not constraints.

Manual user choice wins. The application may show objective or practical tradeoffs but must not silently override a legal choice.

## 4. Speed targeting uses product presets

The product exposes exactly four normal speed presets:

- **All speeds** — bullet, blitz, rapid, classical, and correspondence;
- **Blitz and slower** — blitz, rapid, classical, and correspondence;
- **Blitz**;
- **Bullet**.

UltraBullet and arbitrary product-facing speed mixtures remain excluded. A combined preset uses the existing mixed Lichess Explorer aggregate unless empirical recommendation testing demonstrates a material defect.

Default: **Blitz and slower**.

## 5. Rating targeting and factual player level

The product peer bands align to the nine Lichess Explorer groups. Provider-aware rating normalization remains versioned and shared; raw Chess.com and Lichess ratings are not averaged directly.

Population targets remain:

- all players;
- my peers;
- my peers plus one adjacent higher group;
- one explicit benchmark group.

The factual peer resolver remains inspectable and versioned. Its recent-evidence rule is a player-level resolution mechanism, not a Builder personal-familiarity period.

## 6. User-move recommendation authority

At a user decision point, compare a bounded candidate set using separated empirical evidence centered on:

- target-population practice and position-relative results;
- Masters practice;
- engine quality/cost;
- existing-course relationship where relevant.

The selected persona interprets those facts.

### Balanced

Peer-practical first, with Masters and engine validation.

### Solid

More conservative toward established Master practice and objective quality.

### Aggressive

Active/imbalanced choices with strong practical results, meaningful Master justification, and bounded extra objective cost.

### Surprise

Uncommon but viable practical outliers: low frequency, target-population overperformance relative to the position baseline, sufficient sample, lower Master adoption, and reliable objective safety.

Opening classification and opening knowledge explain the resulting chess but do not define these rankings by themselves. Broad Player Chess Profile fit is not a V2 ranking authority.

Exact weights, shrinkage/confidence functions, and candidate-seeding details remain versioned implementation work under RB-027.

## 7. Opponent-response authority

At an opponent decision point, the question is preparation priority, not persona fit.

Prioritize replies using separated evidence centered on:

- target-population frequency/relevance;
- exact-position personal encounters;
- objective challenge for uncommon replies;
- existing course coverage/gaps;
- Masters as secondary context when useful.

Persona, opening-character preference, theory ceiling, and Player Chess Profile fit do not determine whether an opponent reply matters.

Coverage is calculated from the actual selected replies and shown as target-population feedback. It is not a persona property or a mandatory setup percentage.

## 8. Setup principle

Normal setup is one focused dialog. Persona appears once.

It captures side/starting scope, speed population, rating target, and one persona. Coverage percentage and hard maximum-theory-burden controls are removed from normal setup.

Any future theory preference must have understandable operational semantics before becoming a user control.

## 9. Opening classification and knowledge

Opening classification remains a deterministic side-aware intrinsic taxonomy. Opening knowledge remains a separate reviewed deterministic service.

Their Builder role is explanatory:

- classification: what kind of chess the move creates;
- knowledge: strategic plans, conditions, and caveats.

Opening knowledge remains ranking-neutral. Classification must not silently recreate the old persona policy through hard fit badges.

## 10. Visual interaction is required

The Builder remains a routed board-first Cockpit with one readable primary board, candidate switching, a focused decision brief, branch/action controls, and responsive stacking.

The product must explain why candidates are ranked and why opponent replies are prioritized without requiring the user to reverse-engineer hidden weights.

## 11. Existing courses use the same mechanism

New repertoire generation and existing-course improvement remain entry points into the same decision loop. Course gaps, early endings, repeated deviations, weak choices, changed target environments, and alternative personas should reuse the Builder rather than create separate recommendation systems.

Accepted writes continue through explicit preview/apply boundaries.

## 12. Traps and Surprise are separate

`Surprise` is an empirical practical ranking policy, not a traps database. Production trap knowledge remains separately reviewed research with its own evidence and curation requirements.

## 13. LLM boundary

LLM integration remains optional and non-authoritative. It may explain deterministic evidence but does not select moves, calculate chess facts, mutate Builder state, or write courses.

## 14. Delivery philosophy

Advance through small versioned deliveries with standalone value. Calibrate statistical and ranking claims against representative evidence before locking numeric policy.

RB-027 through RB-031 implement the V2 revision. RB-016 outcome feedback remains blocked until sufficient post-V2 use exists.

## 15. Non-goals of the foundation

This foundation does not lock:

- exact V2 persona weights;
- exact peer-performance shrinkage/confidence formulas;
- exact common/rare personal thresholds;
- exact recommended opponent-response stopping rule;
- Builder-session persistence;
- production traps;
- optional generated interpretation enablement.

Those details belong to ordered tasks and evidence-based implementation decisions.
