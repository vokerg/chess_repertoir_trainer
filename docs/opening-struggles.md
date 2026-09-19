# Opening struggles

`/opening-struggles` is a standalone Openings workflow backed by `GET /api/opening-struggles`. It analyses recurring prefixes from imported games and annotates each returned prefix with its relationship to the user's courses.

The report uses the shared imported-game filters. Only games with indexed plies contribute line data. The frontend defaults to rated blitz and rapid games from the recent imported-game window, but users can change those filters.

## Analysis modes

### Poor results

Poor results answers: **Which recurring opening prefixes have produced a high loss rate?**

The mode filters by:

- minimum games reaching the prefix;
- minimum loss rate.

`totalReachGames` is the denominator. A game with no normalized W-D-L result still counts as reaching the prefix, but contributes to none of the win, draw, or loss counters. Consequently, `wins + draws + losses` can be lower than `totalReachGames`.

The analysis link opens the position after the displayed line.

### Repeated mistakes

Repeated mistakes answers: **Which suboptimal opening move do I keep playing?**

The mode uses persisted `ImportedGamePly.scoreLossCp` values. It counts only plies played by the imported-game owner. The metric belongs to the final displayed move, not to every move in the displayed line and not to the static evaluation of the resulting position.

The mode filters by:

- minimum analysed occurrences of the final owner move;
- minimum average centipawn loss.

Null score-loss values are ignored. A move may appear here even when the resulting position is still equal or favorable, because the move repeatedly surrendered a better alternative.

The table separates the position before the move from the repeated move itself. The analysis link opens before the final move so the missed alternative can be inspected.

### Bad positions

Bad positions answers: **Which recurring opening sequences leave me objectively worse?**

The metric is the stored position evaluation after the displayed line, converted to the imported-game owner's perspective. A disadvantage can accumulate through several small inaccuracies; the mode does not require one high-CPL move.

The mode filters by:

- minimum games with a stored evaluation;
- maximum average evaluation from the user's perspective.

To avoid returning every descendant of an already-bad line, the report returns threshold-entry nodes: a node is included only when it passes the bad-position threshold and its parent does not. This identifies where the aggregate line first becomes unfavorable without claiming that one move alone caused the problem.

The analysis link opens the position after the displayed line.

## Course coverage annotation

Course coverage decorates every struggle result; it never filters or hides a struggle. A neutral icon is shown when no course covers the line.

Statuses:

- `COVERED`: at least one matching course reaches the end of the displayed prefix.
- `MY_DEVIATION`: the prefix followed a matching course and then the trained side played a move outside it.
- `OPPONENT_UNCOVERED`: the prefix followed a matching course and then the opponent played a response not stored in it.
- `REPERTOIRE_ENDED`: the prefix followed a matching course, but the stored repertoire stopped before the prefix ended.
- `NOT_COVERED`: no course had the minimum meaningful overlap.

Matching is side-specific. White struggle rows use White-training courses and Black struggle rows use Black-training courses. Course graphs remain separate per course and trained side so unrelated course branches cannot be stitched into one apparent repertoire.

A course starting position may occur later in the displayed game prefix. This supports courses created from custom FENs or from a position after introductory moves. Existing opponent-transposition matching from the course-review workflow is reused.

When several courses match, complete coverage wins over partial coverage. Otherwise, the course reaching furthest into the displayed prefix wins, followed by the longest covered overlap. Equivalent matches retain all matching course names in the explanation.

## Query and performance boundary

The API performs two bounded phases:

1. It counts candidate imported games using the same `buildImportedGameWhere` predicate as the subsequent ply read.
2. When the count is accepted, it loads early plies for those games and loads all user-owned course lines in one separate course-content query.

The report currently builds prefix aggregates and repertoire graphs in memory. It does not perform per-row, per-course, or per-game follow-up database queries.

To prevent an accidentally broad request from loading an unbounded number of game plies, the API rejects scopes above `OPENING_STRUGGLES_MAX_CANDIDATE_GAMES` with HTTP `422` and error code `OPENING_STRUGGLES_SCOPE_TOO_LARGE`. The frontend asks the user to narrow date, account, or other game filters. The API does not silently truncate because truncation would produce misleading averages and rates.

## Ownership

- API route/schema/service/repository: `apps/api/src/modules/opening-struggles`
- Imported-game filter and early-ply selection: `apps/api/src/modules/imported-games`
- Shared repertoire sequence matcher: `apps/api/src/modules/repertoire-coverage/course-review.matcher.ts`
- Shared wire contract: `packages/contracts/src/opening-struggles`
- Angular feature: `apps/web/src/app/features/opening-struggles`

The sequence matcher is an intentional shared repertoire-matching boundary used by course review and opening-struggle course annotations. Persistence remains in the owning repositories.
