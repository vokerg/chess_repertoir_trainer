# RB-024 — Ground AI game review with opening plans

Status: IN_REVIEW

Priority: P3

Order: 180

Queue class: Stretch goal

Delivery class: AI consumer integration

Planning maturity: Implemented and validated in PR #268; maintainer review pending

GitHub issue: #243

Pull request: #268

Claimed by: ChatGPT agent session

Claim branch: `rb-024/issue-243-game-review-opening-grounding`

Claimed at: 2026-08-03

## Objective

Implement a bounded stretch enhancement that grounds the existing on-demand AI game review in reviewed static opening knowledge.

For a game with an identified opening and known user color, the AI context includes the corresponding short description, strategic summary and user-side plans so `openingAssessment` can discuss alignment or departure without inventing opening theory.

## Dependencies

- RB-021 / #240 is accepted and complete.
- RB-022 / #241 delivered reviewed knowledge and stable identity/version semantics through PR #255.

This task is independent from RB-023 presentation. Builder UI delivery is not required for AI review grounding.

## Implemented architecture

- resolve the deepest available opening identity from parsed PGN moves, with stored ECO/name fallback;
- pass the same authoritative entry through `OpeningClassificationService` and `OpeningKnowledgeService`;
- project only the identified user's side and bound the provider context to three plans, four conditions/caveats per plan and twelve matched rule IDs;
- include knowledge version, matched IDs and supplied plan content in the existing review input hash;
- increment the game-review prompt version while preserving the external response schema;
- recompute the authoritative input hash before returning a stored review, invalidating stale prompt/model/analysis/knowledge artifacts;
- require structured plan references from the provider and reject unsupported plan IDs, opponent-move associations or missed-opportunity claims without move/engine support;
- preserve the existing explicit generation request, feature flags, provider configuration and storage boundary;
- keep missing opening and missing knowledge as deterministic context fallbacks without runtime research.

## Authority boundary preserved

The model may:

- summarize the supplied strategic direction for the user's side;
- identify supplied-plan alignment at an authoritative user move;
- cautiously note a missed thematic opportunity when user-move analysis supports it.

The model must not:

- invent plans not supplied in context;
- attach a user-side plan to an opponent move;
- treat a generic plan as a forced move sequence;
- infer harm from a plan deviation without engine or move evidence;
- mutate game analysis, tags, opening assignment, courses, Builder state or classification;
- make runtime web calls for opening information.

## Acceptance criteria status

- no behavior changes when AI widgets are disabled: preserved by the existing capability gate;
- no automatic provider call: preserved; only the explicit generate route calls the provider;
- user-side reviewed knowledge only: implemented in the server context builder;
- PGN-based narrow identity: implemented and covered by a Najdorf English Attack regression;
- stale review invalidation: implemented through exact input-hash verification on read;
- unsupported plan references and opponent-move associations: rejected with `AI_INVALID_RESPONSE`;
- missing opening/knowledge: represented as deterministic unavailable context without substitute theory;
- White/Black, hash invalidation, unsupported claims, legacy-null identity and persistence metadata: covered by focused tests;
- current privacy/provider/retention boundary: unchanged; only bounded deterministic opening context is added;
- complete repository CI is the mandatory review-ready gate and its exact head/run are recorded on PR #268.

## Explicit exclusions preserved

- runtime opening research or web access;
- generated opening knowledge persistence;
- model-selected moves or ranking;
- automatic course or practice creation;
- Builder candidate explanation changes;
- broad AI architecture refactoring;
- enabling the feature by default without separate evidence and approval.
