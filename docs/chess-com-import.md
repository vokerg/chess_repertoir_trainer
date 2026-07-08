# Chess.com import

The app supports importing finished public Chess.com games through the same external-account flow used for Lichess.

## User flow

1. Create an external account with provider `CHESS_COM` and the public Chess.com username.
2. Call `POST /api/me/accounts/:id/sync`.
3. Read imported games with `GET /api/me/accounts/:id/games`.
4. Run the standard imported-game workflow for eligible blitz/rapid games:
   - standard indexing parses ply rows and then assigns a missing opening from the opening book
   - standard analysis records analysis and then refreshes imported-game tags
5. Read analysed games and refreshed tags from the imported games endpoints.

Sync only imports games. It does not index, assign openings, analyse, or refresh tags by itself.

## Implementation notes

Chess.com does not expose a Lichess-style all-games-since stream. The importer uses the public archive API instead:

1. `GET https://api.chess.com/pub/player/{username}/games/archives`
2. `GET https://api.chess.com/pub/player/{username}/games/{YYYY}/{MM}` for relevant monthly archives

Monthly archives are fetched serially. This avoids unnecessary rate-limit pressure and matches Chess.com's guidance that serial archive access is safer than parallel fan-out.

## Cursor behavior

`ExternalAccount.syncCursorTime` stores the latest imported game end time. Incremental sync subtracts a one-month overlap from the cursor, fetches archive months that can contain games after that overlap, and then skips individual games older than the overlap.

This overlap is intentionally wider than the Lichess importer because Chess.com data is grouped by month instead of streamed by timestamp.

## Normalization

Chess.com games are normalized into the existing `ImportedGame` shape:

- `provider`: `CHESS_COM`
- `providerGameId`: `uuid` when present, otherwise game URL or PGN site/link fallback
- `providerUrl`: Chess.com game URL or PGN link/site fallback
- `pgn`: game PGN from the monthly archive payload
- `rated`: `rated`
- `variant`: `rules` or PGN `Variant`
- `speedCategory`: `time_class`
- `timeControlRaw`: `time_control` or PGN `TimeControl`
- `startedAt`: `start_time` Unix seconds or PGN date/time fallback
- `endedAt`: `end_time` Unix seconds or PGN date/time fallback
- `whiteUsername` / `blackUsername`: player usernames or PGN headers
- `whiteRating` / `blackRating`: player ratings or PGN Elo headers
- `userColor`, `opponentUsername`, `result`, and `resultForUser`: derived from player usernames and Chess.com result codes
- `openingEco` / `openingName`: PGN headers when available

Provider opening data is preserved. If Chess.com PGN headers include ECO/name data, the standard opening assignment step fills only missing fields and does not overwrite those provider values.

## Standard workflow scope

The standardized imported-game workflows currently apply to `blitz` and `rapid` games only. Bullet imports are still stored and remain available for account stats and rating views, but they are ignored by post-sync offers, bulk indexing, bulk analysis, and the temporary missing-opening backfill script.

## Environment

Set `CHESS_COM_USER_AGENT` when deploying the API. The default is usable for local development, but deployed environments should use a recognizable value with a contact URL or email.

```text
CHESS_COM_USER_AGENT="chess-repertoire-trainer/0.1 (+https://github.com/vokerg/chess_repertoir_trainer)"
```

## Current limitations

- Import is synchronous, like the existing Lichess flow.
- First sync for very large accounts may take a while because all monthly archives must be fetched.
- There is no per-request archive limit yet.
- There is no Chess.com OAuth integration; only public finished games are imported.
