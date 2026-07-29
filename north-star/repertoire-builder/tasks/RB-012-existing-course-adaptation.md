# RB-012 — Enter builder from existing-course findings

Status: REVIEW

Priority: P2

Order: 130

Delivery class: Dual-use

Planning maturity: Implemented first slice

Claimed by: OpenAI ChatGPT

Implementation branch: `rb-012/issue-100-course-ending-entry`

Implementation PR: `#205`

Claimed at: 2026-07-29

Implementation head before review-package documentation: `f77e11c88bd48b6b845954d2ef9dc67fe6d050dd`

Implementation scope: Deliver the smallest unambiguous existing-course entry point by connecting Course review → Course endings to the integrated RB-010/RB-011 builder workflow. The slice carries the exact course, chapter, line, terminal node, position, observed opponent continuation, source evidence, applied filters, and return location into `/builder`; starts the existing builder at that position while preserving editable speed/rating/persona setup; makes the source evidence and extend-only consequence explicit; guarantees the observed continuation can be inspected; and binds course apply back to the exact source line/node through the existing mandatory preview/apply boundary. It includes route/helper/store/component and focused integration tests, stale-anchor handling, and program-state reconciliation. It excludes other finding types, automatic replacement, whole-course retargeting, traps, durable builder persistence, and a second recommendation engine.

## Outcome

Use current course evidence to launch the same repertoire-builder workflow at a precise position and intent.

Initial entry points may include:

- uncovered opponent response;
- course ending with common continuation;
- repeated user deviation;
- weak or unsuitable repertoire choice;
- adaptation to another speed/rating target;
- creation of an alternate persona.

## Implemented first slice

Course endings are the first integration because the current finding already carries the least ambiguous launch context:

- exact terminal normalized FEN;
- course, chapter, line, and terminal node references;
- the observed opponent move and game count;
- concrete game examples;
- the applied game filters and minimum-games threshold;
- a clear `EXTEND_EXISTING_LINE` consequence.

When one finding maps to multiple terminal lines, the user chooses the exact line-specific **Extend this line in builder** action. This avoids silently selecting an anchor.

The implementation:

- retains exact source line/node and line-specific course path;
- validates a bounded builder launch payload;
- accepts and canonicalizes the four-field normalized FEN emitted by Course endings;
- records `COURSE_POSITION` in the RB-006 target;
- starts RB-009 at the exact terminal FEN;
- includes the observed continuation in the first RB-007 request;
- fixes the source course side while preserving editable speed, population, persona, theory and coverage;
- keeps source evidence, filters and extend-only intent visible;
- restores Course endings mode, filters and threshold on return;
- preselects and locks RB-011 to the exact source course/chapter/line/node;
- enables apply only when preview returns that exact conflict-free endpoint;
- fails safely when the source endpoint is stale or absent.

## Why this task exists

The application already detects several relationships between real games and courses. The north star should not abandon those features or build a second maintenance system. Findings should become actionable decisions inside the same visual, explainable builder.

## Current repo anchors reused

- unified Course review page, mode tabs, store, finding mapper, issue cards, and Course endings API;
- versioned Course extension candidate contracts;
- imported-game route query codec and filter model;
- RB-010 builder setup, target construction, route-local store, candidate inclusion, and page actions;
- RB-009 arbitrary-FEN session start and role derivation;
- RB-011 destination preview/apply store, exact anchors, stale preview protection, and transaction boundary.

## Dependencies

RB-010 was squash-merged through PR #184.

RB-011 was squash-merged through PR #189 as `01b36f9503ccfbb3dced55d56589b89cfd163867`, issue #99 is closed, and the course-write dependency is satisfied.

Later entry-point types remain separate reviewable slices.

## In scope

