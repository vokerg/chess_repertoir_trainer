# RB-027 Closure — Empirical Persona Ranking V2

**Task:** RB-027  
**Issue:** #317  
**Runtime PR:** #325  
**Runtime squash:** `34dadd251d4310f427cc60b466158c132823e398`  
**Completion reconciliation PR:** #330  
**Final runtime head:** `3f5c75bfe36776a16235f0fa5193711898f1b1e5`  
**Final runtime CI:** #2392 (`31383710305`) — green  
**Closed:** 2026-08-10

## Delivered

RB-027 replaces preset `USER_MOVE` persona ranking with versioned empirical policies built from selected-population evidence, Masters evidence, and bounded objective evidence.

The Candidate Decision V3 contract exposes exact-position target-side population and Masters baselines plus each move's score delta versus that position baseline. Preset personas no longer use personal history, Player Chess Profile fit, static opening target fit/knowledge, or existing-course coverage as ranking authority; those signals remain inspectable context. `CUSTOM` keeps the legacy user-move policy and `OPPONENT_RESPONSE` remains unchanged for RB-029.

### Versioned persona policy

- **Balanced:** 35% selected-population frequency, 30% selected-population performance, 20% objective evidence, 15% Masters support.
- **Solid:** 15% selected-population frequency, 10% selected-population performance, 40% objective evidence, 35% Masters support.
- **Aggressive:** 10% selected-population frequency, 55% selected-population performance, 15% objective evidence, 20% Masters support.
- **Surprise:** 30% selected-population rarity, 35% selected-population performance, 20% objective evidence, 15% Masters rarity. Rarity contributes only when the move outperforms the selected-position baseline by at least 3 percentage points.

Empirical preset ranking requires at least 20 selected-population games for population evidence and 10 Masters games for Masters evidence. Stricter configured population thresholds are preserved.

### Objective evidence and guardrails

Only already-stored bounded engine evidence is consumed. An authoritative line must have depth at least 12 and a score or mate value. Objective guardrails are persona-specific:

| Persona | Warn at loss | Exclude at loss |
|---|---:|---:|
| Solid | 80 cp | 180 cp |
| Balanced | 120 cp | 280 cp |
| Aggressive | 180 cp | 380 cp |
| Surprise | 120 cp | 260 cp |

Missing or insufficient engine evidence stays non-definitive and cannot manufacture objective-loss warnings or exclusions.

Engine trust-boundary hardening was completed during review: illegal stored roots cannot seed candidates or establish the baseline; duplicate roots use one canonical first occurrence; an explicit root that contradicts `pvUci[0]` is rejected by stored-line normalization; and single-position cache reads normalize historical rows before Candidate Decision consumes them.

### Explanations and public evidence

Public population/Masters components now match the active persona policy and there is no public opaque aggregate score. Manually requested legal candidates retain their real deterministic rank after bounded selection. AI candidate explanation remains explanation-only and can reference position baselines, corpus deltas, objective deltas, source status, and ranked evidence without changing eligibility, ordering, Builder state, or course data.

## Validation and review findings

The implementation went through repeated adversarial review rather than relying on the first green build. The final runtime head `3f5c75bfe36776a16235f0fa5193711898f1b1e5` passed CI #2392 (`31383710305`) after build, lint, test, audit, architecture, and migration checks.

Two late review findings were deliberately allowed to fail CI before merge:

1. CI #2390 exposed a stale bulk-store fixture whose explicit root and PV root disagreed after the new invariant was enforced. The fixture was corrected without weakening production behavior.
2. Review of the CI output found that the RB-027 chess-domain suites lived beside implementation under `src/` while the package Vitest configuration only discovered `test/**/*.test.ts`. The final branch explicitly wires `candidate-ranking*.test.ts` and `stockfish-analysis.test.ts` into package CI; #2392 is green with that discovery configuration.

Representative regressions cover persona authority, persona component differences, Surprise rarity/overperformance safeguards, reason integrity, empirical sample floors, stale sufficiency, manual-rank preservation, engine evidence integrity, V3 contract completeness, and grounded AI explanation.

## Scope boundaries and residual work

RB-027 is complete for `USER_MOVE`. It does not implement personal evidence ranking changes (RB-028), opponent preparation/coverage policy (RB-029), setup consolidation (RB-030), or cockpit evidence hierarchy (RB-031). No Prisma migration, queue, job, new dependency, persistence model, or on-demand unbounded engine workflow was introduced.

The numeric policy is intentionally versioned. Future production evidence may justify recalibration, but that is policy evolution rather than an open correctness blocker for RB-027.
