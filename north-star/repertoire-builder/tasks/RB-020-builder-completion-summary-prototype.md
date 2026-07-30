# RB-020 — Prototype post-apply Builder course summary

Status: IN_PROGRESS

Priority: P3

Order: 154

Queue class: Stretch goal

Delivery class: North-star prototype

Planning maturity: Bounded implementation underway

GitHub issue: `#219`

Claimed by: `vokerg` / ChatGPT agent session

Claim PR: `#227`

Implementation branch: `rb-020/issue-219-completion-summary`

Claimed at: 2026-07-30

Claim scope: Implement the disabled-by-default, explicit post-apply completion-summary slice: shared AI contracts, capability gating, authoritative completion-context reconciliation after RB-011 apply, transient dialog-scoped Angular state, optional result-panel composition, focused validation, and North Star reporting. Excludes all pre-apply behavior, destination/target selection, preview/apply services, course writes, persistence, background generation, candidate explanation, and profile narrative.

## Outcome

Provide one disabled-by-default, on-demand generated summary after a Repertoire Builder draft has already been applied through the authoritative RB-011 course-write boundary.

The prototype may explain what changed and suggest a study checklist. It is post-decision and post-write; it must remain removable without changing destination selection, preview, apply eligibility, course revisions, or stored course content.

## Why this task exists

RB-011 already exposes authoritative created/reused/skipped/conflicting counts, destination identity, revision binding, and apply results. A generated narrative may make the completed slice easier to understand or study, but it must not sit before confirmation or be allowed to reinterpret the write result as authority.

## Verified insertion point

`RepertoireBuilderCourseDialogComponent` renders the authoritative `result()` status block only after `RepertoireBuilderCourseStore.applyCourseOutput()` succeeds.

The prototype belongs immediately after that result block. The request control must not exist during course selection, chapter selection, preview review, target selection, or apply confirmation.

## Required architecture

### Capability and trigger

- require `AI_WIDGETS_ENABLED=true`;
- require `AI_BUILDER_COMPLETION_SUMMARY_ENABLED=true`;
- expose `builderCompletionSummary` through `/api/ai/capabilities`;
- render no control when disabled or provider configuration is incomplete;
- generation is explicit and on demand after apply only;
- no automatic provider request when preview or apply completes.

### Server boundary

- implement under `apps/api/src/modules/ai/repertoire-builder/completion-summary/`;
- reuse the existing OpenAI-compatible JSON client and AI error mapping;
- accept a bounded structured completion payload containing the completed RB-009 session/draft identity, exact destination, excluded branches, selected target, and RB-011 apply response;
- re-read and reconcile owned destination identifiers, applied line, and current course revision before generation;
- treat the RB-011 result as authoritative for line identity, created/reused counts, idempotence, and course revision;
- validate generated output through a dedicated `@chess-trainer/contracts/ai` schema;
- reject invented moves, branches, conflicts, destinations, counts, revisions, causal chess claims, or statements that unapplied work was written;
- generate the factual result sentence server-side and keep it separate from optional interpretation/study suggestions.

### Angular boundary

- add a page/dialog-scoped AI summary store/service separate from `RepertoireBuilderCourseStore`;
- pass only immutable completion inputs after `result()` exists;
- do not expose methods that can select a destination, select a target, request preview, or request apply;
- clear output when the dialog closes, a new draft starts, or a different apply result appears;
- preserve the existing result block as the complete fallback;
- label generated text as interpretation and keep authoritative counts/destination visible first.

### Lifetime

- transient only for the prototype;
- no Prisma model, migration, browser storage, hidden history, background generation, or automatic regeneration;
- output may disappear when the route/dialog is closed without affecting the applied course.

## Implemented output shape

The response contains:

- one server-generated factual result sentence using reconciled destination, line, counts, and revision;
- one bounded generated interpretation tied to supplied fact IDs;
- up to three highlights tied to supplied path/result IDs;
- up to three explicitly generated study-checklist items tied to supplied applied paths;
- one optional unresolved-work note tied only to excluded authoritative work;
- one optional warning tied only to idempotence, excluded work, transpositions, or incomplete context;
- the deterministic facts actually referenced;
- a fixed disclaimer that course changes remain authoritative.

The model cannot select, preview, apply, organize, or mutate course content.

## Acceptance criteria

- AI disabled leaves course preview/apply and result rendering unchanged.
- AI enabled exposes one explicit request only after an apply result exists.
- No provider call occurs during destination selection, preview, target selection, or apply.
- Generated output cannot alter preview token, selected target, apply eligibility, destination, line identity, course revision, result counts, course content, or navigation.
- Unsupported branch/path/destination/count/revision references fail validation or are replaced by authoritative values.
- Provider failure leaves the authoritative result and close/navigation controls usable.
- Output clears on dialog close, new draft, or new result.
- Tests demonstrate unchanged completion inputs and no dependency from the summary store to `RepertoireBuilderCourseStore`.
- Removing the use-case adapter, flags, contracts, store, and optional component composition requires no course schema, migration, or writer change.

## Explicit exclusions

- AI before apply;
- destination, line, chapter, or target recommendations;
- conflict approval or preview-token generation;
- automatic course naming or organization;
- persistence or background jobs;
- course mutations, candidate ranking, or profile calculation;
- candidate trade-off and profile narrative prototypes.

## Required validation

- capability disabled/unconfigured cases;
- post-apply-only visibility and no automatic request;
- idempotent and non-idempotent apply results;
- created/reused/excluded branch reconciliation;
- invented move/branch/destination/count/revision rejection;
- timeout, rate-limit, invalid JSON, invalid schema, and provider failure;
- stale clearing on close/new draft/new result;
- desktop/mobile/keyboard presentation;
- direct assertion that completion inputs and applied course data are unchanged.

## Dependency and queue decision

RB-020 is a stretch goal downstream of RB-015. It does not delay the deterministic builder roadmap or RB-016 outcome measurement.

RB-015 and RB-019 are integrated, RB-017 is already independently claimed, RB-004/RB-005 remain in review, and RB-013/RB-016 remain blocked. No open PR or branch claimed RB-020 before claim PR #227. No task order or priority change is recommended.

## Completion

Report: none

Completed at: none