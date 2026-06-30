# Opening Position Performance

`GET /api/opening-analysis` returns a `performance` summary for the requested position. The summary is computed on the server from distinct imported games that reached the normalized FEN.

The performance sample uses the same filtered ply rows as the position WDL and next-move aggregation. All current imported-game filters apply before aggregation, including rated state, speed category, user color, date range, opening ECO/name, analysis status, accuracy, classification, and `tagCodes`.

If a `tagCodes` filter is active, the performance sample is already narrowed to games matching those tags. The summary then describes that narrowed sample.

Aggregation rules:

- Games are deduplicated by imported game id before WDL or tag counts are calculated.
- Tags are counted at most once per game, even if a game reaches the same normalized position more than once.
- WDL is from the imported user perspective through `resultForUser`.
- `sample.games` is the distinct game count for the position after filters.
- `sample.taggedGames` is the distinct count of games with at least one tag code.
- Tag and bucket `ratePct` is `matching tagged games / sample.taggedGames * 100`, rounded to one decimal.
- `occurrences` can be higher than `sample.games` because one game may reach a normalized position more than once.

Tag buckets are owned by the API and group selected existing game tags into opening, game end, conversion, tactics, phase, position state, time, and quality buckets. Unknown or unbucketed tags remain in the flat `performance.tags` array and clients may show them separately from bucketed tags.

The endpoint is intended as a server-side foundation for future opening insights, not only as data for the opening-analysis page. Clients should render the returned summary directly instead of recomputing tag performance from visible rows.
