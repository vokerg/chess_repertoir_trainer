# AI widgets

AI widgets are optional, on-demand product features backed by a server-side OpenAI-compatible provider.

- Imported-game review generates a persisted coaching overview for one imported game.
- Repertoire Builder candidate explanation generates a transient interpretation of already-computed candidate evidence.
- Repertoire Builder completion summary generates a transient interpretation and study checklist only after an authoritative course apply result exists.

All three remain isolated from Stockfish execution, tagging, imported-game processing, deterministic candidate ranking, Builder reducers, preview/apply decisions, and course writes.

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
       -> role-aware candidate-decision application service
       -> bounded authoritative fact projection
       -> OpenAI-compatible JSON client
       -> evidence-reference and move reconciliation
       -> transient response only
```

### Builder completion summary

```text
Angular Builder course dialog
  -> authoritative RB-011 apply succeeds
  -> existing result block renders first
  -> explicit user click only
  -> POST /api/ai/repertoire-builder/completion-summary
       -> validate completed draft/result algebra
       -> re-read owned chapter, applied line, and current course revision
       -> bounded result/path/excluded-work fact projection
       -> OpenAI-compatible JSON client
       -> evidence-reference and non-authority reconciliation
       -> transient response only
```

`apps/api/src/modules/ai` owns provider configuration, request execution, prompts, output validation, persistence where a use case explicitly requires it, and AI-specific errors. Feature adapters under that module own subject-specific context and reconciliation.

- Game review reads existing imported-game and completed-analysis application services.
- Builder candidate explanation calls the same role-aware candidate-decision application service as the Builder API, so USER_MOVE and OPPONENT_RESPONSE explanations rebuild through their respective deterministic policy authorities.
- Builder completion summary re-reads the current owned course destination after apply, but never calls preview/apply services or writes course data.

No AI adapter calls REST internally or runs Stockfish.

Angular owns capability visibility, loading/generation state, rendering, and composition with existing feature state. Provider keys, model names, prompts, raw provider payloads, and server-side context never reach the browser.

## Feature flags

The global flag and the relevant independent use-case flag must both be enabled.

```text
AI_WIDGETS_ENABLED=true
AI_GAME_REVIEW_ENABLED=true
AI_BUILDER_CANDIDATE_EXPLANATION_ENABLED=true
AI_BUILDER_COMPLETION_SUMMARY_ENABLED=true
```

Every flag is disabled by default. If the global flag, the relevant use-case flag, or provider configuration is incomplete, `GET /api/ai/capabilities` returns that widget as unavailable and Angular renders no control. Direct calls to a disabled widget return a stable error.

The use-case flags are independent. Enabling one widget does not expose either of the others.

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

The browser does not send rankings, evaluations, reason labels, warnings, fits, or evidence as authoritative input. The API calls the same role-aware candidate-decision application service as the Builder using the authenticated user and rebuilds the current response. `USER_MOVE` remains on the empirical persona policy; `OPPONENT_RESPONSE` rebuilds through the opponent-preparation policy before final candidate truncation. A stale target, normalized position, role, policy, or missing candidate is rejected before provider work.

The provider receives no FEN, complete candidate response, PV tree, Builder session, queue, course destination, user identity, or command state. It receives only selected/comparison identities and bounded fact records derived from the authoritative response.

The model must cite supplied fact IDs. The server rejects unknown evidence IDs, false missing-evidence references, unsupported move references, recommendation language, and unsupported causal claims. Generated text remains interpretation; deterministic evidence remains the complete fallback and the user retains move choice.

## Builder completion-summary input

The browser can form a request only while the course dialog is open and all of these immutable values exist:

- completed Builder course draft;
- selected target used by apply;
- authoritative `BuilderCourseReintegrationApplyResponse`;
- loaded course/chapter display identity.

Before provider work, the API verifies:

- the draft belongs to the authenticated user and has completed-session shape;
- destination IDs and target kind match the apply result;
- existing-line or new-line identity matches the applied line;
- materialized, created, reused, skipped, conflict, and idempotence values are algebraically consistent;
- the owned chapter and applied line still exist;
- the line still belongs to the chapter/course;
- current course content revision still equals the applied result revision.

The provider does not receive the full draft, FEN, target object, preview token, destination request, course rows, or apply request. It receives:

- one server-generated factual result sentence;
- bounded fact records for destination, line, target kind, counts, revision, idempotence, session/target identity, decision/transposition counts;
- up to six applied leaf paths;
- up to six excluded branch records.

The model must cite supplied fact IDs. The server rejects unsupported fact or move references, course-control language, unsupported chess/causal claims, unsupported count/revision claims, and any statement that excluded, deferred, ignored, stale, pending, or unresolved work was applied.

The response keeps the server-generated factual result separate from generated interpretation, highlights, optional study checklist, unresolved-work note, warning, referenced facts, and a fixed non-authority disclaimer.

## Response lifetime

### Game review

The wire response is versioned and validated by `@chess-trainer/contracts/ai`. Model-generated labels are called `themes`; they are not deterministic game tags.

`ImportedGameAiReview` stores one current review per imported game. Regeneration uses an upsert and replaces that artifact rather than accumulating hidden history. Raw provider requests and responses are not stored.

When a game page opens, Angular loads the persisted artifact. No provider request is made. Clicking **Regenerate AI overview** performs a new provider request and replaces the saved artifact only after validation and authoritative reconciliation succeed.

### Builder candidate explanation

Builder candidate explanations are transient. There is no Prisma model, migration, browser storage, hidden history, background generation, automatic regeneration, or saved current artifact.

The page-scoped `RepertoireBuilderCandidateExplanationStore` is separate from `RepertoireBuilderStore`. It keys state to the complete request identity and discards stale responses without invoking Builder commands.

### Builder completion summary

Builder completion summaries are transient. There is no Prisma model, migration, browser storage, hidden history, background generation, automatic regeneration, or saved current artifact.

`RepertoireBuilderCompletionSummaryStore` is separate from `RepertoireBuilderCourseStore`. It has no destination, target, preview, apply, course-write, or navigation methods. It keys state to session, target, course, chapter, line, and applied revision identity. The response clears when the dialog closes, a new draft starts, or another result/revision appears.

The request control exists only under the already-rendered authoritative result block. Destination selection, preview review, target selection, apply confirmation, and apply execution never call the provider.

## Board navigation

Each game-review turning point delegates to the existing game tree selection. Builder candidate explanation does not add board navigation or move selection. Builder completion summary does not add board or course navigation.

## Failure semantics

Known shared failures use explicit codes:

- `AI_WIDGET_DISABLED` — 404;
- `AI_RATE_LIMITED` — 429;
- `AI_INTERNAL_ERROR` — 500;
- `AI_PROVIDER_ERROR` — 502;
- `AI_INVALID_RESPONSE` — 502;
- `AI_PROVIDER_UNAVAILABLE` — 503;
- `AI_PROVIDER_TIMEOUT` — 504.

Builder interpretation use cases additionally use:

- `AI_CONTEXT_INVALID` — 409 when deterministic input cannot be reconstructed or reconciled;
- `AI_CONTEXT_STALE` — 409 when identity, destination, line, or revision no longer matches;
- `AI_CONTEXT_NOT_FOUND` — 404 when the owned applied destination no longer exists.

Network failures, timeouts, rate limits, provider 5xx responses, empty content, malformed JSON, and schema-invalid content may be retried up to `LLM_MAX_RETRIES`. Provider authentication and ordinary request 4xx responses are not retried.

Provider failure leaves deterministic candidate evidence or the authoritative course result and all existing controls usable.

## Logging and privacy

Normal operation does not log prompts, PGN, FEN, candidate/completion fact payloads, raw model output, persisted review content, authorization headers, or API keys. Optional debug logging contains only the use case, duration, attempt number, status category, retry decision, and token usage.

Builder interpretation intentionally excludes user identity and broader session/course state from provider context. The features remain disabled until deployment owners have accepted the provider's current processing, storage, privacy, and regional terms.

## Removal procedure

### Remove Builder candidate explanation only

1. Remove the candidate-explanation service, context, and prompt.
2. Remove its route, use-case flag, capability field, and AI contracts.
3. Remove its Angular API method, page-scoped store, workbench composition, and stylesheet.
4. Remove focused tests and documentation sections.

No Builder core, ranking policy, reducer, session, course, or database migration is required.

### Remove Builder completion summary only

1. Remove the completion-summary service, context, and prompt.
2. Remove its route, use-case flag, capability field, and AI contracts.
3. Remove its Angular API method, dialog-scoped store, post-result composition, and stylesheet.
4. Remove focused tests and documentation sections.

No preview/apply service, course writer, course schema, Builder reducer, session domain, or database migration is required.

### Remove the complete AI subsystem

1. Remove `apps/api/src/modules/ai` and its route registration.
2. Remove `packages/contracts/src/ai` and the package export.
3. Remove Angular AI capability and feature-specific data-access/store/component composition.
4. Add a migration that drops `ImportedGameAiReview`, then remove the model and relations from `schema.prisma`.
5. Remove the AI environment variables and this document.