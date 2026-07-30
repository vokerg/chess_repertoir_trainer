# AI widgets

AI widgets are optional, on-demand product features backed by a server-side OpenAI-compatible provider. Game review generates a persisted coaching overview for one imported game. The Repertoire Builder candidate-explanation prototype generates a transient interpretation of already-computed candidate evidence. Both remain isolated from Stockfish execution, tagging, imported-game processing, deterministic candidate ranking, Builder reducers, and course writes.

## Runtime boundaries

### Imported-game review

```text
Angular game page
  -> GET /api/ai/capabilities
  -> GET /api/imported-games/:gameId/ai-review
       -> current persisted review or null
  -> POST /api/imported-games/:gameId/ai-review
       -> game-review context builder
       -> OpenAI-compatible JSON client
       -> authoritative move reconciliation
       -> persisted current review
```

### Builder candidate explanation

```text
Angular Builder page
  -> GET /api/ai/capabilities
  -> explicit user click only
  -> POST /api/ai/repertoire-builder/candidate-explanation
       -> CandidateDecisionService.get(...)
       -> bounded authoritative fact projection
       -> OpenAI-compatible JSON client
       -> evidence-reference and move reconciliation
       -> transient response only
```

`apps/api/src/modules/ai` owns provider configuration, request execution, prompts, output validation, persistence where the use case explicitly requires it, and AI-specific errors. Feature adapters under that module own subject-specific context and reconciliation. Game review reads existing imported-game and completed-analysis application services. Builder explanation calls the existing candidate-decision application service directly. Neither adapter calls REST internally or runs Stockfish.

Angular owns capability visibility, loading/generation state, rendering, and interaction with existing feature composition. Provider keys, model names, prompts, raw provider payloads, and server-side context never reach the browser.

## Feature flags

The global flag and the relevant use-case flag must both be enabled.

```text
AI_WIDGETS_ENABLED=true
AI_GAME_REVIEW_ENABLED=true
AI_BUILDER_CANDIDATE_EXPLANATION_ENABLED=true
```

Every flag is disabled by default. If the global flag, the relevant use-case flag, or provider configuration is incomplete, `GET /api/ai/capabilities` returns that widget as unavailable and Angular renders no control. Direct calls to a disabled widget return a stable error.

The two use-case flags are independent. Enabling Builder candidate explanation does not enable game review, and enabling game review does not expose Builder candidate explanation.

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

For Render/Vercel deployments, these values belong on the Render API service only. They are not needed by the Angular/Vercel build or the persistent Stockfish worker. For the manual Docker stack, the shared runtime environment file reaches both API and worker containers, but only the API process reads the AI settings.

Provider models, pricing, request semantics, privacy, retention, and regional requirements must be re-verified before enabling a use case in a deployed environment. The application does not claim provider zero-retention or regional processing guarantees.

## Game-review input

The backend constructs a bounded context from existing read models:

- user color, result, players, ratings, speed, time control, and opening;
- deterministic game tag names;
- accuracy, average centipawn loss, and analysis summary;
- up to 300 replayed plies with SAN, UCI, classification, score loss, best move, and evaluation fields.

PGN is replayed server-side with `chess.js` to derive SAN. FEN strings, MultiPV lines, Prisma rows, provider import payloads, authentication data, and unrelated user data are excluded from the provider request.

The model is instructed to reference only supplied ply numbers and to avoid invented evaluations, best moves, opening names, intentions, or psychological claims. After JSON validation, the service replaces move number, side, played SAN, best SAN, classification, and score loss with authoritative server values. An unknown model-supplied ply invalidates the response.

## Builder candidate-explanation input

The browser sends the existing candidate-decision request plus an identity containing:

- target ID;
- normalized FEN;
- decision role;
- deterministic ranking-policy version;
- candidate-response generation timestamp;
- selected move UCI;
- optional comparison move UCI.

The browser does not send rankings, evaluations, reason labels, warnings, fits, or evidence as authoritative input. The API calls `CandidateDecisionService.get()` using the authenticated user and rebuilds the current response. A stale target, normalized position, role, policy, or missing candidate is rejected before provider work.

The provider receives no FEN, complete candidate response, PV tree, Builder session, queue, course destination, user identity, or command state. It receives only:

- selected and optional comparison candidate identities;
- bounded fact records derived from the authoritative response;
- stable fact IDs for rank, eligibility, target/profile fit, source availability, reason and warning codes, bounded engine/corpus/personal metrics, opening/course state, and opponent coverage where present.

