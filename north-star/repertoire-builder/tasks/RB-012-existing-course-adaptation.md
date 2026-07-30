# RB-012 — Enter builder from existing-course findings

Status: DONE

Priority: P2

Order: 130

Delivery class: Dual-use

Planning maturity: Accepted and integrated

GitHub issue: `#100` — closed as completed

Integrated Course endings PR: `#205`

Integrated Opponent gaps PR: `#208`

Course endings squash merge: `c2266c9a8ffca00696da264abb3476f36ec82b50`

Opponent gaps squash merge: `1583b153a2bc674c649b2500769be997a8f4474e`

Final Opponent gaps review-package head: `d542a9bf084d3738adfaddcfa5be5c95683591e2`

Final Opponent gaps CI: run `30517656919` / CI #1597 — success

Completed at: 2026-07-30

## Accepted outcome

Existing-course maintenance findings can launch the same explainable repertoire-builder workflow at an exact source position while preserving evidence, consequence and destination.

RB-012 closes with the two unambiguous coverage-extension entry points:

- Course endings with a common continuation;
- Opponent gaps inside an existing course line.

Both reuse the integrated RB-006 target, RB-007 candidate, RB-009 session, RB-010 workbench and RB-011 preview/apply boundaries. Neither introduces a second recommendation engine or course writer.

## Integrated Course endings slice

Squash-merged PR #205 provides:

- one **Extend this line in builder** action per exact line/node reference;
- bounded source course, chapter, line, node, position, observed continuation, evidence and filter context;
- canonical full-FEN expansion and exact-position RB-009 start;
- initial RB-007 inclusion of the observed continuation;
- fixed source repertoire side with editable target controls;
- visible source evidence and explicit extend-only consequence;
- restored Course endings mode, filters and minimum-games threshold on return;
- RB-011 preview/apply locked to the exact originating line/node;
- safe stale-source behavior.

Implementation report: `../reports/RB-012-2026-07-29-course-ending-entry.md`

First-slice closure report: `../reports/RB-012-2026-07-29-course-ending-closure.md`

## Integrated Opponent gaps slice

Squash-merged PR #208 provides:

- exact API-side `LINE_START` and `NODE` anchors at the pre-gap position through the existing reintegration planner;
- one **Cover this gap in builder** action per exact line/anchor match;
- explicit `COVER_OPPONENT_GAP` launch intent;
- pre-gap RB-009 start and initial RB-007 inclusion of the observed opponent move;
- fixed source repertoire side with editable speed, population, persona, theory and coverage;
- source evidence, applied-filter summary and minimum-overlap provenance;
- restored Opponent gaps mode, filters and overlap threshold on return;
- RB-011 preview/apply locked to the selected course, chapter, line and exact anchor;
- safe stale-source behavior;
- preserved My deviations behavior without an ambiguous builder action.

Implementation report: `../reports/RB-012-2026-07-30-opponent-gaps-entry.md`

Task closure report: `../reports/RB-012-2026-07-30-closure.md`

## Validation accepted

Course endings final review-package CI #1541 and Opponent gaps final review-package CI #1597 passed:

- lint;
- domain, contracts, API, web and mobile builds;
- both opening-classification audits;
- architecture guardrails;
- database migrations;
- the complete repository test suite.

Focused coverage includes launch validation, exact-FEN starts, observed-move inclusion, deterministic line-start/node projection, applied-filter provenance, return-scope restoration, exact destination locking and safe stale-source behavior.

The user explicitly approved squash-merging PR #208 and wrapping up RB-012 on 2026-07-30.

## Accepted boundary

RB-012 does not turn My deviations into a builder action. That finding has materially different consequences:

- replace the current repertoire choice;
- add an alternate line;
- keep the course unchanged and train adherence.

Those choices must not be treated as equivalent or hidden behind a generic launch. Any future My deviations, weak-choice or profile-driven adaptation must be proposed as a new task and GitHub issue with explicit consequence semantics. It is not residual work required to complete RB-012.

Course endings and Opponent gaps remain the inspectable source and recalculation surfaces. They are not retired by this task.

## Architectural boundary

RB-012 adds no Prisma model, migration, new API route, durable builder persistence, worker, background job, automatic course write or second recommendation engine.

Route-local builder state is still lost on refresh. RB-011 remains the authoritative ownership, conflict, staleness, course-revision and transactional-write boundary.
