# RB-020 — Prototype post-apply Builder course summary

Status: PROPOSED

Priority: P3

Order: 154

Queue class: Stretch goal

Delivery class: North-star prototype

Planning maturity: Architecturally bounded

GitHub issue: `#219`

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

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
- require a separate use-case flag such as `AI_BUILDER_COMPLETION_SUMMARY_ENABLED=true`;
- expose `builderCompletionSummary` through `/api/ai/capabilities`;
- render no control when disabled or provider configuration is incomplete;
- generation is explicit and on demand after apply only;
- no automatic provider request when preview or apply completes.

### Server boundary

- implement under `apps/api/src/modules/ai/repertoire-builder/completion-summary/`;
- reuse the existing OpenAI-compatible JSON client and AI error mapping;
- accept a bounded structured completion payload containing the completed RB-009 session/draft identity, exact destination, excluded branches, selected target, and RB-011 apply response;
- re-read or reconcile owned destination identifiers and current course revision where needed before generation;
- treat the RB-011 result as authoritative for line identity, created/reused counts, idempotence, and course revision;
- validate generated output through a dedicated `@chess-trainer/contracts/ai` schema;
- reject invented moves, branches, conflicts, destinations, counts, revisions, or statements that unapplied work was written;
- separate factual result fields from optional interpretation/study suggestions in the response contract.

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

## Suggested output shape

A bounded response may contain:

- one factual summary sentence using reconciled identifiers/counts;
- up to three coverage or branch highlights tied to supplied branch/path IDs;
- up to three study-checklist items explicitly labelled as generated suggestions;
- one unresolved/excluded-work note when applicable;
- one warning when the result is idempotent or context is incomplete.

The model must not claim that deferred, ignored, stale, conflicting, or omitted work was applied.

## Acceptance criteria

- AI disabled leaves course preview/apply and result rendering unchanged.
- AI enabled exposes one explicit request only after an apply result exists.
- No provider call occurs during destination selection, preview, target selection, or apply.
- Generated output cannot alter preview token, selected target, apply eligibility, destination, line identity, course revision, result counts, course content, or navigation.
- Unsupported branch/path/destination/count/revision references fail validation or are replaced by authoritative values.
- Provider failure leaves the authoritative result and close/navigation controls usable.
- Output clears on dialog close, new draft, or new result.
- Tests demonstrate unchanged `RepertoireBuilderCourseStore` state and unchanged applied result before and after summary requests.
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
- direct assertion that course-store state and applied course data are unchanged.

## Dependency and queue decision

RB-020 is a stretch goal downstream of RB-015. It should not delay the deterministic builder roadmap or RB-016 outcome measurement.

It becomes `READY` only after RB-015 is accepted with this post-apply boundary and no higher-priority review/closure work needs the same files.

## Completion

Report: none

Completed at: none
