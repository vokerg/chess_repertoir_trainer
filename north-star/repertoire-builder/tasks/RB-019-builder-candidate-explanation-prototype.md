# RB-019 — Prototype advisory candidate explanation in Builder

Status: DONE

Priority: P3

Order: 152

Queue class: Stretch goal

Delivery class: North-star prototype

Planning maturity: Integrated bounded prototype

GitHub issue: `#218`

Claimed by: `vokerg` / ChatGPT agent session

Claim PR: `#222`

Implementation branch: `rb-019/issue-218-candidate-explanation`

Implementation PR: `#223`

Squash commit: `ee389cbc62bc1fdf8c9c29fcc48c6c566b346652`

Claimed at: 2026-07-30

Claim scope: Implement the bounded, disabled-by-default candidate-explanation slice: shared AI contracts, authoritative server-side context reconstruction through the existing candidate-decision service, capability gating, transient page-scoped Angular state, optional workbench composition, validation, and program reporting. Excludes ranking/session/course mutations, persistence, background generation, profile narrative, and completion summaries.

## Outcome

Provide one disabled-by-default, on-demand generated explanation beside the existing focused candidate evidence in Repertoire Builder.

The explanation may synthesize already-computed RB-007 evidence and trade-offs. It is advisory text only and must remain removable without changing candidate ranking, builder state, session history, coverage selection, or course output.

## Why this task exists

The current workbench exposes rank, engine value, target-population frequency, target fit, profile fit, source states, stable reasons, warnings, and course state. A natural-language explanation may help when those signals conflict, but it must prove value against deterministic comparison copy rather than becoming an unreviewed decision engine.

## Verified insertion point

The current `RepertoireBuilderWorkbenchComponent` renders a **Focused evidence** panel after candidate selection. The prototype belongs directly after that panel as an optional advisory sibling.

The page composition owns capability and request state. The workbench may render optional explanation state and emit an explicit request, but `RepertoireBuilderStore` remains the sole owner of candidate selection and builder commands.

## Required architecture

### Capability and trigger

- require `AI_WIDGETS_ENABLED=true`;
- require `AI_BUILDER_CANDIDATE_EXPLANATION_ENABLED=true`;
- expose `builderCandidateExplanation` through `/api/ai/capabilities`;
- render no control when disabled or provider configuration is incomplete;
- make generation explicit and on demand; never call the provider automatically when a candidate is selected.

### Server boundary

- implement under `apps/api/src/modules/ai/repertoire-builder/candidate-explanation/`;
- reuse the existing OpenAI-compatible JSON client and AI error mapping;
- accept a bounded authoritative candidate-decision request plus selected move identity and optional comparison move identity;
- call the candidate-decision application service directly rather than trusting client-supplied rankings, evaluations, reasons, or evidence;
- build context from the resulting RB-007 response and selected identifiers;
- validate generated output with a dedicated `@chess-trainer/contracts/ai` schema;
- reconcile returned evidence and move references against the authoritative response;
- reject invented candidates, changed ordering, unsupported evaluations, new chess claims, causal claims, or concealed unavailable evidence.

### Angular boundary

- add a feature-local page-scoped AI explanation store/service separate from `RepertoireBuilderStore`;
- key request identity to target ID, normalized FEN, decision role, ranking-policy version, response generation time, selected move, and comparison move;
- discard stale responses when any identity field changes;
- keep generated text outside accept/defer/ignore/stop/reorder/coverage commands;
- preserve the deterministic Focused evidence panel as the complete fallback;
- label output as generated interpretation and show referenced deterministic facts separately.

### Lifetime

- transient only for the prototype;
- no Prisma model, migration, browser storage, hidden history, background generation, or automatic regeneration;
- clearing or removing the feature must not alter the builder session.

## Implemented output shape

The response contains:

- one concise summary;
- up to three explicit trade-offs;
- one to three evidence references for the summary;
- one to three evidence references for each trade-off;
- one optional missing-evidence reference;
- authoritative selected/comparison move identity and rank;
- referenced deterministic facts;
- a fixed disclaimer that ranking and move choice remain deterministic/user controlled.

The model does not return a recommended move or replacement ranking.

## Acceptance status

- AI disabled leaves Builder behavior and decision controls unchanged.
- AI enabled exposes one explicit request next to the current candidate evidence.
- No provider call occurs on route load, candidate load, candidate preview, selection, or comparison selection.
- Generated output cannot change candidate order, selected move, selected opponent responses, session revision, branch state, queue order, target, or course destination.
- Server context is rebuilt from the candidate-decision service rather than accepting client assertions as authoritative.
- Unsupported move/evidence references, causal claims, recommendation language and unreferenced evidence claims fail validation.
- Stale responses do not render after position, target, role, policy, response, selected-candidate or comparison changes.
- Provider failure leaves deterministic evidence and all builder commands usable.
- Focused tests assert deterministic candidate state remains unchanged and the explanation store has no Builder command dependency.
- Removing the use-case adapter, flags, contracts, store, and optional component composition requires no core builder/ranking migration.

## Explicit exclusions

- model-selected moves;
- ranking, eligibility, warning, fit, or coverage changes;
- AI inside `CandidateDecisionService` or the deterministic policy;
- AI inside RB-009 reducers or `RepertoireBuilderStore` mutations;
- persistence or background jobs;
- course preview/apply changes;
- profile narrative and post-apply summaries.

## Validation

Final review-package head `5e8efa9b560fb3c3f34b7187353e3b4d4126b210` passed complete repository CI run `30560305501` / #1634 on 2026-07-30:

- lint;
- build;
- both opening-classification audits;
- architecture guardrails;
- database migrations;
- complete repository tests.

Focused tests cover disabled/unconfigured capability behavior, no automatic provider calls, authoritative context reconstruction, selected and bounded comparison candidates, unsupported references and causal claims, stale identity and stale response suppression, provider timeout, transient lifetime, and unchanged deterministic candidate state.

Live provider requests, authenticated browser walkthrough and human usefulness comparison were not completed before integration. This residual product-risk evidence is accepted only because the prototype remains independently disabled by default, non-authoritative, transient and removable.

## Dependency and queue decision

RB-019 remains a completed P3 stretch goal downstream of RB-015. It does not delay the deterministic builder roadmap, RB-017, RB-013 or RB-016.

RB-020 remains independently proposed. No order or priority change is recommended.

## Completion

Implementation report: `reports/RB-019-2026-07-30-builder-candidate-explanation.md`

Closure report: `reports/RB-019-2026-07-30-closure.md`

Implementation PR: `#223`

Squash commit: `ee389cbc62bc1fdf8c9c29fcc48c6c566b346652`

Completed at: 2026-07-30