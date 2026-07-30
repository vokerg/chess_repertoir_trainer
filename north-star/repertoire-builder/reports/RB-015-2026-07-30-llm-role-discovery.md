# RB-015 LLM role discovery

Date: 2026-07-30

Status: in progress — prototype architecture and stretch tasks defined

Task: RB-015

GitHub issue: #103

Research branch: `rb-015/issue-103-llm-role-discovery`

Draft pull request: #216

## Decision sought

Decide where generated interpretation adds enough value to justify latency, cost, privacy surface, provider failure, and factuality risk after deterministic target, candidate, session, course-preview/apply, and existing-course adaptation capabilities are available.

The repository can already call an LLM. The architectural question is how to test value without granting generated text authority over chess decisions or course state.

## User direction

On 2026-07-30 the user requested feature-toggled prototypes in the real flow and required that they remain purgeable from decision making.

This report therefore advances from a generic research matrix to two explicit stretch prototypes:

- RB-019 / issue #218 — advisory candidate explanation in Builder;
- RB-020 / issue #219 — post-apply Builder course summary.

No production prototype code is added in RB-015. The tasks and issues define separate reviewable implementation scopes.

## Current verified AI baseline

The application already has one optional imported-game review feature with these boundaries:

- `AI_WIDGETS_ENABLED` plus a use-case-specific game-review flag;
- server-side OpenAI-compatible chat-completions requests through native Node `fetch`;
- no provider SDK;
- bounded output tokens, timeout, retry, rate-limit, provider, malformed JSON, and schema-invalid response handling;
- use-case-supplied Zod output validation;
- bounded game and completed-analysis context;
- prompt restrictions against invented evaluations, best moves, openings, motifs, intentions, and psychology;
- authoritative replacement of model-referenced move number, side, played SAN, best SAN, classification, and score loss;
- one current persisted artifact per owned imported game with input hash and prompt/schema/model provenance;
- no raw prompt, PGN, context, output, authorization, or API-key logging during normal operation;
- capability-driven Angular visibility;
- presentation-only widget composition that delegates board navigation to the existing game store.

This is adequate reusable plumbing for experiments. It is not evidence that a new AI role improves the product.

## Current deterministic Builder authority

### Candidate and decision flow

`RepertoireBuilderStore` is the page-scoped owner of:

- target setup and session creation;
- active branch and candidate-response loading;
- selected candidate preview;
- selected opponent-response coverage;
- accept, defer, ignore, stop, reopen, restart, queue reorder, finish, and abandon commands;
- stale-request suppression;
- RB-009 session revisions and transitions.

The candidate response is produced by the existing authenticated RB-007 endpoint. It contains:

- contract and ranking-policy versions;
- generated time, target ID, normalized position, role, and source summary;
- ordered legal candidates;
- engine, Masters, population, personal, opening, course, and Player Chess Profile evidence;
- eligibility, target fit, profile fit, reason codes, warning codes, and coverage contribution.

No AI prototype may become an input to these values or commands.

### Course preview and apply flow

`RepertoireBuilderCourseStore` is the page-scoped owner of:

- materializable draft projection;
- course/chapter selection;
- exact required destination for finding launches;
- RB-011 preview;
- target selection;
- preview-token-bound apply;
- authoritative apply result.

`RepertoireBuilderCourseDialogComponent` renders destination controls, the preview, conflicts, warnings, and the final result. No AI prototype may become an input to destination, target, preview, apply eligibility, transaction, revision, or course writes.

## Architecture decision

Generated interpretation is allowed only as a leaf presentation capability consuming immutable deterministic snapshots.

It is prohibited from returning or executing commands.

```text
RB-006 target + RB-007 evidence + RB-009/RB-011 result
                    |
                    v
       bounded AI context adapter
                    |
                    v
    schema-validated interpretation
                    |
                    v
 optional read-only presentation panel
```

The arrow never points back into ranking, reducers, stores, preview/apply, or persistence.

## Prototype 1 — advisory candidate explanation

Canonical task: `tasks/RB-019-builder-candidate-explanation-prototype.md`

GitHub issue: #218

Queue: order 152, priority P3, stretch goal

### Product location

The existing workbench renders a **Focused evidence** panel after a user previews a candidate. The prototype belongs immediately after that panel, where it can explain the visible evidence without obscuring the candidate list or primary controls.

