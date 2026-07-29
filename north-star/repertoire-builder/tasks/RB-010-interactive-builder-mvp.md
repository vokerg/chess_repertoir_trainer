# RB-010 — Implement bounded interactive builder MVP

Status: REVIEW

Priority: P1

Order: 110

Delivery class: North-star

Planning maturity: Implemented

Claimed by: OpenAI ChatGPT

Claim branch: `rb-010/issue-98-interactive-builder-claim`

Implementation branch: `rb-010/issue-98-interactive-builder-mvp`

Claimed at: 2026-07-29

Claim PR: `#182`

Implementation PR: `#184`

Final implementation head: `a44272f238a468879ee588e3f90ef4970d1338a6`

Final implementation-head CI: run `30436890029` / CI #1408 — success

Claim scope: Implement the first authenticated `/builder` Angular feature as a page-scoped, non-persistent routed workbench using the accepted RB-008 board-first composition, integrated RB-006 repertoire targets, the existing authenticated `POST /api/candidate-decisions` endpoint, and the RB-009 pure session reducer. The MVP supports one active build at a time, one selected repertoire side, the initial position only, fixed RB-001 speed presets and rating targets, optional peer-resolution loading for peer targets, four transparent persona presets, 50–100% opponent coverage, at most 6 returned candidates, at most 24 accepted decisions and the existing RB-009 hard session/queue/preview bounds. It includes a focused setup dialog, primary board with candidate switching and board-move selection, inspectable evidence/source states, separate target/profile fit, opponent-response multi-selection, bounded branch queue navigation, defer/reopen/ignore/stop actions, branch/status progress, preview tree, stale/error/no-data handling, responsive and keyboard-accessible presentation, typed feature-local data access/store/helpers/components, route/navigation registration, and focused Angular tests. Refresh intentionally starts a new draft; no Prisma model, API session route, browser storage, course write, profile-derived defaults, traps, LLM behavior, full-tree generation, or broad analysis/courses redesign is included.

## Outcome

Deliver the first end-to-end interactive repertoire-building slice in which a user can:

1. start from a bounded position/line;
2. use an explicit repertoire target;
3. visually compare user-move candidates;
4. select opponent responses to cover;
5. continue through a bounded branch queue;
6. defer work;
7. inspect the resulting draft tree.

Course writing remains RB-011 work and is preview-only at the structural branch level in this task.

## Why this task exists

This is the first direct north-star delivery. It proves that deterministic evidence, visual choices, target intent, and branch-state concepts can form one production workflow before whole-opening generation, course writing or persistence is added.

## Current repo anchors inspected

- accepted RB-008 setup-dialog and routed board-first workbench direction;
- integrated RB-006 repertoire-target schemas, examples and population resolver;
- integrated RB-007 candidate-decision contract, authenticated route and evidence service;
- integrated RB-009 session reducer, queue lifecycle, staleness, transpositions and preview;
- Angular feature-local page/store/data-access/presentational patterns and architecture guide;
- shared Chessground board, page header, panel, route and navigation conventions;
- Lichess Games Explorer peer-resolution API and current authentication signals.

## Dependencies

Completed: integrated RB-007 candidate decisions, accepted RB-008 routed visual direction, and integrated RB-009 builder-session model through squash-merged PR #177.

RB-011 depends on an accepted and integrated RB-010 preview/workbench boundary.

## Delivered scope

### Route and setup

- authenticated lazy `/builder` route;
- top-level Builder navigation destination;
- initial-position starts for White or Black;
- one fixed RB-001 speed preset;
- all players, factual peer targets or one explicit Lichess benchmark group;
- four transparent persona presets;
- explicit theory-burden and 50–100% coverage controls;
- clear route-local persistence warning;
- reopened setup is labelled as replacement and can be cancelled.

### Target and evidence boundary

- schema-valid RB-006 targets created without a second target contract;
- factual peer resolution retained with `PEER_RESOLUTION` provenance;
- explicit rating groups remain manual authoritative target choices;
- existing authenticated `POST /api/candidate-decisions` remains the sole candidate source;
- manual legal board moves reuse `includeMoveUci`;
- target fit and profile fit remain separate and inspectable;
- missing, stale, insufficient and unavailable source states remain visible.

### Workbench and lifecycle

