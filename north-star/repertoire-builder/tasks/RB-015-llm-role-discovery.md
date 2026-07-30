# RB-015 — Decide whether an LLM has a justified role

Status: IN_PROGRESS

Priority: P3

Order: 150

Delivery class: Research

Planning maturity: Architecture decision and stretch prototypes defined

GitHub issue: `#103`

Claimed by: OpenAI ChatGPT

Claim branch: `rb-015/issue-103-llm-role-discovery`

Claimed at: 2026-07-30

Claim scope: Audit the existing optional AI game-review subsystem, locate safe AI seams in the integrated builder/course flow, compare every candidate role with deterministic alternatives, and define removable feature-toggled prototypes without adding production AI behavior in RB-015 itself.

Current pull request: `#216`

## Outcome

Determine whether an LLM materially improves the Chess Profile or repertoire-builder experience after deterministic evidence, ranking, visual decisions, session control, course preview/apply, and existing-course adaptation are available.

Any accepted role must remain:

- optional and disabled by default;
- on demand rather than automatic;
- source-grounded and schema validated;
- outside factual authority, ranking, reducers, validation, and writes;
- fully removable without breaking the deterministic workflow.

## User direction accepted on 2026-07-30

The program should include feature-toggled prototypes inside the real builder flow, but architecture must allow them to be purged without changing the decision-making process.

RB-015 therefore defines two separate stretch tasks and issues:

1. **RB-019 / #218 — advisory candidate explanation** beside the existing Focused evidence panel.
2. **RB-020 / #219 — post-apply Builder course summary** after the authoritative RB-011 apply result.

They are separate because their risk, timing, authoritative inputs, and removal boundaries differ.

RB-015 does not implement either prototype. It defines their architectural contracts and queue position. Each prototype requires its own reviewable implementation PR.

## Verified starting baseline

The repository already contains one isolated optional AI use case for imported-game review:

- server-side OpenAI-compatible JSON generation using native `fetch`;
- disabled-by-default global and game-review feature flags;
- bounded game and completed-analysis context;
- use-case-specific Zod output validation;
- authoritative reconciliation of referenced plies and move facts;
- one current persisted artifact per imported game with prompt/schema/model provenance;
- explicit provider, timeout, rate-limit, invalid-response, disabled-feature, and storage failures;
- no raw prompt/context/output logging during normal operation;
- capability-driven Angular visibility and presentation-only composition.

Reusable plumbing lowers prototype cost, but it is not evidence that generated text should gain product authority.

## Verified builder architecture

### Deterministic decision authority

`RepertoireBuilderStore` owns:

- active candidate response and selected candidate;
- opponent-response coverage selection;
- RB-009 session mutations;
- queue, defer, ignore, stop, restart, and finish commands;
- target and candidate request identity.

RB-007 candidate ordering, eligibility, reasons, warnings, fit, and evidence remain authoritative. AI must not be injected into the candidate service, ranking policy, builder store, or reducer transitions.

### Candidate explanation seam

`RepertoireBuilderWorkbenchComponent` renders the selected candidate's **Focused evidence** after the deterministic candidate list.

The approved prototype seam is one optional advisory sibling immediately after that panel:

- explicit **Explain this trade-off** request only;
- page-scoped AI state separate from `RepertoireBuilderStore`;
- server-side reconstruction of authoritative RB-007 evidence;
- transient output tied to target/position/role/policy/response/candidate identity;
- no accept, coverage, queue, session, or course command access.

Canonical follow-up: `tasks/RB-019-builder-candidate-explanation-prototype.md` / issue #218.

### Completion summary seam

`RepertoireBuilderCourseDialogComponent` renders an authoritative result only after `RepertoireBuilderCourseStore.applyCourseOutput()` succeeds.

The approved prototype seam is one optional advisory panel immediately after that result:

- explicit request only after apply;
- no visibility during destination selection, preview, target selection, or confirmation;
- page/dialog-scoped AI state separate from `RepertoireBuilderCourseStore`;
- transient output grounded in the completed draft, exact destination, excluded branches, and RB-011 apply result;
- no preview token, destination, apply, transaction, course revision, or writer access.

Canonical follow-up: `tasks/RB-020-builder-completion-summary-prototype.md` / issue #219.

## Decisions by candidate role

### Candidate trade-off explanation

Decision: **prototype as a stretch goal through RB-019**.

The deterministic Focused evidence panel remains the baseline and complete fallback. The prototype tests whether natural-language synthesis adds value when reason, warning, source, target-fit, profile-fit, and course signals conflict.

The model may interpret supplied facts but cannot recommend a move, change ordering, add reasons, conceal missing evidence, or claim unsupported chess facts.