### Trigger and lifetime

- hidden when disabled or provider configuration is incomplete;
- explicit **Explain this trade-off** action;
- no request on page load, candidate load, preview, selection, or response toggle;
- transient output only;
- stale output discarded when target, position, role, policy version, response generation, selected candidate, or comparison candidate changes.

### Authority boundary

The server should accept a bounded candidate-decision request and selected move identity, then call the candidate-decision application service directly to rebuild authoritative evidence.

It should not accept client-supplied rank, evaluation, reason, or evidence claims as authority.

Generated output may summarize supplied reasons and evidence. It may not:

- recommend or select a move;
- reorder candidates;
- alter eligibility, fit, warning, or coverage state;
- invent chess evaluation or causality;
- conceal unavailable/stale/insufficient evidence;
- mutate the builder session.

### Angular boundary

A feature-local page-scoped AI store/data-access service owns request state. `RepertoireBuilderStore` remains unchanged. The workbench receives optional display state and emits only an explanation request event.

### Feature flags

- global: `AI_WIDGETS_ENABLED`;
- use case: `AI_BUILDER_CANDIDATE_EXPLANATION_ENABLED`;
- capability: `widgets.builderCandidateExplanation`.

## Prototype 2 — post-apply Builder course summary

Canonical task: `tasks/RB-020-builder-completion-summary-prototype.md`

GitHub issue: #219

Queue: order 154, priority P3, stretch goal

### Product location

The existing course dialog renders `result()` only after RB-011 apply succeeds. The prototype belongs immediately after that authoritative result block.

This location deliberately excludes it from destination selection, preview review, conflict handling, target selection, and apply confirmation.

### Trigger and lifetime

- hidden when disabled or provider configuration is incomplete;
- explicit request only after apply succeeds;
- no request during preview or apply;
- transient output only;
- cleared when the dialog closes, a new draft starts, or another apply result is produced.

### Authority boundary

Context is bounded to:

- completed RB-009 session/draft facts;
- exact destination and selected target;
- excluded/deferred/ignored/stale/unresolved branches;
- authoritative RB-011 line identity, created/reused counts, idempotence, and course revision.

Generated output may describe the applied slice and suggest a study checklist. It may not:

- claim excluded work was written;
- invent moves, branches, conflicts, destinations, counts, or revisions;
- change or retry apply;
- create course names or organization;
- mutate course state.

### Angular boundary

A page/dialog-scoped AI summary store owns request state. `RepertoireBuilderCourseStore` remains unchanged and exposes no AI command path.

### Feature flags

- global: `AI_WIDGETS_ENABLED`;
- use case: `AI_BUILDER_COMPLETION_SUMMARY_ENABLED`;
- capability: `widgets.builderCompletionSummary`.

## Why two tasks rather than one generic Builder AI task

The candidate explanation is inside an active decision surface and has higher risk of implied authority. The completion summary is post-write and operates on a different snapshot and lifecycle.

Independent tasks provide:

- independent flags and rollout;
- independent metrics and human review;
- independent prompts/contracts;
- independent failure/staleness semantics;
- independent removal;
- smaller reviewable diffs.

A generic `AI_REPERTOIRE_BUILDER_ENABLED` flag or one shared mutable Builder-AI store is rejected.

## Deterministic controls

### Candidate explanation control

The existing Focused evidence panel remains the complete control:

- eligibility;
- target and profile fit;
- course state;
- source availability and details;
- stable reasons and warnings.

A deterministic comparison template should be evaluated beside the LLM prototype using the same source snapshot.

### Completion summary control

The existing result block plus a deterministic structured summary remains the complete control:

- destination;
- accepted/materialized decisions;
- excluded branches;
- created/reused/skipped/conflicting counts;
- idempotence and course revision.

Generated prose is not permitted to replace these fields.

## Profile narrative disposition

No profile prototype task is created.

RB-004/RB-005 remain under acceptance review. A profile narrative or conversational target-refinement prototype is deferred until populated-data use demonstrates a specific gap after deterministic evidence-aware copy and explicit target controls.

## Existing game-review disposition

Retain unchanged during RB-015.

Its persisted lifetime should not be copied automatically. The new Builder prototypes default to transient output because:

