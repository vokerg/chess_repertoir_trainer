# RB-024 — Ground AI game review with opening plans

Status: BLOCKED

Priority: P3

Order: 180

Queue class: Stretch goal

Delivery class: AI consumer integration

Planning maturity: Research-defined; awaiting RB-022

GitHub issue: #243

## Objective

Evaluate and implement a bounded stretch enhancement that grounds the existing on-demand AI game review in reviewed static opening knowledge.

For a game with an identified opening and known user color, the AI context may include the corresponding short description, strategic summary and user-side plans so `openingAssessment` can discuss alignment or departure without inventing opening theory.

## Dependencies

- RB-021 / #240 must be accepted.
- RB-022 / #241 must deliver reviewed knowledge and stable identity/version semantics.

This task is independent from RB-023 presentation. Builder UI delivery is not required for AI review grounding.

## Verified repository baseline

The game-review context currently contains opening ECO/name, user color, deterministic tags, engine summary and authoritative move facts. The review service validates structured output and persists it with schema version, prompt version and an authoritative input hash.

## Required architecture

- resolve opening knowledge server-side from the game's deepest available opening identity and user color;
- prefer PGN/move-based opening lookup when required for narrow UCI-prefix knowledge selectors;
- include only `REVIEWED` deterministic knowledge in the bounded context;
- include knowledge version and matched knowledge IDs in the review input identity/hash;
- increment prompt/schema versions where required;
- preserve the existing explicit on-demand request and AI capability gates;
- treat plans as reference context, not as proof that one move is correct;
- require authoritative move/engine evidence before claiming a concrete departure caused harm;
- preserve missing-opening and missing-knowledge warnings/fallbacks;
- keep provider failure isolated from deterministic game analysis and review surfaces.

## Allowed generated interpretation

The model may:

- summarize the supplied strategic direction for the user's side;
- identify game moments that visibly align with a supplied plan;
- cautiously note missed thematic opportunities when authoritative position or engine evidence supports them.

The model must not:

- invent plans not supplied in context;
- treat a generic plan as a forced move sequence;
- infer causation from a plan deviation without engine or move evidence;
- mutate game analysis, tags, opening assignment, courses, Builder state or classification;
- make runtime web calls for opening information.

## Acceptance criteria

- no behavior changes when AI widgets are disabled;
- no automatic provider call is introduced;
- only the identified opening's user-side reviewed knowledge enters context;
- stale stored reviews are invalidated when knowledge identity/version changes;
- unsupported plan references and invented opening claims fail validation or are omitted safely;
- missing opening/knowledge yields a warning or deterministic fallback rather than invented strategy;
- tests cover White/Black grounding, PGN-based narrow identity, missing opening, missing knowledge, hash invalidation, malformed generated references and provider failure;
- current AI privacy, provider, model and retention behavior is reverified at implementation time;
- complete repository CI passes.

## Explicit exclusions

- runtime opening research or web access;
- generated opening knowledge persistence;
- model-selected moves or ranking;
- automatic course or practice creation;
- Builder candidate explanation changes;
- broad AI architecture refactoring;
- enabling the feature by default without separate evidence and approval.
