# RB-010 — Implement bounded interactive builder MVP

Status: DONE

Priority: P1

Order: 110

Delivery class: North-star

Planning maturity: Implemented

Claimed by: OpenAI ChatGPT

Claim branch: `rb-010/issue-98-interactive-builder-claim`

Implementation branch: `rb-010/issue-98-interactive-builder-mvp`

Closure branch: `rb-010/issue-98-closure`

Claimed at: 2026-07-29

Accepted and integrated at: 2026-07-29

Claim PR: `#182`

Implementation PR: `#184`

Final tested implementation head: `b3a0076bdc75ea8035b3999a8e10a12d24992c6f`

Final implementation-head CI: run `30447177268` / CI #1417 — success

Squash commit: `ea5b2bef4cdc0fa37024213b2e00b9da589b9718`

## Outcome

Deliver the first end-to-end interactive repertoire-building slice in which a user can:

1. start one bounded route-local draft;
2. choose one explicit repertoire side and target;
3. visually compare user-move candidates;
4. select opponent responses to cover;
5. continue through a bounded branch queue;
6. defer, reopen, ignore or stop work;
7. inspect the resulting structural draft tree.

Course preview and writing remain RB-011 work.

## Accepted implementation

### Route and setup

- authenticated lazy `/builder` route;
- top-level **Builder** navigation destination;
- initial-position starts for White or Black;
- one fixed RB-001 speed preset and one rating target;
- all players, factual peer targets or one explicit Lichess benchmark group;
- Balanced, Solid, Aggressive and Surprise target presets;
- explicit theory-burden and 50–100% response-coverage controls;
- route-local lifetime is stated in setup and workbench copy;
- reopening setup explicitly replaces the current draft and can be cancelled.

### Target and candidate evidence

- schema-valid RB-006 targets are created without a second target model;
- factual peer resolution retains `PEER_RESOLUTION` provenance;
- explicit benchmark groups remain manual target choices;
- the existing authenticated `POST /api/candidate-decisions` endpoint remains the sole candidate source;
- manual legal board moves reuse `includeMoveUci`;
- target fit and profile fit remain separate and inspectable;
- missing, stale, insufficient and unavailable sources remain explicit.

### Workbench and session lifecycle

- one primary Chessground board with candidate/resulting-position preview;
- explicit acceptance of one user move or multiple opponent responses;
- opponent coverage shown against the selected target;
- deterministic queue selection and reorder;
- defer/reopen, ignore, stop, stale restart, complete and abandon actions;
- RB-009 owner and optimistic-revision checks on every mutation;
- failed mutations do not advance the queue;
- separate stale-request guards for setup and candidate loads;
- bounded structural tree, queue and paused-work preview.

### Angular architecture

- lazy feature-local page composition;
- standalone OnPush setup and workbench components;
- page-scoped signal store and typed HTTP-only API service;
- private writable state with readonly/computed exposure;
- pure target and view-model helpers;
- no global builder state and no duplicated session reducer.

## Accepted MVP bounds

- one active route-local draft;
- one selected side;
- initial-position starts only;
- at most 6 candidate moves returned per decision;
- at most 24 accepted decisions in the workbench;
- RB-009 hard limits remain 256 branches, 128 queued branches, 8 selected moves and 256 preview nodes;
- no automatic recursive candidate fetching or whole-tree generation.

## Persistence and resume decision

The accepted first MVP adds no Prisma model, builder-session API, browser storage or background job.

Refreshing or recreating the route starts a new draft. This route-local lifetime is accepted for the first integrated builder slice. Durable draft persistence, draft lists, expiry, deletion and cross-device resume require a separate reviewed need; they must not be introduced implicitly inside RB-011.

## Explicit exclusions

- non-initial starting positions;
- arbitrary speed arrays or editable weights;
- course organization, preview or writes;
- existing-course entry points;
- profile-derived setup defaults;
- traps mode;
- LLM behavior;
- collaboration;
- broad opening-analysis or courses redesign.

## Acceptance criteria

- User-choice and opponent-coverage decisions alternate correctly. — Accepted and tested.
- Candidate positions are visual. — Accepted through one primary board.
- Reasons, warnings and source evidence are inspectable. — Accepted.
- RB-001 speed and rating targets produce valid RB-006 target snapshots. — Schema-tested.
- Factual peer evidence and manual target choices remain distinguishable. — Provenance-tested.
- Profile fit remains advisory and can be overridden by target intent. — Accepted.
- Deferred branches remain visible and reopenable. — Tested.
- Draft output is bounded and previewable. — Accepted through RB-009 projection.
- Reload behavior is honest. — Route-local reset is explicit.
- No course changes occur in RB-010. — Met.
- Ownership and validation are enforced. — Tested through RB-009 and contract validation.
- Responsive and keyboard-labelled presentation is implemented. — Automated structure and focused component tests passed; operational browser refinements may continue without reopening RB-010.

## Final validation

Final tested head `b3a0076bdc75ea8035b3999a8e10a12d24992c6f` passed CI run `30447177268` / #1417:

- root lint;
- Angular and API builds;
- opening-classification audit and artifact upload;
- architecture guardrails;
- database migrations;
- imported-game opening-classification audit and artifact upload;
- complete repository tests.

Focused tests cover target validity and provenance, owner-scoped session creation, user-to-opponent progression, deferral/reopen, manual board inclusion, stale-response suppression, setup accessibility/replacement warnings, Builder route activity, and preservation of existing navigation regression coverage.

PR #184 had no review comments or unresolved inline threads at merge time.

## Completion

Implementation report: `../reports/RB-010-2026-07-29-interactive-builder-mvp.md`

Closure report: `../reports/RB-010-2026-07-29-closure.md`

Completed at: 2026-07-29
