# RB-015 LLM role discovery

Date: 2026-07-30

Status: in progress

Task: RB-015

GitHub issue: #103

Research branch: `rb-015/issue-103-llm-role-discovery`

## Decision sought

Decide whether an LLM materially improves the Player Chess Profile or repertoire-builder experience after deterministic evidence, ranking, visual decision, course preview/apply and existing-course adaptation are available.

The decision is not whether the repository can call an LLM. It already can. The decision is whether a specific new role provides enough user value to justify its factuality risk, latency, cost, privacy surface, persistence semantics and architectural coupling compared with deterministic copy or the current UI.

## Current verified AI baseline

The repository already contains one optional, isolated AI feature for imported-game review.

### Availability and provider boundary

- AI widgets and game review have separate disabled-by-default feature flags.
- Provider configuration remains server-side and currently supports an OpenAI-compatible chat-completions endpoint.
- The client uses native Node `fetch`; no provider SDK is installed.
- Requests have bounded output tokens, timeout, retry, rate-limit and provider-error handling.
- The shared client requires JSON output and validates it with a use-case-supplied Zod schema.

### Game-review use-case boundary

- Generation is on demand and requires an owned imported game, PGN and completed engine analysis.
- The context is built from existing read models rather than internal REST calls or a new analysis pipeline.
- The model receives bounded structured game and move facts.
- The prompt forbids invented evaluations, best moves, opening names, tactical motifs, intentions and psychological claims.
- A model-referenced ply must exist in the authoritative context.
- Move number, side, played move, best move, classification and score loss are replaced with authoritative server values before the response is accepted.

### Persistence and privacy boundary

- One current validated artifact is stored per imported game.
- The stored row records analysis run, prompt/schema versions, provider, model and an input hash.
- Regeneration replaces the current artifact rather than accumulating hidden history.
- Raw provider requests and responses are not stored.
- Normal logging excludes prompts, PGN, context, output, authorization and API keys.
- Provider configuration and raw context never reach Angular.

### Angular boundary

- Capability visibility is loaded separately from review state.
- The page-scoped review store loads a stored artifact only when the feature is available.
- The review component is presentation-only.
- Turning-point navigation delegates to the existing game-detail store and board rather than introducing a second chess model.
- Tactics and AI review remain distinct insight tabs.

## Initial architecture assessment

The current experiment already demonstrates several properties RB-015 would require for any future role:

- optional and feature-flagged;
- provider-neutral at the product boundary;
- source-grounded structured input;
- schema-validated output;
- authoritative reconciliation where stable identifiers exist;
- explicit failure semantics;
- bounded persistence and deletion ownership;
- removable without breaking the core game workflow.

It also exposes the central limitation: generated prose can be constrained, but it is not authoritative. Game review can reconcile referenced plies and move facts because those identifiers already exist. A builder explanation cannot safely invent candidate evidence, profile conclusions, course conflicts, selected branches or applied results; any such facts must remain deterministic fields supplied by RB-006/RB-007/RB-009/RB-011.

Reusable provider plumbing therefore lowers implementation cost but does not establish product justification.

## Candidate role 1 — candidate trade-off explanation

### User problem to verify

RB-007 exposes multiple evidence sources, stable reasons, warnings, target fit and profile fit. The question is whether users still struggle to understand why one move is preferable for their selected target or how two candidates trade off.

### Authoritative inputs

Potential source facts are limited to the selected RB-006 target and the bounded RB-007 candidate response already rendered by the workbench:

- candidate identity and legal move;
- eligibility;
- stable reasons and warnings;
- source availability/freshness;
- engine, Masters, population, personal, opening-profile, Player Chess Profile and course evidence;
- target fit versus profile fit;
- opponent-coverage contribution.

### Deterministic alternative

Build a deterministic comparison template over existing reason codes and evidence states, for example:

- strongest support for each candidate;
- principal trade-off;
- missing or weak evidence;
- target/profile disagreement;
- course conflict or coverage consequence.

This is cheaper, immediate, auditable and localizable. It should be the baseline, not an afterthought.

### LLM hypothesis

An LLM may produce a more natural synthesis when evidence is numerous or contradictory. It must not rank candidates, introduce new reasons, infer intentions or claim chess facts absent from the structured response.

### Provisional disposition

**Unproven.** Do not implement before demonstrating that deterministic comparison copy is materially insufficient in the accepted workbench.

## Candidate role 2 — completed builder/course-change summary

### User problem to verify

After a builder session and RB-011 apply, users may benefit from a concise account of what they selected, which opponent responses were covered, which branches remained unresolved and what course material was created or reused.

### Authoritative inputs

- RB-006 target snapshot;
- RB-009 completed session and explicit unresolved/excluded branches;
- RB-011 preview and apply result counts;
- exact destination course/chapter/line anchors;
- source-finding context for RB-012 launches.

### Deterministic alternative

A structured completion summary can directly group:

- chosen repertoire moves;
- added opponent coverage;
- unresolved/deferred/ignored branches;
- created/reused/skipped counts;
- conflicts or stale-source failures;
- destination links.

