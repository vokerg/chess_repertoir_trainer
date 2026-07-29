# RB-011 — Preview and apply builder output to courses

Status: READY

Priority: P1

Order: 120

Delivery class: Dual-use

Planning maturity: Outlined

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

## Outcome

Allow a reviewed builder draft to become trainable course material safely through mandatory preview and explicit apply operations.

Supported outcomes should be chosen from inspected architecture and may include:

- create a new course, chapter or line;
- create a new line in an existing chapter;
- merge at an existing line anchor;
- reuse existing nodes or transpositions;
- reject or resolve conflicts;
- retain deferred builder branches outside the written tree.

## Why this task exists

The integrated RB-010 builder now produces a bounded, owner-scoped structural draft preview. The repository already has analysis-tree preview/reintegration and move-node transaction patterns, but they must be reinspected and adapted rather than duplicated blindly.

## Current repo anchors to inspect at claim time

- integrated RB-010 `/builder` feature, store and structural preview;
- RB-009 builder-session tree, decision history, branch statuses and transpositions;
- `analysis-reintegration.service.ts` and its schemas/routes;
- course, chapter, line and move-node services/repositories;
- course content revision and derived-data invalidation;
- line editor and course import/export;
- ownership, conflict, rollback and idempotency tests.

## Dependencies

Ready after accepted and squash-merged RB-010 implementation PR #184 (`ea5b2bef4cdc0fa37024213b2e00b9da589b9718`).

The claim must inspect the current reintegration and course-write implementation before selecting exact endpoints, schemas and orchestration boundaries.

RB-012 depends on safe course application.

## In scope

- define the stable builder-preview-to-course-write boundary from the integrated RB-010 output;
- map or adapt the builder draft tree to a reviewed course-write shape;
- preview created, reused, skipped and conflicting moves;
- choose target course/chapter/line or an approved new-course structure;
- validate ownership and stale anchors;
- preserve the one-correct-trained-side-move rule;
- handle transpositions and duplicates according to existing domain rules;
- apply changes transactionally;
- increment content revision and update derived data according to current verified patterns;
- return explicit created/reused/skipped/conflicted counts and target references;
- keep deferred and ignored draft decisions outside the written course;
- add focused conflict, ownership, rollback and idempotency tests;
- add the minimal Angular preview/apply interaction that fits current course and builder patterns.

## Out of scope

- automatic application without preview;
- silent replacement of an existing trained-side move;
- generated chapter names without review;
- training scheduling;
- existing-course finding entry points, owned by RB-012;
- durable builder-draft persistence unless a separate reviewed requirement is demonstrated;
- LLM-authored course content.

## Open questions to resolve during claim

- Can the existing analysis merge tree represent all accepted RB-010/RB-009 decision states?
- Does creating a full course require a new orchestration service above existing line operations?
- How are multiple chapters organized and named for review?
- How are stale drafts detected against course content revision?
- Can transposition reuse span separate lines without violating current model assumptions?
- What happens to the route-local builder draft after successful or partial application?
- Is preview/apply idempotent?
- Which target/session metadata belongs on the resulting course?

## Acceptance criteria

- Preview is mandatory before apply.
- No write occurs when ownership, anchor or target validation fails.
- Conflicting trained-side moves are visible and never silently replaced.
- Apply is transactional and leaves no partial tree on failure.
- Existing nodes are reused where correct.
- Content revisions and derived data follow current verified patterns.
- Result counts and target references are explicit.
- Deferred branches remain identifiable in the builder draft and are excluded from writes.
- Repeated apply is safe and tested.
- Tests cover new line, merge, reuse, conflict, stale anchor, unauthorized target, rollback and repeated apply behavior.

## Required validation

- API/domain builds and focused tests;
- Prisma transaction/migration tests only if a justified schema change is introduced;
- architecture checks;
- web tests for preview/apply interaction;
- manual review of one created and one merged course tree.

## Completion updates

The report must state whether reintegration was reused, extended or replaced and why, plus any model limitations affecting RB-012 or future whole-course generation.

## Completion

Report: none

Completed at: none
