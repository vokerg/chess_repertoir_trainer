# Opening Book Lookup

`OpeningLookupService` provides reusable opening name lookups from local, generated data. Its first product use is `/api/opening-analysis`, where the response includes `bookOpening` for the current board position so the Opening analysis page can show `ECO · Opening Name` in its header subtitle.

## Data Source

The source data is [`lichess-org/chess-openings`](https://github.com/lichess-org/chess-openings), using `a.tsv`, `b.tsv`, `c.tsv`, `d.tsv`, and `e.tsv`. The upstream project marks the data as CC0/public domain.

The app vendors a generated TypeScript file instead of fetching at runtime. This keeps startup, build, test, and user traffic deterministic and offline-friendly, and avoids depending on GitHub or Lichess availability during normal use.

Regenerate the local data with:

```sh
npm run opening-book:update --workspace=apps/api
```

The update script fetches a pinned upstream commit, validates required TSV columns, replays source PGN with `chess.js` to derive UCI move strings, EPD positions, and ply counts, sorts deterministically, and writes `apps/api/src/services/opening-book/openingBook.generated.ts`.

## Matching Strategy

ECO lookup is broad. Many positions can share one ECO code, so `lookupByEco()` returns the deepest deterministic entry for that ECO and should be treated as a fallback/helper.

FEN/EPD lookup is an exact normalized position lookup. The service accepts full FEN, `startpos`, normalized four-field FEN, or EPD-like first-four-fields, then matches against generated `epd` values.

Move lookup replays moves from the start position with `chess.js` and checks the opening book after every move. It returns the deepest matched position, which supports transpositions when the dataset includes the transposed position.

## Non-Goals

- No database migration.
- No runtime external API calls.
- No automatic imported-game backfill yet.