This information is already authoritative and naturally tabular. A deterministic summary may be clearer than prose.

### LLM hypothesis

An optional narrative could explain the strategic shape of the completed slice or produce a study checklist. That interpretation is harder to reconcile than identifiers/counts and may become stale after course edits.

### Provisional disposition

**Likely deterministic first.** Any LLM narrative should be transient, explicitly interpretive and downstream of a complete authoritative summary.

## Candidate role 3 — Player Chess Profile narrative or target refinement

### User problem to verify

Users may need help interpreting preference versus performance evidence, uncertainty, target defaults and deliberate overrides.

### Authoritative inputs

This role depends on the accepted RB-004/RB-005 contract and UI, including evidence grades, selected-game baselines, opening evidence, uncertainty and separate preference/performance conclusions.

### Deterministic alternative

Use evidence-aware conclusion templates and explicit target controls. A factual profile should not be rewritten into an opaque personality label.

### LLM hypothesis

A conversational explanation might answer follow-up questions or translate evidence into accessible language. It risks collapsing uncertainty, inventing causal explanations or presenting generated advice as profile fact.

### Provisional disposition

**Defer production judgment until RB-004/RB-005 are accepted and reviewed with populated data.** Contract-level research may continue, but this task must not approve a profile feature against an unaccepted product surface.

## Evaluation matrix

| Dimension | Candidate trade-off | Builder/course summary | Profile narrative |
| --- | --- | --- | --- |
| Current deterministic facts | RB-006/RB-007 | RB-006/RB-009/RB-011/RB-012 | RB-004/RB-005 |
| Stable identifiers available | moves, reason codes, source states | branches, anchors, preview/apply counts | evidence sections and grades |
| Strong deterministic alternative | yes | yes | yes |
| Main possible LLM value | synthesis of competing evidence | narrative/study checklist | conversational explanation |
| Main factuality risk | new chess/ranking claims | invented strategic meaning or stale summary | false causality/personality certainty |
| Persistence default | none/transient | none/transient | none until accepted need |
| AI-disabled fallback | existing workbench + template | authoritative structured summary | existing profile UI + templates |
| Initial disposition | unproven | deterministic first | defer |

This matrix is provisional. It records the current evidence threshold, not the final recommendation.

## Required next research

1. Inspect RB-004/RB-005 conclusion and evidence contracts rather than assuming the profile explanation gap.
2. Inspect RB-007 reason taxonomy and the RB-010 candidate presentation to enumerate what deterministic synthesis can already express.
3. Inspect RB-009/RB-011 result projections for a deterministic completion-summary shape.
4. Build representative source payloads for all three roles without adding production code.
5. Draft deterministic output for each payload before drafting any prompt.
6. Define factuality tests that fail on invented evidence, changed rankings, unsupported causality, unknown identifiers and missing-source concealment.
7. Verify current provider API behavior, pricing, privacy/data-retention terms and JSON/structured-output constraints from primary sources before making cost or provider recommendations.
8. Define human review criteria across at least novice, club and stronger-player perspectives.

## Current risks and open decisions

- There is not yet product-use evidence that current deterministic explanations are confusing.
- The existing game-review artifact is persisted; that lifetime should not be copied automatically to builder or profile interpretation.
- Input hashing can detect generation provenance but does not automatically tell the user that generated interpretation is stale.
- A generic AI capability boolean may need use-case-specific expansion only if another role is approved; changing it during research would be premature.
- The current shared client is sufficient for JSON generation, but provider-specific structured-output guarantees and pricing may differ.
- Evaluation by another LLM would not substitute for source-grounding checks and human usefulness review.

## Interim recommendation

Do not add a new production LLM widget during RB-015.

Continue the research with deterministic alternatives as the baseline. The burden of proof is highest for candidate explanation because the product already has structured reasons, and for builder summaries because authoritative data naturally supports deterministic output. Profile narrative remains dependent on acceptance of the profile surface.

The existing game-review experiment should remain unchanged during this research unless inspection reveals a concrete defect. Its architecture is useful evidence, but its existence is not a mandate for more AI features.

## Files inspected so far

- `north-star/repertoire-builder/tasks/RB-015-llm-role-discovery.md`
- `north-star/repertoire-builder/GITHUB_ISSUES.md`
- `docs/ai-widgets.md`
- `apps/api/src/modules/ai/ai.config.ts`
- `apps/api/src/modules/ai/ai.routes.ts`
- `apps/api/src/modules/ai/openai-compatible-llm.client.ts`
- `apps/api/src/modules/ai/game-review/game-review.service.ts`
- `apps/api/src/modules/ai/game-review/game-review.prompt.ts`
- `packages/contracts/src/ai/ai.schemas.ts`
- `apps/web/src/app/features/games/components/game-ai-review-widget.component.ts`
- `apps/web/src/app/features/games/components/game-insights.component.ts`
- `apps/web/src/app/features/games/pages/game-detail-page.component.ts`

## Validation state

Repository CI will validate documentation and architecture consistency through the draft PR. No provider request, prompt prototype or human usefulness test has been performed yet. Those must not be represented as passed.
