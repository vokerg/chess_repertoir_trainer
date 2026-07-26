# RB-011 — Preview and apply builder output to courses

Status: BLOCKED

Priority: P1

Order: 120

Delivery class: Dual-use

Planning maturity: Outlined

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

## Outcome

Allow a reviewed builder draft to become trainable course material safely through preview and explicit apply operations.

Supported outcomes should be chosen from inspected architecture and may include:

- create a new course/chapter/line;
- create a new line in an existing chapter;
- merge at an existing line anchor;
- reuse existing nodes/transpositions;
- reject or resolve conflicts;
- retain deferred builder branches outside the written tree.

## Why this task exists

The builder creates value only when accepted choices can become course material. The repository already has analysis-tree preview/reintegration and move-node transaction patterns, but they must be reinspected and adapted rather than duplicated blindly.

## Current repo anchors to inspect

- `analysis-reintegration.service.ts` and schemas/routes;
- course, chapter, line, move-node services/repositories;
- course content revision and derived-data invalidation;
- line editor and course import/export;
- RB-009 draft tree and RB-010 preview output;
- ownership and conflict tests.

## Dependencies

Blocked on RB-010 and a stable draft preview tree.

Must inspect current reintegration implementation at claim time.

RB-012 depends on safe course application.

## In scope

- map or adapt builder draft tree to a reviewed course-write shape;
- preview created/reused/conflicting moves;
- choose target course/chapter/line or approved new-course structure;
- validate ownership and stale anchors;
- preserve one correct trained-side move rule;
- handle transpositions and duplicates according to existing domain rules;
- apply changes transactionally;
- increment content revision and update derived data as current architecture requires;
- return an explicit result with created/reused/skipped/conflicted counts;
- keep deferred/ignored draft decisions outside the written course while preserving them in the builder draft when applicable;
- add focused conflict, ownership, rollback, and idempotency tests.

## Out of scope

- automatic application without preview;
- silent replacement of an existing trained-side move;
- generated chapter names without review;
- training scheduling;
- existing-course finding entry points, owned by RB-012;
- LLM-authored course content.

## Open questions to resolve

- Can the existing analysis merge tree represent all builder decision states?
- Does creating a full course require a new orchestration service above existing line operations?
- How are multiple chapters organized?
- How are stale drafts detected against course content revision?
- Can a transposition reuse coverage across separate lines without violating current model assumptions?
- What happens to a builder draft after partial application?
- Is apply idempotent?

## Acceptance criteria

- Preview is mandatory before apply.
- No write occurs when ownership, anchor, or target validation fails.
- Conflicting trained-side moves are visible and never silently replaced.
- Apply is transactional and leaves no partial tree on failure.
- Existing nodes are reused where correct.
- Content revisions/derived data follow current verified patterns.
- Result counts and target references are explicit.
- Deferred branches remain identifiable in the draft.
- Tests cover new line, merge, reuse, conflict, stale anchor, unauthorized target, rollback, and repeated apply behavior.

## Required validation

- API/domain builds and focused tests;
- Prisma transaction/migration tests if schema changes;
- architecture checks;
- web tests for preview/apply interaction;
- manual review of a created and merged course tree.

## Completion updates

The report must state whether reintegration was reused, extended, or replaced and why, plus any model limitations affecting RB-012 or future whole-course generation.

## Completion

Report: none

Completed at: none
