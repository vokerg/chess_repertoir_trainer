# RB-011 builder course reintegration review report

Date: 2026-07-29

Status: implemented for review

Task: RB-011

GitHub issue: #99

Claim pull request: #187

Implementation pull request: #189

Implementation branch: `rb-011/issue-99-course-reintegration`

Final tested implementation head: `fa0bda406404a85138acb4c9cbf0ea5b79d6e13e`

Final implementation-head CI: run `30472169134` / CI #1479 — success

## Purpose

Turn one completed RB-010/RB-009 builder session into reviewed, trainable course material without introducing a parallel course writer or automatic apply path.

The implementation adds a stable builder-specific preview/apply boundary around the repository's existing course reintegration planner, transactional move-node writer, ownership checks and course content revision behavior.

## Delivered behavior

### Completed builder draft projection

`buildBuilderCourseDraft` projects only a completed, owner-scoped builder session into the storage-neutral analysis merge tree already consumed by course reintegration.

The projection:

- retains session, target and revision provenance;
- includes resolved accepted/completed paths;
- excludes pending, deferred, ignored, stale and ancestor-excluded branches from writes;
- returns those exclusions explicitly in the draft;
- stops traversal at recognized transposition leaves and reports their count;
- rejects active sessions and completed sessions with no materializable move.

No builder-session persistence or second lifecycle model is added.

### Mandatory preview

The Angular builder exposes **Review course output** only for a completed session. The review dialog requires the user to choose:

- one owned existing course;
- one owned existing chapter;
- a reviewed new-line name.

Preview is a separate authenticated operation. It returns:

- the selected course, chapter and current course content revision;
- the materializable draft summary and skipped branch count;
- a reviewed new-line outcome;
- eligible existing-line anchors;
- created, reused, skipped and conflicting move counts;
- explicit conflicts, warnings and preview trees;
- a deterministic SHA-256 preview token.

The UI does not expose apply before a successful preview and explicit target selection.

### Explicit transactional apply

Apply recomputes the preview inside the same Prisma transaction used for the write. The submitted token must match the exact current preview, including:

- authenticated user;
- chapter;
- reviewed new-line name;
- complete builder draft and provenance;
- candidate/preview result;
- current course content revision.

Any changed draft, destination state, line anchor, line name or course revision therefore requires a new preview.

The builder flow never enables the existing low-level `allowConflicts` escape hatch. A conflicting trained-side move is visible in preview and rejected with no write.

### Create, merge and reuse outcomes

The reviewed target can be:

- a new line in the selected existing chapter; or
- one exact conflict-free existing-line anchor returned by preview.

The existing reintegration writer then:

- creates missing move nodes;
- reuses matching nodes under the selected parent;
- preserves legal-move and trained-side invariants through existing course services;
- increments the owning course content revision only when content changes;
- leaves the transaction with no partial tree if any operation fails.

A same-name, same-side, same-root, fully equivalent line is detected before creating a duplicate. A fresh repeated preview/apply returns an explicit idempotent reuse result. An old preview token is rejected after a revision-changing write.

### Angular architecture

The feature extends the existing page-scoped builder composition with:

- one feature-local `RepertoireBuilderCourseStore`;
- typed HTTP methods on the existing builder API service;
- one standalone OnPush review dialog;
- private writable signals with readonly/computed exposure;
- request-version guards for destination and preview races;
- preview invalidation whenever course, chapter or reviewed line name changes;
- explicit loading, error, result and disabled states;
- responsive single-column behavior at existing repository breakpoints.

No application-global builder/course state is introduced.

### OpenAPI

The two Fastify routes define stable operation IDs, tags, summaries, path parameters, request bodies and response schemas directly from shared Zod contracts. The repository generates OpenAPI dynamically, so no generated OpenAPI artifact is committed.

Operations:

- `POST /api/chapters/{chapterId}/builder-course-reintegration/preview`
- `POST /api/chapters/{chapterId}/builder-course-reintegration/apply`

## Architecture decision

### Reused and extended, not replaced

RB-011 reuses the existing `analysis-reintegration.service.ts` transaction and move-node application logic. It does not create a second course-writing implementation.

The added builder service is an adapter responsible for:

- validating builder ownership and completed-draft provenance;
- preparing builder-specific preview summaries and eligible targets;
- binding apply to the exact reviewed state;
- enforcing the stricter no-conflict builder policy;
- mapping existing writer results into the versioned builder response contract.

