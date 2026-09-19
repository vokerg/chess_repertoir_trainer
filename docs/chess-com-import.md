# Chess.com import

The app supports importing finished public Chess.com games through external accounts.

## Current user flow

The established account page still uses the transitional synchronous endpoint until ONB-015 cuts account refresh over to durable acceptance:

1. Create an external account with provider `CHESS_COM` and the public Chess.com username.
2. Call `POST /api/me/accounts/:id/sync`.
3. Read imported games with `GET /api/me/accounts/:id/games`.
4. Run the standard imported-game workflow for eligible games.

ONB-014 also registers the Chess.com executor in the durable account-import worker delivered by ONB-012. Durable import runs can therefore execute Chess.com provider work without holding an HTTP request once they are accepted by the account-import lifecycle. ONB-015 owns the final account-route/frontend cutover; this task does not silently change the existing sync endpoint.

Import only ingests games. It does not itself index, assign openings, analyse, or refresh tags.

## Durable provider traversal

Chess.com exposes public game history as an archive index plus monthly JSON archives. The durable adapter:

1. plans every UTC calendar month intersecting the immutable half-open requested range;
2. processes initial/backfill months newest-first and forward months oldest-first;
3. fetches the archive index once per execution;
4. treats a month absent from a successful, well-formed index as exact empty coverage;
5. fetches listed months serially;
6. filters each game to the exact range and immutable variant/speed/rated scope;
7. commits normalized games in batches of at most 100;
8. advances checkpoint and contiguous coverage atomically only after the whole month and all bounded writes succeed.

A listed monthly archive that fails, is malformed, or returns an unexpected terminal status never advances coverage. Incomplete work is replayable and duplicate-safe through the existing `(accountId, providerGameId)` uniqueness key.

Provider HTTP runs outside database transactions. Immediately before each bounded game or window commit, the provider-neutral account-import guard is rechecked in the short write transaction. ONB-019 will replace the current allow-all guard with persisted lifecycle-fence enforcement.

## Provider access behavior

Requests are serial and carry the configured recognizable `CHESS_COM_USER_AGENT`. The durable client passes the worker `AbortSignal` to fetch and retry delays, retries transient 408/5xx responses with bounded backoff, honors `Retry-After` within that bound, and converts HTTP 429 into durable retry timing instead of sleeping indefinitely inside the worker.

`ETag` and `Last-Modified` are used only as transfer optimizations. Validator metadata is bounded in memory and conditional requests are sent only while the corresponding cached response body remains usable. A `304 Not Modified` response is never interpreted as coverage proof without that body.

## Normalization

Both the durable adapter and the transitional synchronous service use one shared Chess.com normalizer:

- `providerGameId`: `uuid` when present, otherwise game URL or PGN site/link fallback;
- `providerUrl`: Chess.com game URL or PGN link/site fallback;
- `pgn`: game PGN from the monthly archive payload;
- `rated`: `rated`;
- `variant`: `rules` or PGN `Variant`;
- `speedCategory`: `time_class`;
- `timeControlRaw`: `time_control` or PGN `TimeControl`;
- `startedAt`: `start_time` Unix seconds or PGN date/time fallback;
- `endedAt`: `end_time` Unix seconds or PGN date/time fallback;
- player usernames/ratings, user colour, opponent, result, status, and provider opening headers.

Provider opening data is preserved. Standard opening assignment fills only missing values and does not overwrite provider values.

## Durable scope

The durable scope is immutable per import run. It supports standard chess with the canonical selected speed set (`BULLET`, `BLITZ`, and/or `RAPID`) and rated policy (`BOTH`, `RATED`, or `UNRATED`). Exact filtering uses `requestedFrom <= end_time < requestedTo`.

The transitional synchronous route keeps its pre-cutover behavior until ONB-015 removes it; it should not be used as evidence for durable coverage.

## Environment

Set `CHESS_COM_USER_AGENT` when deploying the API. The default is usable for local development, but deployed environments should use a recognizable value with contact information.

```text
CHESS_COM_USER_AGENT="chess-repertoire-trainer/0.1 (+https://github.com/vokerg/chess_repertoir_trainer)"
```

## Validation and rollout

The repository includes provider/executor fixtures and an opt-in low-volume canary harness. The canary performs one archive-index request and at most one selected monthly archive; it is not a provider load test. General rollout requires the ONB-014 validation gates and the later ONB-015 account-sync cutover.
