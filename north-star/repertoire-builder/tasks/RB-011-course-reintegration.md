# RB-011 — Preview and apply builder output to courses

Status: REVIEW

Priority: P1

Order: 120

Delivery class: Dual-use

Planning maturity: Implemented

Claimed by: OpenAI ChatGPT

Claim branch: `rb-011/issue-99-course-reintegration-claim`

Implementation branch: `rb-011/issue-99-course-reintegration`

Claimed at: 2026-07-29

Claim PR: `#187`

Implementation PR: `#189`

Final tested implementation head: `fa0bda406404a85138acb4c9cbf0ea5b79d6e13e`

Final implementation-head CI: run `30472169134` / CI #1479 — success

Claim scope: Inspect and adapt the current analysis-reintegration and course-write architecture to add mandatory preview and explicit transactional apply for accepted RB-010/RB-009 builder trees. The implementation defines a stable builder-to-course wire boundary, validates ownership and stale anchors, preserves the one-correct-trained-side-move rule, surfaces create/reuse/skip/conflict outcomes, excludes deferred/ignored/stale work, reuses valid existing nodes, increments course content revision through verified existing patterns, provides repeated-apply safety, and adds a minimal feature-local Angular review/apply interaction. The task explicitly excludes automatic apply, existing-course finding entry points, durable builder persistence, LLM-authored content, training scheduling, and unrelated course or builder redesign.

## Outcome

Allow a reviewed builder draft to become trainable course material safely through mandatory preview and explicit apply operations.

The implemented v1 supports:

- selecting one owned existing course and chapter;
- creating a reviewed new line in that chapter;
- merging at one exact existing-line anchor returned by preview;
- reusing existing line nodes;
- detecting a fully equivalent same-name line for idempotent reuse;
- rejecting trained-side conflicts;
- retaining deferred, ignored, pending and stale builder branches outside the written tree.

Whole-course or new-chapter orchestration was not justified for the first safe materialization slice.

## Why this task exists

The integrated RB-010 builder produces a bounded, owner-scoped structural draft preview. The repository already had analysis-tree preview/reintegration and move-node transaction patterns, so RB-011 extends those boundaries instead of creating a second writer.

## Dependencies

Ready after accepted and squash-merged RB-010 implementation PR #184 (`ea5b2bef4cdc0fa37024213b2e00b9da589b9718`).

RB-012 remains blocked until RB-011 is accepted and integrated.

## Implemented scope

- stable completed-builder-draft contract with session and target provenance;
- pure projection from RB-009 session state to the existing analysis merge tree;
- explicit excluded-branch and transposition-leaf summaries;
- authenticated mandatory preview for one owned chapter;
- reviewed new-line and existing-line-anchor targets;
- created, reused, skipped and conflicting counts;
- deterministic preview token bound to draft, user, destination and course revision;
- transactional recomputation and exact-token validation before apply;
- strict no-conflict builder policy;
- reuse of the current analysis reintegration transaction and move-node writer;
- equivalent-line and zero-create repeated-apply safety;
- existing course content revision behavior;
- generated OpenAPI through route schemas and shared Zod contracts;
- feature-local Angular destination, preview, target and apply workflow;
- focused domain, contract, route, database, rollback, idempotency and web tests.

## Out of scope

- automatic application without preview;
- silent replacement of an existing trained-side move;
- generated chapter names without review;
- creation of a whole course or chapter hierarchy;
- training scheduling;
- existing-course finding entry points, owned by RB-012;
- durable builder-draft persistence;
- persisted builder-session or target metadata on courses;
- shared graph nodes across separate course lines;
- LLM-authored course content.

## Architecture decision

RB-011 reuses and extends the existing reintegration architecture.

`analysis-reintegration.service.ts` remains the owner of transaction-aware line and move-node application, legal-move validation, stale-anchor checks, conflict rejection and course content revision changes. The builder-specific adapter owns completed-draft validation, preview binding, stricter no-conflict policy, exact target selection and versioned response mapping.

No Prisma model, migration, queue, worker or background job was introduced.

## Resolved questions

- The existing analysis merge tree represents resolved accepted RB-009 paths. Deferred and unresolved paths are explicit exclusions.
- Full-course creation would require a separate orchestration layer and is not part of this v1.
- Users choose an existing owned course and chapter; only the new line name is authored here.
- Staleness is detected by recomputing a preview fingerprint that includes the full draft and current course content revision inside the apply transaction.
- Cross-line course evidence is reused for preview/conflict detection, but persisted lines remain separate trees.
- The route-local builder draft remains available after apply and is still lost on refresh under the accepted RB-010 boundary.
- Repeated apply is safe: stale old tokens fail, while a fresh repeat returns an idempotent equivalent/reuse result.
- Builder target/session metadata is validated at the boundary but not persisted on course models in v1.

## Acceptance criteria

- Preview is mandatory before apply. — Implemented and tested.
- No write occurs when ownership, anchor or target validation fails. — Implemented and tested.
- Conflicting trained-side moves are visible and never silently replaced. — Implemented and tested.
- Apply is transactional and leaves no partial tree on failure. — Existing transaction reused; rollback tested.
- Existing nodes are reused where correct. — Implemented and tested.
- Content revisions and derived data follow current verified patterns. — Existing revision path reused and tested; no new derived-data path was required.
- Result counts and target references are explicit. — Implemented in versioned contracts and UI.
- Deferred branches remain identifiable in the builder draft and are excluded from writes. — Implemented and tested.
- Repeated apply is safe and tested. — Implemented and tested.
- Tests cover new line, merge, reuse, conflict, stale preview/anchor, unauthorized target, rollback and repeated apply behavior. — Covered.

## Validation

Final tested implementation head `fa0bda406404a85138acb4c9cbf0ea5b79d6e13e` passed CI run `30472169134` / #1479:

- root lint;
- domain, contracts, API, web and mobile builds;
- opening-classification audits;
- architecture guardrails;
- database migrations;
- complete repository tests.

Focused tests cover draft projection, contract invariants, route validation, new-line creation, existing-line merge/reuse, conflict rejection, ownership, stale preview/target, rollback, content revision, repeated apply and Angular preview/apply behavior.

Manual review still required before integration:

- inspect one created line in a real owned course tree;
- inspect one merged line with reused and created nodes;
- review desktop/mobile readability;
- review keyboard traversal and focus behavior;
- accept the existing-course/chapter-only organization for the first slice.

## Completion updates

The implementation report records that reintegration was reused and extended rather than replaced, plus the line-tree and existing-chapter limitations affecting RB-012 and future whole-course generation.

## Completion

Implementation report: `../reports/RB-011-2026-07-29-course-reintegration.md`

Review state entered at: 2026-07-29

Completed at: none