- candidate evidence changes with target, position, policy, and source freshness;
- a completion interpretation can become stale after later course edits;
- persistence would require deletion, staleness, and historical-version UX without demonstrated value.

## Purge test

Each prototype must be removable by deleting only:

- its AI use-case adapter/prompt;
- its contract fields;
- its use-case flag and capability boolean;
- its feature-local data-access/store;
- its optional presentational composition;
- its tests/docs.

Removal must not require:

- database migration;
- ranking-policy change;
- builder-session conversion;
- course repair;
- API compatibility for the deterministic workflow;
- navigation or route changes.

## Evaluation requirements for both prototypes

### Grounding

- every move, branch, reason, warning, source, count, destination, and revision reference must map to supplied authoritative data;
- unsupported references fail validation or are replaced by authoritative values;
- missing/stale/insufficient evidence remains visible;
- generated text is labelled as interpretation.

### State isolation

- snapshot builder/course-store state before request;
- execute successful, failed, timed-out, and invalid provider responses;
- assert that all deterministic state and command eligibility remains unchanged.

### Product usefulness

Compare:

1. current UI/no new feature;
2. deterministic template;
3. LLM output.

Review criteria should include factual accuracy, clarity, decision confidence without undue authority, time saved, verbosity, and usefulness for novice, club, and stronger players.

### Operational boundary

- no automatic generation;
- no background job;
- no persistence for the prototype;
- bounded context and output;
- explicit timeout/rate-limit/provider failure;
- no prompt/context/output logging during normal operation;
- no provider configuration in Angular.

## Queue impact

- RB-019 and RB-020 are added after RB-015 at orders 152 and 154.
- Both are P3 stretch goals.
- Both remain `PROPOSED` until RB-015 is accepted.
- They do not block RB-004/RB-005 review, RB-013, RB-016, or the already-claimed RB-017 pilot.
- No critical-path reprioritization is made.

## Current recommendation

Proceed with the two feature-toggled prototypes as isolated stretch goals.

Do not add a generic Builder AI layer and do not place generated output inside the deterministic decision or write pipeline.

Candidate explanation should be tested at the edge of the active evidence surface. Completion summary should be tested only after apply. Profile narrative remains deferred.

## Files inspected

- `north-star/repertoire-builder/tasks/RB-015-llm-role-discovery.md`
- `north-star/repertoire-builder/GITHUB_ISSUES.md`
- `north-star/repertoire-builder/DECISIONS.md`
- `north-star/repertoire-builder/OPEN_QUESTIONS.md`
- `docs/ai-widgets.md`
- `apps/api/src/modules/ai/ai.config.ts`
- `apps/api/src/modules/ai/ai.routes.ts`
- `apps/api/src/modules/ai/openai-compatible-llm.client.ts`
- `apps/api/src/modules/ai/game-review/game-review.service.ts`
- `apps/api/src/modules/ai/game-review/game-review.prompt.ts`
- `packages/contracts/src/ai/ai.schemas.ts`
- `packages/contracts/src/candidate-decision/candidate-decision.schemas.ts`
- `apps/web/src/app/core/ai/ai-capabilities.service.ts`
- `apps/web/src/app/features/repertoire-builder/pages/repertoire-builder-page.component.ts`
- `apps/web/src/app/features/repertoire-builder/pages/repertoire-builder-page.component.html`
- `apps/web/src/app/features/repertoire-builder/components/repertoire-builder-workbench.component.ts`
- `apps/web/src/app/features/repertoire-builder/components/repertoire-builder-workbench.component.html`
- `apps/web/src/app/features/repertoire-builder/state/repertoire-builder.store.ts`
- `apps/web/src/app/features/repertoire-builder/components/repertoire-builder-course-dialog.component.ts`
- `apps/web/src/app/features/repertoire-builder/components/repertoire-builder-course-dialog.component.html`
- `apps/web/src/app/features/repertoire-builder/state/repertoire-builder-course.store.ts`
- `apps/web/src/app/features/repertoire-builder/data-access/repertoire-builder-api.service.ts`

## Validation state

Repository CI will validate the planning/task changes through draft PR #216.

No provider request, generated prototype output, browser prototype, or human usefulness test has been performed. These are requirements of RB-019/RB-020 and must not be represented as completed in RB-015.

External provider API behavior, pricing, privacy, and retention research remains required before RB-015 final completion.
