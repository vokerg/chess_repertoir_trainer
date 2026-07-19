# AI widgets

AI widgets are optional, on-demand product features backed by a server-side OpenAI-compatible provider. The first widget generates a coaching overview for one imported game. The subsystem is deliberately isolated from Stockfish execution, tagging, imported-game processing, and the shared analysis workbench.

## Runtime boundaries

```text
Angular game page
  -> GET /api/ai/capabilities
  -> GET /api/imported-games/:gameId/ai-review
       -> current persisted review or null
  -> POST /api/imported-games/:gameId/ai-review
       -> game-review context builder
       -> OpenAI-compatible JSON client
       -> DeepSeek chat completions
       -> authoritative move reconciliation
       -> persisted current review
```

`apps/api/src/modules/ai` owns provider configuration, request execution, prompts, output validation, persistence, and AI-specific errors. Feature adapters under that module own subject-specific context and reconciliation. Game review reads existing imported-game and completed analysis application services; it does not call REST internally and does not run Stockfish.

Angular owns capability visibility, loading/generation state, rendering, and interaction with the existing game workbench. Provider keys, model names, prompts, input hashes, and raw context never reach the browser.

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

## Response and persistence

The wire response is versioned and validated by `@chess-trainer/contracts/ai`. Model-generated labels are called `themes`; they are not deterministic game tags.

`ImportedGameAiReview` stores one current review per imported game. Regeneration uses an upsert and replaces that current artifact rather than accumulating hidden history. The row is owned by the authenticated user and imported game and records:

- the analysis run used to generate the review;
- response schema and prompt versions;
- provider and model identifiers;
- a SHA-256 input hash covering the game revision, analysis run, model, prompt/schema versions, and bounded provider context;
- the validated review JSON and generation timestamp.

Raw provider requests and raw provider responses are not stored. Deleting the imported game or user cascades to the review. Deleting the source analysis run leaves the review intact and clears its optional analysis-run reference.

When a game page opens, Angular loads the persisted artifact. No provider request is made. Clicking **Regenerate AI overview** performs a new provider request and replaces the saved artifact only after validation and authoritative reconciliation succeed.

## Board navigation

Each AI turning point is a button backed by its authoritative `plyNumber`. The game tree uses the mainline ply number as the imported move node ID, so selecting a turning point delegates to `GameDetailStore.selectNode()` instead of creating a second board model. The page then scrolls the existing workbench into view. The selected turning point is visually marked while the board, move tree, engine, and keyboard navigation remain synchronized.

## Failure semantics

Known failures use explicit codes:

- `AI_WIDGET_DISABLED` — 404
- `IMPORTED_GAME_NOT_FOUND` — 404
- `GAME_ANALYSIS_REQUIRED` — 409
- `GAME_PGN_REQUIRED` — 409
- `AI_RATE_LIMITED` — 429
- `AI_REVIEW_STORAGE_ERROR` — 500
- `AI_STORED_RESPONSE_INVALID` — 500
- `AI_INTERNAL_ERROR` — 500
- `AI_PROVIDER_ERROR` — 502
- `AI_INVALID_RESPONSE` — 502
- `AI_PROVIDER_UNAVAILABLE` — 503
- `AI_PROVIDER_TIMEOUT` — 504

Network failures, timeouts, rate limits, provider 5xx responses, empty content, malformed JSON, and schema-invalid content may be retried up to `LLM_MAX_RETRIES`. Provider authentication and ordinary request 4xx responses are not retried.

## Logging and privacy

Normal operation does not log prompts, PGN, context JSON, raw model output, persisted review content, authorization headers, or API keys. Optional debug logging contains only the use case, duration, attempt number, status category, retry decision, and token usage.

## Removal procedure

To remove the experiment:

1. Remove `apps/api/src/modules/ai` and its route registration.
2. Remove `packages/contracts/src/ai` and the package export.
3. Remove the Angular AI capability service, game-review data access/store/component, and the game-page composition entries.
4. Add a migration that drops `ImportedGameAiReview`, then remove the model and its relations from `schema.prisma`.
5. Remove the AI environment variables and this document.