This keeps course ownership, anchor validation, legal move checks, trained-side conflict semantics, move-node creation and content revision behavior in their existing owning module.

No Prisma model, migration, queue, worker or background job is added.

## Resolved task questions

- **Can the existing analysis merge tree represent accepted builder output?** Yes, for resolved accepted paths. Deferred or unresolved work remains explicit but excluded.
- **Does full-course creation require new orchestration?** Yes. This MVP deliberately targets an existing owned chapter and does not add course/chapter creation orchestration.
- **How are chapters organized and named?** The user chooses an existing owned course and chapter. Only the new line name is reviewed in this flow.
- **How are stale drafts detected?** The preview fingerprint includes the full draft/provenance and current course revision; apply recomputes it transactionally.
- **Can transposition reuse span separate lines?** Existing course-wide preview/conflict evidence is reused, but the persisted model remains line-tree based. RB-011 does not create shared cross-line graph nodes.
- **What happens to the route-local draft after apply?** It remains available on the current route and the dialog shows the explicit result. Refresh behavior remains the accepted RB-010 route-local reset.
- **Is preview/apply idempotent?** Yes. Stale old tokens are rejected; a fresh repeat recognizes equivalent new lines or zero-create existing-line merges without changing the revision.
- **Which builder metadata is persisted on the course?** None in v1. Session/target provenance is validated and returned at the boundary but no new course metadata schema is introduced.

## Validation

Final tested implementation head `fa0bda406404a85138acb4c9cbf0ea5b79d6e13e` passed CI run `30472169134` / #1479:

- root lint;
- domain, contracts, API, web and mobile builds;
- generated and imported-game opening-classification audits;
- architecture guardrails;
- database migrations;
- complete repository tests.

Focused coverage includes:

- completed-session draft projection and unresolved-branch exclusion;
- contract validation and draft/tree count consistency;
- route authentication, validation and stale-preview errors;
- new-line creation;
- existing-line merge and node reuse;
- equivalent-line and repeated-apply idempotency;
- ownership and unauthorized destination rejection;
- conflict preview and no-write rejection;
- stale target/preview rejection;
- transaction rollback;
- course content revision changes only on writes;
- Angular destination/preview/apply state;
- preview invalidation after destination detail changes;
- rendered counts, exact target emission and explicit apply intent.

## Validation not completed in this environment

The GitHub connector does not provide an authenticated populated browser runtime. The required hands-on review remains:

- create one line in a real owned chapter and inspect the resulting course tree;
- merge one draft into a real existing line and inspect reused/new nodes;
- review dialog readability at desktop and mobile widths;
- keyboard traversal and focus behavior through the complete dialog;
- confirm the existing-course/chapter-only organization is sufficient for the first materialization slice.

These are review gates, not claims of completed validation.

## Acceptance mapping

- Preview is mandatory before apply. — Implemented in API and UI.
- Invalid ownership, anchor or target causes no write. — Implemented and tested.
- Conflicts are visible and never silently replaced. — Implemented and tested.
- Apply is transactional. — Existing transaction reused; rollback tested.
- Existing nodes are reused. — Implemented and tested.
- Course content revision follows existing behavior. — Implemented and tested.
- Counts and target references are explicit. — Versioned contract and UI result implemented.
- Deferred branches remain identifiable and excluded. — Projection and contract tested.
- Repeated apply is safe. — Stale-token and fresh-repeat behavior tested.

## Model limitations and downstream impact

RB-011 intentionally does not provide:

- creation of a whole course or chapter hierarchy;
- persisted builder-session or target metadata on courses;
- shared graph nodes across separate course lines;
- conflict resolution or trained-side move replacement;
- automatic apply;
- entry from existing-course findings.

RB-012 can reuse the same completed-draft projection and preview/apply endpoints after RB-011 is accepted and integrated. It must still define how gaps, endings, deviations and weak-choice findings seed or constrain the builder session.

## Queue impact

RB-011 moves to `REVIEW` through PR #189. RB-012 remains `BLOCKED` until this safe preview/apply boundary is accepted and integrated.

No new task, priority change, persistence work or roadmap resequencing is proposed.

## GitHub state

- Issue: #99, open for review.
- Claim PR: #187.
- Implementation PR: #189.
- Repository task state after synchronization: `REVIEW`.

## Completion decision

RB-011 is implemented for review, not complete. Automated acceptance and architecture validation pass, while populated browser review and inspection of one created and one merged real course tree remain user gates before merge, `DONE`, or RB-012 readiness.
