# RB-028 Closure — Factual Personal Move Evidence

**Task:** RB-028  
**Issue:** #318  
**Runtime PR:** #327  
**Final runtime implementation head:** `9d0a65a5fcf18efd37a1ecfa9dcd64e489c17d6d`  
**Final runtime CI:** #2409 (`31388828649`) — green  
**Candidate Decision contract:** `2026-08-v4`  
**Personal evidence policy:** `2026-08-personal-move-v1`  
**Ranking policy retained:** `2026-08-empirical-persona-v2`  
**Closed:** 2026-08-10

## Delivered

RB-028 replaces primary Builder `Profile Aligned/Conflict` presentation with factual exact-position personal move evidence answering whether the user normally plays the candidate, how often, how recently, and how it has performed relative to the same-position baseline.

Opening Analysis now keeps two deliberately separate samples per move:

- `gameCount`: distinct eligible indexed games, including games without a known W/D/L result, used for familiarity and recency;
- legacy `games.total`: W/D/L-qualified games, retained for result scoring and the pre-existing Candidate Ranking personal input.

That separation lets result-less indexed history establish familiarity without manufacturing result confidence or changing legacy ranking behavior.

## Versioned factual policy

`2026-08-personal-move-v1` classifies exact-position history as:

- **NEW** — no indexed game with the candidate move;
- **COMMON** — at least 5 distinct indexed games and at least 20% of the user's move choices from the exact position;
- **RARE** — previously played but below the Common policy.

Result context is independent from familiarity. It requires at least 10 games with known W/D/L results and compares the move's personal score with the user's score from the same exact position:

- at least +5 percentage points: `ABOVE_BASELINE`;
- at most -5 percentage points: `BELOW_BASELINE`;
- otherwise: `NEUTRAL`;
- insufficient known-result sample: `INSUFFICIENT`.

Recency remains a separate `lastPlayedAt` fact. No Player Chess Profile three-month window is reused as a hidden familiarity cutoff.

## Candidate Decision V4

Candidate Decision V4 carries:

- legacy occurrences, W/D/L-qualified games and score;
- all-history `gameCount`;
- exact-position `moveSharePercent`;
- score delta versus exact-position baseline;
- `lastPlayedAt`;
- factual policy version, familiarity, result context and qualification flag;
- effective account, side, rated, speed and all-indexed-history scope.

A legal candidate absent from loaded personal `nextMoves` is explicitly synthesized as `NEW`. If the personal source is unavailable, Candidate Decision does not claim New/Common/Rare and leaves the factual classification unavailable.

The new V4 fields do not enter `CandidateRankingInput.personal`. The ranking projection remains the pre-existing `{ status, occurrences, games, scorePercent }` fields, preserving RB-027 preset policy and legacy CUSTOM/opponent behavior.

## Builder presentation

The candidate row and focused Decision Brief now use factual labels such as `Common for you`, `Rare for you`, and `New to you`. Qualified result context can append `results above/below position baseline`.

Expandable evidence retains sample detail: indexed game count, move share, last-played date, known-result sample/score, position-baseline delta, sparse-sample qualification and the effective personal-history filter scope. The standalone Player Chess Profile remains separate and inspectable rather than masquerading as move familiarity.

## Review findings and validation

The implementation went through repeated self-review and exact-head CI rather than relying on the first passing slice.

Review found and corrected four material issues:

1. nullable `resultForUser` originally conflated familiarity with result evidence; all-history game count and known-result sample are now separate;
2. changing legacy `games.total` would have strengthened existing personal ranking inputs for result-less games, so that semantic change was rejected;
3. distinct-game share can exceed a coherent choice-share model when the exact position repeats inside one game, so move share now uses move occurrences / position occurrences;
4. Candidate Decision V4 initially exposed two stale Angular fixtures during CI #2407; both fixtures were upgraded to the strict V4 `NEW` shape without weakening production behavior or contract validation.

Representative tests cover old-but-familiar January 2024 history, result-less indexed games, repeated-position move share, rare/new states, sparse result qualification, position-relative below-baseline presentation, effective filter scope and preservation of deterministic ranking boundaries.

Final runtime implementation head `9d0a65a5fcf18efd37a1ecfa9dcd64e489c17d6d` passed full CI #2409 (`31388828649`): lint, build, opening audits, architecture guardrails, migrations and tests all green.

## Scope boundaries and residual work

RB-028 introduces no Prisma schema/migration, MCP surface, new persistence, queue, job, dependency or automatic course-write behavior. It does not redesign `/progress/profile` and does not make personal familiarity a repertoire rejection rule.

RB-029 remains the next policy task and may consume exact personal encounters as separated preparation context on opponent turns. RB-031 can use the settled RB-028 presentation model after opponent semantics stabilize. RB-016 remains blocked pending post-V2 real usage.