- Course endings as the first real finding type;
- a typed, validated frontend builder-launch payload with source kind, course, chapter, line/node anchor, starting FEN, observed move, evidence summary, applied filters, suggested intent, and return URL;
- line-specific launch actions where one finding references multiple lines;
- editable target speed, rating population, persona, theory, and coverage through the existing setup dialog;
- source-side locking because the exact course endpoint fixes repertoire side;
- builder session start at the terminal FEN using the existing RB-009 role semantics;
- visible source evidence and explicit `EXTEND_EXISTING_LINE` consequence;
- guaranteed inclusion of the observed continuation in the initial candidate request where legal;
- exact source course/chapter/line/node preselection for RB-011 preview/apply;
- no alternative apply target when launched with extend-only intent;
- navigation back to the originating Course endings view with restored filters and threshold;
- stale or no-longer-matching anchor feedback through the existing preview/apply behavior;
- route/helper/store/component and focused integration tests;
- RB-011 completion and RB-012 queue/status reconciliation.

## Out of scope

- integrating My deviations or Opponent gaps in this slice;
- migrating every lab and struggle feature at once;
- deleting existing reports before the new workflow proves equivalent value;
- automatic replacement of course moves;
- replace-current-move or create-alternate-course workflows;
- whole-course retargeting;
- traps mode;
- durable builder persistence;
- LLM explanation requirement.

## Resolved questions for the first slice

- **Highest-value, least-ambiguous entry point:** Course endings.
- **Suggested intent:** extend one exact existing line at its terminal node.
- **Coverage threshold transfer:** preserve `minGames` and the complete applied game-filter summary as source evidence; do not convert it into a new target scoring formula.
- **Original filters:** serialize bounded applied filters into the launch payload and restore them on return to Course endings.
- **Finding resolution:** successful apply does not persistently resolve or suppress the computed finding in v1; re-running Course endings naturally reflects the changed course tree.
- **New line versus merge:** this entry point is merge-only. Other consequences require later explicit entry-point work.
- **Repertoire side:** fixed from the source course endpoint; other target settings remain editable.

## Acceptance criteria

- At least one real Course ending launches the builder at the exact terminal position and source course context. — Implemented; browser verification pending.
- A finding with multiple line references offers distinct line-specific launch actions. — Implemented.
- The original finding evidence, observed continuation, threshold, and filter summary are visible in the builder. — Implemented.
- The user can modify suggested target speed/rating/persona/theory/coverage before starting. — Implemented; source side intentionally fixed.
- The builder target records a course-position starting point and the session starts at the supplied FEN. — Implemented and tested.
- The observed continuation is requested as an included candidate on the initial branch. — Implemented and tested.
- The workflow is explicitly extend-only; replace and alternate consequences are not presented as equivalent targets. — Implemented.
- Course changes reuse RB-011 mandatory preview/apply and are constrained to the exact source line/node. — Implemented and tested.
- Existing Course review behavior and Analyze position links remain available. — Preserved.
- Navigation back to the source Course endings view restores the original scope. — Implemented and tested.
- Stale or changed source anchors fail safely without partial writes. — Exact-target absence tested; RB-011 transactional checks reused.
- No duplicate recommendation engine or new persistence layer is introduced. — Confirmed.

## Validation

Focused Angular coverage includes:

- launch payload parsing, malformed links and four-field FEN normalization;
- restored Course review filters and threshold;
- course-position target construction;
- exact-FEN session start and observed-move inclusion;
- normal and source-locked course destination state;
- rejection of non-source targets;
- safe exact-target absence;
- dialog destination locking and disabled alternatives.

Complete repository lint, builds, audits, architecture guardrails, migrations and tests are required on the final review-package head before PR #205 leaves draft state.

Manual browser review remains required for the complete Course ending → builder → exact course line loop, responsive readability and keyboard traversal.

## Completion updates

The implementation report recommends Opponent gaps as the next finding type, followed by My deviations only after explicit replace/alternate/keep-course consequence UX is defined. Course endings should not be retired yet because it remains the inspectable source and recalculation surface.

## Completion

Report: `../reports/RB-012-2026-07-29-course-ending-entry.md`

Review state entered at: 2026-07-29

Completed at: none
