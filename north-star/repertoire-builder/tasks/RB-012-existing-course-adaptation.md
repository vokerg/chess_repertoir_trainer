# RB-012 — Enter builder from existing-course findings

Status: REVIEW

Priority: P2

Order: 130

Delivery class: Dual-use

Planning maturity: Two finding slices implemented; second slice in review

GitHub issue: `#100`

Current implementation branch: `rb-012/issue-100-opponent-gaps-entry`

Current implementation PR: `#208`

Final tested Opponent gaps implementation head before review-package documentation: `fafeeba20be64766ad0f269546e1dc89010de03d`

Opponent gaps implementation CI: run `30516865329` / CI #1586 — success

Review state entered at: 2026-07-30

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

## Integrated first-slice validation

CI #1541 passed lint, all builds, both opening audits, architecture guardrails, migrations and complete repository tests.

Focused coverage includes launch parsing, malformed context, four-field FEN normalization, filter restoration, course-position target construction, exact-FEN session start, observed-move inclusion, exact destination locking, rejection of alternative targets and safe stale-source behavior.

## Implemented second slice — Opponent gaps

PR #208 implements Course review → Opponent gaps → exact existing line anchor in Builder.

The review implementation:

- derives exact source anchors at the pre-gap position through the existing chess-domain reintegration planner;
- supports both `LINE_START` and `NODE` anchors;
- preserves distinct actions when a position maps to multiple lines or occurrences;
- renders one **Cover this gap in builder** action per exact source anchor;
- retains the displayed post-move board while launching the builder from the pre-gap FEN;
- generalizes the bounded Course-finding launch payload with explicit `COVER_OPPONENT_GAP` intent;
- records `COURSE_POSITION` and starts RB-009 before the observed opponent move;
- includes that move in the initial RB-007 candidate request;
- fixes source repertoire side while preserving editable speed, population, persona, theory and coverage;
- keeps source evidence, minimum overlap and the coverage-extension consequence visible;
- restores Opponent gaps mode, applied filters and overlap threshold on return;
- locks RB-011 to the selected course, chapter, line and exact `LINE_START`/`NODE` anchor;
- fails safely when preview no longer returns the source endpoint;
- preserves My deviations without a builder action;
- adds no Prisma model, migration, new API route, persistence layer, worker, course-writer change or second recommendation engine.

Implementation report: `../reports/RB-012-2026-07-30-opponent-gaps-entry.md`

## Second-slice validation

CI #1586 passed:

- lint;
- domain, contracts, API, web and mobile builds;
- both opening-classification audits;
- architecture guardrails;
- database migrations;
- complete repository tests.

Focused coverage includes deterministic line-start/node anchor projection, pre-gap finding mapping, route round-trips, malformed anchor rejection, source-specific return scope, overlap restoration, exact line-start destination locking and safe exact-target absence.

Manual populated-browser review remains required for a real line-start gap, in-line gap, shared-position choices, initial observed-move inclusion, exact apply, stale anchors, responsive readability and keyboard traversal.

## Later slices

My deviations must not be integrated until the UI explicitly distinguishes:

- replacing the repertoire choice;
- adding an alternate line;
- keeping the current course and training adherence.

Weak-choice and profile-driven adaptation should remain downstream of accepted RB-004/RB-005/RB-013 profile semantics.

## Queue decision

RB-012 remains the same immutable task and GitHub issue. Later finding types are separate reviewable slices under #100; no duplicate issue is created.

Task order and priority remain unchanged.

Course endings and Opponent gaps remain available as inspectable source/recalculation surfaces. They should not be retired until the integrated builder demonstrates equivalent maintenance value through accepted product use.
