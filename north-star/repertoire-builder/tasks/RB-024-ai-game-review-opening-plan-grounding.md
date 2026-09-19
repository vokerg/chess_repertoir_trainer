# RB-024 — Ground AI game review with opening plans

Status: COMPLETE

Priority: P3

Order: 180

Queue class: Stretch goal

Delivery class: AI consumer integration

Planning maturity: Implemented, self-reviewed and validated through PR #268

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
- expose the bounded opening projection as a typed context-builder result as well as provider input;
- include knowledge version, matched IDs and supplied plan content in the existing review input hash;
- retain prompt version 2 while adding grounding version 2 to invalidate pre-reconciliation artifacts without changing the public response schema;
- recompute the authoritative input hash before returning a stored review, invalidating stale prompt/model/analysis/knowledge artifacts;
- require structured plan references from the provider and reject unsupported plan IDs, opponent-move associations, contradictory duplicate claims or missed-opportunity claims without move/engine support;
- construct the public opening assessment server-side from reviewed strategic text, reviewed plan title/summary, authoritative move identity and validated claim type;
- ignore provider-authored opening prose and use a deterministic no-guidance statement when reviewed knowledge is unavailable;
- preserve the existing explicit generation request, feature flags, provider configuration and storage boundary;
- keep missing opening and missing knowledge as deterministic context fallbacks without runtime research.

## Authority boundary preserved

The model may:

- identify a supplied-plan association at an authoritative user move;
- cautiously identify a possible missed thematic opportunity when user-move analysis supports it.

The model must not:

- author the public opening-theory prose;
- invent plans not supplied in context;
- attach a user-side plan to an opponent move;
- emit duplicate or contradictory claims for the same plan and move;
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
- unsupported, opponent-side, duplicate and contradictory plan references: rejected with `AI_INVALID_RESPONSE`;
- free-form provider opening theory: ignored and replaced by server-reconciled reviewed text;
- missing opening/knowledge: represented as deterministic unavailable context and public no-guidance prose;
- White/Black, hash invalidation, unsupported claims, legacy-null identity, fabricated provider prose and persistence metadata: covered by focused tests;
- current privacy/provider/retention boundary: unchanged; only bounded deterministic opening context is added;
- complete repository CI is the mandatory merge gate and its exact head/run are recorded on PR #268.

## Explicit exclusions preserved

- runtime opening research or web access;
- generated opening knowledge persistence;
- model-selected moves or ranking;
- automatic course or practice creation;
- Builder candidate explanation changes;
- broad AI architecture refactoring;
- enabling the feature by default without separate evidence and approval.
