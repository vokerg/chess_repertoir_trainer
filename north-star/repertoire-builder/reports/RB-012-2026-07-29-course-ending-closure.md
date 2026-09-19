# RB-012 Course ending entry closure

Date: 2026-07-29

Task: RB-012

GitHub issue: #100

Implementation pull request: #205

Implementation branch: `rb-012/issue-100-course-ending-entry`

Final review-package head: `45851192b77327e23546eb691d3629c3a193144d`

Final CI: run `30485910525` / CI #1541 — success

Squash merge commit: `c2266c9a8ffca00696da264abb3476f36ec82b50`

## Closure decision

The first bounded RB-012 slice, Course review → Course endings → exact existing line in Builder, is accepted and integrated on `main` through squash-merged PR #205.

RB-012 itself remains open because the immutable task and issue cover multiple existing-course finding entry points. The repository state returns to `READY` for the next bounded slice rather than moving the whole task to `DONE`.

## Integrated behavior

- one line-specific **Extend this line in builder** action per Course ending line/node reference;
- bounded route validation for source course, chapter, line, terminal node, FEN, observed continuation, evidence and filters;
- canonical expansion of the four-field Course ending position into a legal full FEN;
- an RB-006 `COURSE_POSITION` target;
- RB-009 session start at the exact terminal position;
- observed continuation inclusion in the first RB-007 candidate request;
- fixed source repertoire side with editable speed, population, persona, theory and coverage;
- visible source evidence and explicit extend-only consequence;
- restoration of Course endings mode, filters and minimum-games threshold on return;
- RB-011 preview/apply constrained to the exact source course/chapter/line/node;
- safe no-match behavior for stale or changed source endpoints;
- no new API route, Prisma model, migration, persistence layer, worker or recommendation engine.

## Validation

CI #1541 passed:

- lint;
- domain, contracts, API, web and mobile builds;
- both opening-classification audits;
- architecture guardrails;
- database migrations;
- complete repository tests.

The PR had no submitted reviews, inline review threads or conversation comments at merge time. The verified head was mergeable and unchanged when squash-merged.

## Manual validation not performed

The GitHub connector does not provide a populated authenticated browser runtime. The following remain useful post-merge product checks rather than merge blockers:

- inspect a real one-line and multi-line Course ending launch;
- verify the exact terminal board position and observed continuation;
- complete and apply a small draft to the exact source endpoint;
- verify restored filters and threshold;
- exercise stale/deleted source behavior;
- review desktop/mobile readability and keyboard traversal.

## Next slice

Opponent gaps is the recommended next RB-012 slice because its consequence remains coverage extension and can reuse the same source-context, launch, session and exact-target architecture.

My deviations should follow only after the UI explicitly distinguishes replacing the repertoire choice, adding an alternate line and keeping the current course while training adherence.

No Course endings report is retired by this merge. It remains the inspectable source and recalculation surface.

## Queue impact

- RB-012 issue #100 remains open.
- Repository state returns to `READY` after integration of the first slice.
- Task order and priority remain unchanged.
- No new RB task or GitHub issue is created for Opponent gaps because the coordination model requires one issue per immutable RB task.