The model must cite supplied fact IDs. The server rejects unknown evidence IDs, false missing-evidence references, unsupported UCI move references, and recommendation language. The response includes the authoritative selected/comparison rank and SAN, the referenced deterministic facts, and a fixed disclaimer. Generated text remains interpretation; deterministic evidence remains the complete fallback and the user retains move choice.

## Response lifetime

### Game review

The wire response is versioned and validated by `@chess-trainer/contracts/ai`. Model-generated labels are called `themes`; they are not deterministic game tags.

`ImportedGameAiReview` stores one current review per imported game. Regeneration uses an upsert and replaces that current artifact rather than accumulating hidden history. The row is owned by the authenticated user and imported game and records the analysis run, schema/prompt versions, provider/model identifiers, a SHA-256 input hash, validated JSON, and generation timestamp.

Raw provider requests and raw provider responses are not stored. Deleting the imported game or user cascades to the review. Deleting the source analysis run leaves the review intact and clears its optional analysis-run reference.

When a game page opens, Angular loads the persisted artifact. No provider request is made. Clicking **Regenerate AI overview** performs a new provider request and replaces the saved artifact only after validation and authoritative reconciliation succeed.

### Builder explanation

Builder candidate explanations are transient. There is no Prisma model, migration, browser storage, hidden history, background generation, automatic regeneration, or saved current artifact.

The page-scoped `RepertoireBuilderCandidateExplanationStore` is separate from `RepertoireBuilderStore`. It keys state to the complete request identity and discards an in-flight or completed response when the position, target, role, policy, candidate response, selected move, or comparison move changes. Loading, failure, success, and clearing do not call any accept, defer, ignore, stop, reorder, coverage, completion, or course-output command.

## Board navigation

Each game-review turning point is a button backed by its authoritative `plyNumber`. The game tree uses the mainline ply number as the imported move node ID, so selecting a turning point delegates to `GameDetailStore.selectNode()` instead of creating a second board model. The page then scrolls the existing workbench into view. The selected turning point is visually marked while the board, move tree, engine, and keyboard navigation remain synchronized.

Builder explanation does not add board navigation or move selection. Its comparison selector changes explanation identity only.

## Failure semantics

Known shared failures use explicit codes:

- `AI_WIDGET_DISABLED` — 404;
- `AI_RATE_LIMITED` — 429;
- `AI_INTERNAL_ERROR` — 500;
- `AI_PROVIDER_ERROR` — 502;
- `AI_INVALID_RESPONSE` — 502;
- `AI_PROVIDER_UNAVAILABLE` — 503;
- `AI_PROVIDER_TIMEOUT` — 504.

Game review additionally uses imported-game, PGN, analysis, and storage-specific codes documented by its route behavior.

Builder explanation additionally uses:

- `AI_CONTEXT_INVALID` — 409 when authoritative candidate evidence cannot be rebuilt;
- `AI_CONTEXT_STALE` — 409 when identity or selected/comparison candidates no longer match current authoritative evidence.

Network failures, timeouts, rate limits, provider 5xx responses, empty content, malformed JSON, and schema-invalid content may be retried up to `LLM_MAX_RETRIES`. Provider authentication and ordinary request 4xx responses are not retried. Provider or explanation failure leaves deterministic Builder evidence and all Builder commands usable.

## Logging and privacy

Normal operation does not log prompts, PGN, FEN, candidate fact payloads, raw model output, persisted review content, authorization headers, or API keys. Optional debug logging contains only the use case, duration, attempt number, status category, retry decision, and token usage.

Builder explanation intentionally excludes user identity and broader Builder/session state from provider context. The feature remains disabled until deployment owners have accepted the provider's current processing, storage, privacy, and regional terms.

## Removal procedure

### Remove Builder candidate explanation only

1. Remove the candidate-explanation service and prompt under `apps/api/src/modules/ai/repertoire-builder`.
2. Remove its route, use-case flag, capability field, and AI contracts.
3. Remove the feature-local Angular AI data-access service, page-scoped store, workbench inputs/events/panel, and explanation stylesheet.
4. Remove its focused tests and documentation sections.

No Builder core, ranking policy, reducer, session, course, or database migration is required.

### Remove the complete AI subsystem

1. Remove `apps/api/src/modules/ai` and its route registration.
2. Remove `packages/contracts/src/ai` and the package export.
3. Remove Angular AI capability and feature-specific data-access/store/component composition.
4. Add a migration that drops `ImportedGameAiReview`, then remove the model and its relations from `schema.prisma`.
5. Remove the AI environment variables and this document.
