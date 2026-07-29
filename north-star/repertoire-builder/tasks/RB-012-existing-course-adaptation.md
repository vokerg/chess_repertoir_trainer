# RB-012 — Enter builder from existing-course findings

Status: READY

Priority: P2

Order: 130

Delivery class: Dual-use

Planning maturity: First slice integrated; next slice defined

GitHub issue: `#100`

First implementation branch: `rb-012/issue-100-course-ending-entry`

First implementation PR: `#205`

Final first-slice review head: `45851192b77327e23546eb691d3629c3a193144d`

Final first-slice CI: run `30485910525` / CI #1541 — success

First-slice squash merge: `c2266c9a8ffca00696da264abb3476f36ec82b50`

First slice integrated at: 2026-07-29

## Outcome

Use existing course findings to launch the same explainable repertoire-builder workflow at a precise position and with an explicit consequence.

Potential entry points include:

- uncovered opponent response;
- course ending with common continuation;
- repeated user deviation;
- weak or unsuitable repertoire choice;
- adaptation to another speed/rating target;
- creation of an alternate persona.

Each entry point must preserve source evidence, avoid implicit destination or consequence choices, and reuse the integrated RB-006 target, RB-007 candidate, RB-009 session, RB-010 workbench and RB-011 preview/apply boundaries.

## Integrated first slice — Course endings

Squash-merged PR #205 delivers Course review → Course endings → exact existing line in Builder.

The integrated behavior:

- exposes one line-specific **Extend this line in builder** action per exact line/node reference;
- carries source course, chapter, line, terminal node, normalized position, observed continuation, evidence, filters and return scope into `/builder`;
- accepts and canonicalizes the four-field normalized FEN emitted by Course endings;
- records `COURSE_POSITION` in the RB-006 target;
- starts RB-009 at the exact terminal position;
- includes the observed continuation in the first RB-007 candidate request;
- fixes repertoire side from the source course while keeping speed, population, persona, theory and coverage editable;
- keeps source evidence and the extend-only consequence visible;
- restores Course endings mode, filters and minimum-games threshold on return;
- constrains RB-011 preview/apply to the exact source course/chapter/line/node;
- fails safely when the source endpoint is stale or absent;
- introduces no API route, Prisma model, migration, persistence layer, worker or second recommendation engine.

Implementation report: `../reports/RB-012-2026-07-29-course-ending-entry.md`

Closure report: `../reports/RB-012-2026-07-29-course-ending-closure.md`

## Validation

CI #1541 passed:

- lint;
- domain, contracts, API, web and mobile builds;
- both opening-classification audits;
- architecture guardrails;
- database migrations;
- complete repository tests.

Focused coverage includes launch parsing, malformed context, four-field FEN normalization, filter restoration, course-position target construction, exact-FEN session start, observed-move inclusion, exact destination locking, rejection of alternative targets and safe stale-source behavior.

Manual populated-browser review was not performed through the connector. Real-data checks of the complete loop, responsive readability and keyboard traversal remain useful post-merge validation rather than blockers for the integrated slice.

## Next slice — Opponent gaps

Opponent gaps is the next recommended entry point because its primary consequence remains coverage extension.

The next implementation should:

- inspect the current Opponent gaps finding contract and exact in-line anchor evidence;
- emit an explicit coverage-extension launch rather than a replacement intent;
- reuse the existing validated launch payload where possible;
- start the same builder at the exact finding position;
- preserve observed opponent move, game evidence and source filters;
- constrain course apply to the originating course line and reviewed anchor;
- preserve current Course review actions and source report behavior;
- add focused route, mapping, store, destination and stale-anchor tests;
- avoid persistence, automatic replacement and a second recommendation engine.

## Later slices

My deviations must not be integrated until the UI explicitly distinguishes:

- replacing the repertoire choice;
- adding an alternate line;
- keeping the current course and training adherence.

Weak-choice and profile-driven adaptation should remain downstream of accepted RB-004/RB-005/RB-013 profile semantics.

## Queue decision

RB-012 remains the same immutable task and GitHub issue. Later finding types are separate reviewable slices under #100; no duplicate issue is created.

Task order and priority remain unchanged.

Course endings remains available as the inspectable source and recalculation surface. It should not be retired until multiple finding types demonstrate equivalent maintenance value through the builder.
