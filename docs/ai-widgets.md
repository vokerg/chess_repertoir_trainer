# AI widgets

AI widgets are optional, on-demand product features backed by a server-side OpenAI-compatible provider. The first widget generates a coaching overview for one imported game. The subsystem is deliberately isolated so it can be removed without a database rollback or changes to Stockfish, tagging, imported-game processing, or the analysis workbench.

## Runtime boundaries

```text
Angular game widget
  -> GET /api/ai/capabilities
  -> POST /api/imported-games/:gameId/ai-review
       -> game-review context builder
       -> OpenAI-compatible JSON client
       -> DeepSeek chat completions
```

`apps/api/src/modules/ai` owns provider configuration, request execution, prompts, output validation, and AI-specific errors. Feature adapters under that module own subject-specific context and reconciliation. Game review reads existing imported-game and completed analysis application services; it does not call REST internally and does not run Stockfish.

Angular owns only capability visibility, command state, and rendering. Provider keys, model names, prompts, and raw context never reach the browser.

## Feature flags

Both flags must be enabled before game review is available:

```text
AI_WIDGETS_ENABLED=true
AI_GAME_REVIEW_ENABLED=true
```

The feature is disabled by default. If either flag is false, or provider configuration is incomplete, `GET /api/ai/capabilities` returns `gameReview: false` and the Angular widget is not rendered. Direct calls to a disabled widget return a stable error.

## Provider configuration

```text
LLM_PROVIDER=openai-compatible
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-v4-flash
LLM_API_KEY=<secret>
LLM_TIMEOUT_MS=120000
LLM_MAX_RETRIES=1
LLM_THINKING_MODE=disabled
LLM_REASONING_EFFORT=
LLM_DEBUG_LOGGING=false
```

The API uses native Node `fetch`; no provider SDK is installed. `LLM_THINKING_MODE` is translated into the provider request's `thinking.type`. `LLM_REASONING_EFFORT` is sent only when thinking is enabled and accepts `high` or `max`.

For Render/Vercel deployments, these values belong on the Render API service only. They are not needed by the Angular/Vercel build or the persistent Stockfish worker. For the manual Docker stack, the shared runtime env file reaches both API and worker containers, but only the API process reads the AI settings.

## Game-review input

The backend constructs a bounded context from existing read models:

- user color, result, players, ratings, speed, time control, and opening;
- deterministic game tag names;
- accuracy, average centipawn loss, and analysis summary;
- up to 300 replayed plies with SAN, UCI, classification, score loss, best move, and evaluation fields.

PGN is replayed server-side with `chess.js` to derive SAN. FEN strings, MultiPV lines, Prisma rows, provider import payloads, authentication data, and unrelated user data are excluded from the provider request.

The model is instructed to reference only supplied ply numbers and to avoid invented evaluations, best moves, opening names, intentions, or psychological claims. After JSON validation, the service replaces move number, side, played SAN, best SAN, classification, and score loss with authoritative server values. An unknown model-supplied ply invalidates the response.

## Response and storage

The wire response is versioned and validated by `@chess-trainer/contracts/ai`. Model-generated labels are called `themes`; they are not persisted deterministic game tags.

Phase one does not persist provider requests, raw responses, or generated reviews. Reloading the page discards the review. This keeps the feature removable and avoids a migration before value and invalidation requirements are understood.

Persistence should be considered only after repeated use demonstrates value. A stored review must include an input hash covering the game revision, latest analysis run, tag codes, prompt version, response schema version, and relevant model configuration.

## Failure semantics

Known failures use explicit codes:

- `AI_WIDGET_DISABLED` — 404
- `IMPORTED_GAME_NOT_FOUND` — 404
- `GAME_ANALYSIS_REQUIRED` — 409
- `GAME_PGN_REQUIRED` — 409
- `AI_RATE_LIMITED` — 429
- `AI_PROVIDER_ERROR` — 502
- `AI_INVALID_RESPONSE` — 502
- `AI_PROVIDER_UNAVAILABLE` — 503
- `AI_PROVIDER_TIMEOUT` — 504

Network failures, timeouts, rate limits, provider 5xx responses, empty content, malformed JSON, and schema-invalid content may be retried up to `LLM_MAX_RETRIES`. Provider authentication and ordinary request 4xx responses are not retried.

## Logging and privacy

Normal operation does not log prompts, PGN, context JSON, raw model output, authorization headers, or API keys. Optional debug logging contains only the use case, duration, attempt number, status category, retry decision, and token usage.

## Removal procedure

To remove the experiment:

1. Remove `apps/api/src/modules/ai` and its route registration.
2. Remove `packages/contracts/src/ai` and the package export.
3. Remove the Angular AI capability service, game-review data access/store/component, and the single game-page composition entry.
4. Remove the AI environment variables and this document.

No Prisma rollback or data cleanup is required in phase one.