- one primary Chessground board;
- candidate/resulting-position preview without mutating the draft;
- one user move or multiple opponent responses accepted explicitly;
- selected opponent coverage shown against the target;
- deterministic queue navigation and reorder;
- defer/reopen, ignore, stop, stale restart, complete and abandon actions;
- RB-009 owner and optimistic-revision checks on every mutation;
- failed mutations do not advance the queue;
- separate stale-request guards for setup and candidate loads;
- bounded structural tree, queue and paused-work preview.

### Angular architecture

- feature-local standalone OnPush components;
- lazy page composition;
- page-scoped API service and signal store;
- private writable state with readonly/computed exposure;
- typed HTTP-only data access;
- pure target and presentation helpers;
- presentational setup/workbench components;
- no global builder state or duplicated domain reducer.

## Out of scope

- arbitrary speed arrays or editable speed weights;
- generating an entire repertoire without interaction;
- non-initial starting positions;
- traps mode;
- LLM requirement;
- course organization or writes;
- browser or database persistence;
- builder-session API;
- profile-derived setup defaults;
- advanced collaboration;
- final onboarding/marketing;
- broad redesign of opening analysis or courses.

## MVP bounds

- one active route-local draft;
- one selected side;
- initial-position starts only;
- at most 6 candidate moves returned per decision;
- at most 24 accepted decisions in the workbench;
- RB-009 hard limits remain 256 branches, 128 queued branches, 8 selected moves and 256 preview nodes;
- no automatic recursive candidate fetching or whole-tree generation.

## Persistence and resume decision

The implementation adds no Prisma model, API session route, browser storage or background job.

Refreshing or recreating the route starts a new draft. This is stated in the page header, setup dialog and workbench context. Restarting setup explicitly replaces the current route-local draft.

This proves the workflow can operate without premature persistence but does not prove that route-local recovery is acceptable for real use. Hands-on review owns that decision under RB-D024.

## Acceptance criteria

- The workflow alternates correctly between user-choice and opponent-coverage decisions. — Implemented and covered by focused store tests.
- Candidate positions are visual. — Implemented through one primary board and resulting-position preview.
- Recommendation reasons and source evidence are inspectable. — Implemented.
- The target exposes one valid RB-001 speed preset and one valid rating target. — Implemented and schema-tested.
- Factual peer evidence and manual target override remain distinguishable. — Implemented and provenance-tested.
- The user can choose against the profile recommendation. — Implemented; profile fit is advisory.
- Deferred branches remain visible and reopenable. — Implemented and tested.
- Draft output is bounded and previewable. — Implemented through RB-009 projection and product limits.
- Reload/resume behavior matches the RB-009 decision honestly. — Implemented as explicit route-local reset; usability remains a review gate.
- No course is changed without an explicit preview/apply action. — Met; no course write exists.
- Ownership and validation are enforced. — Implemented through RB-009 owner/revision checks and RB-006/RB-007 validation.
- Desktop and mobile workflows are usable. — Responsive implementation exists; authenticated browser review remains pending.
- Tests cover the primary decision loop, stale requests, errors, deferral, override, and preview. — Automated coverage added; hands-on populated-data review remains pending.

## Validation completed

Final implementation-head CI run `30436890029` / CI #1408 passed:

- root lint;
- root build, including Angular and API builds;
- opening-classification audit and artifact upload;
- architecture guardrails;
- database migrations;
- imported-game opening-classification audit and artifact upload;
- complete repository tests.

Focused tests cover target validity/provenance, user-to-opponent progression, owner-scoped session creation, deferral/reopen, manual board candidates, stale-response suppression, setup accessibility/replacement warnings and Builder navigation activity.

## Review validation still required

- authenticated hands-on review with populated account and peer data;
- desktop and mobile browser review;
- keyboard traversal of the complete rendered route;
- candidate latency and evidence readability in realistic positions;
- calibration of 6-candidate and 24-decision limits;
- decision on whether route-local lifetime is sufficient;
- acceptance of the structural preview as a stable RB-011 input.

## Completion updates

The implementation report records delivered behavior, architecture, target/evidence provenance, actual bounds, persistence findings, automated validation, unvalidated browser assumptions and downstream gates.

## Completion

Report: `../reports/RB-010-2026-07-29-interactive-builder-mvp.md`

Completed at: pending hands-on review, accepted merge and closure reconciliation