### Completed builder/course-change summary

Decision: **prototype as a stretch goal through RB-020**.

The authoritative result block remains the baseline and complete fallback. Generated text is only available after apply and may summarize the completed slice or suggest a study checklist.

It cannot influence destination, target, preview, conflict handling, apply, or persisted course state.

### Player-profile narrative or conversational target refinement

Decision: **defer**.

RB-004/RB-005 remain in review. No new task is created until populated-data acceptance demonstrates a concrete explanation gap that deterministic evidence-aware copy and explicit target controls cannot cover.

### Existing AI game review

Decision: **retain unchanged during RB-015**.

Its architecture is useful proof of isolation and grounding. Its product usefulness, cost, and retention should be evaluated separately from the new builder prototypes.

## Feature-toggle policy for prototypes

Both future prototypes must use the existing server capability model:

- `AI_WIDGETS_ENABLED` remains the global gate;
- each prototype receives its own use-case flag;
- `/api/ai/capabilities` exposes separate booleans;
- disabled/unconfigured prototypes render no control;
- provider failure never disables deterministic Builder controls;
- no browser copy of provider credentials, model, prompt, or raw context.

Suggested flags:

- `AI_BUILDER_CANDIDATE_EXPLANATION_ENABLED`;
- `AI_BUILDER_COMPLETION_SUMMARY_ENABLED`.

A single Builder-AI flag is rejected because the two prototypes have different risk and lifecycle and must be independently measurable and removable.

## Non-authority rule

Generated output is never an input to:

- RB-007 candidate ranking or eligibility;
- target/profile evidence calculation;
- selected move or selected response state;
- RB-009 reducer actions or queue order;
- completion eligibility;
- RB-011 destination, preview token, conflict resolution, apply validation, transaction, or course write;
- opening classification or course-review findings.

The prototypes consume immutable snapshots after deterministic computation. They do not return commands.

## Purge/removal requirement

Removing either prototype must require only removal of:

- its use-case AI adapter and prompt;
- its AI contract fields;
- its use-case feature flag and capability boolean;
- its page/dialog-scoped AI data access/store;
- its optional presentational composition;
- its tests and documentation.

Removal must not require a data migration, builder/session/course rewrite, ranking-policy change, or course repair.

## In scope for RB-015

- inspect current AI, profile, candidate, builder, and course-result boundaries;
- define exact prototype insertion points and authority exclusions;
- compare deterministic, generated, and no-feature controls;
- define grounding, context, privacy, latency, cost, failure, persistence, and removability requirements;
- create immutable follow-up tasks and GitHub issues;
- place them in the queue as non-critical stretch goals;
- make a final recommendation for each role and the program.

## Out of scope for RB-015

- production endpoint, prompt, contract, provider request, or Angular prototype implementation;
- new provider abstraction or SDK;
- schema, migration, persistence model, browser storage, worker, or background generation;
- LLM move selection, ranking, validation, profile calculation, opening classification, or course write;
- automatic provider calls;
- profile narrative implementation before RB-004/RB-005 acceptance.

## Acceptance criteria

- The current AI implementation is evaluated as evidence, not as automatic justification.
- The builder and course seams are verified from current code.
- Every prototype retains a complete deterministic fallback.
- Prototype state is separate from deterministic stores and reducers.
- Feature toggles, on-demand triggers, transient lifetime, stale clearing, provider failure, and purge paths are explicit.
- Generated output cannot alter factual or write authority.
- RB-019/#218 and RB-020/#219 exist as separate canonical stretch goals.
- Profile narrative remains deferred until a demonstrated accepted-surface gap exists.
- External provider/API/pricing/privacy facts are verified from primary sources before final RB-015 completion.
- No provider request or human usefulness test is represented as completed unless actually performed.

## Required validation

Research validation includes:

- repository inspection of current AI, candidate, builder, course-dialog/store, and profile boundaries;
- representative deterministic and generated source payloads for the two prototypes;
- hallucinated identifier/evidence/count and unavailable-provider cases;
- stale-response and disabled-feature behavior;
- human review criteria across multiple chess strengths;
- current primary-source provider behavior, pricing, privacy, and retention research;
- repository CI for the planning/task changes.

No production prototype implementation without its separate task and PR.

## Queue decision

RB-019 and RB-020 are inserted after RB-015 at orders 152 and 154, priority P3, as stretch goals.

They must not block:

- RB-004/RB-005 review and closure;
- RB-013 after profile acceptance;
- RB-016 outcome measurement;
- RB-017's already-claimed bounded traps pilot.

## Completion

Report: `../reports/RB-015-2026-07-30-llm-role-discovery.md` — in progress

Completed at: none
