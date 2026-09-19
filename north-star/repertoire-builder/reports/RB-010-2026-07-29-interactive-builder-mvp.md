# RB-010 interactive builder MVP review report

Date: 2026-07-29

Status: implemented for review

Task: RB-010

GitHub issue: #98

Claim pull request: #182

Implementation pull request: #184

Implementation branch: `rb-010/issue-98-interactive-builder-mvp`

Final implementation head: `a44272f238a468879ee588e3f90ef4970d1338a6`

## Purpose

Deliver the first production, human-controlled repertoire-builder slice by composing the accepted RB-008 interaction direction with the integrated RB-006 target contract, RB-007 candidate-decision API and RB-009 session reducer.

The implementation is intentionally bounded. It proves the setup-to-workbench loop, user-move and opponent-response alternation, queue control, evidence inspection and structural draft preview before course writing or durable persistence is introduced.

## Delivered experience

### Authenticated route and navigation

RB-010 adds an authenticated lazy `/builder` route and a top-level **Builder** navigation destination.

The page is a feature-local Angular composition with:

- one route page;
- one page-scoped signal store;
- one typed API service;
- pure target and view-model helpers;
- a focused setup dialog;
- a board-first workbench component;
- focused tests for target creation, state transitions, request races, setup behavior and navigation.

No builder state is added to application-global services.

### Focused setup

The setup dialog captures:

- White or Black repertoire side;
- one RB-001 speed preset;
- all players, factual peer targets or one explicit Lichess benchmark group;
- Balanced, Solid, Aggressive or Surprise intent;
- maximum theory burden;
- 50–100% opponent-response coverage intent.

Starts are limited to the initial position in this MVP.

Peer targets load the existing Lichess Games Explorer peer resolution. The generated RB-006 target retains that factual resolution as `PEER_RESOLUTION` default provenance. An explicit benchmark group is stored as an authoritative manual target choice rather than being mislabeled as factual peer evidence.

The four personas remain transparent presets over explicit RB-006 objective dimensions. They do not add a new opaque ranking score or permanent player label.

### Board-first workbench

The routed workbench follows the accepted RB-008 direction:

- one readable Chessground board;
- candidate switching updates the board to the resulting position;
- a user can return the board to the active position and play another legal move;
- a manually played legal move is requested through the existing `includeMoveUci` candidate API behavior;
- simultaneous candidate mini-boards are not used;
- focused evidence appears below the primary decision surface;
- queue, paused work and preview remain secondary controls.

Board preview and move-entry mode are local presentation state. They do not mutate the RB-009 session until the user explicitly accepts a decision.

### Candidate evidence and choice

The feature uses the existing authenticated `POST /api/candidate-decisions` endpoint as the sole candidate and evidence source.

For each candidate the UI exposes:

- rank and move notation;
- stored engine evaluation where available;
- selected-population frequency;
- target fit;
- profile fit;
- eligibility;
- engine, population, Masters, personal, opening-profile, Player Chess Profile and course source status;
- stable reason labels;
- warnings;
- course coverage, conflict or transposition state.

Missing, stale, insufficient and unavailable sources remain visible. Profile fit is advisory and does not prevent the user from selecting a different move.

### Decision loop and queue

The page-scoped store delegates lifecycle transitions to the integrated RB-009 reducer. It does not recreate branch semantics in Angular.

The workflow supports:

- accepting one user move;
- selecting one or more opponent responses;
- showing selected opponent coverage against the target percentage;
- accepting covered responses;
- advancing through the deterministic branch queue;
- selecting and reordering queued branches;
- deferring and reopening work;
- ignoring a branch;
- stopping a line explicitly;
- restarting stale work;
- completing or abandoning the route-local session;
- reviewing the bounded structural preview.

Every reducer mutation uses the session owner ID and expected revision. Failed mutations do not advance the queue.

Candidate and setup requests use separate request-version guards so an older response cannot overwrite a newer draft or branch selection.

### Draft preview

The preview maps the RB-009 bounded projection into a presentation-neutral structural tree showing:

- selected move or initial-position label;
- user-move or opponent-response role;
- branch status;
- queue ordering;
- deferred and stale work;
- transposition references;
- visible branch counts.

It does not materialize chapters, lines or courses. RB-011 remains responsible for previewing course organization and applying accepted output.

## Actual MVP bounds

RB-010 applies the following product-level limits:

- one active route-local draft;
- one repertoire side per draft;
- initial-position starts only;
- maximum 6 candidate moves per decision request;
- maximum 24 accepted decisions in the workbench.

The integrated RB-009 hard guards remain authoritative:

- 256 branches per session;
- 128 queued branches;
- 8 selected moves per decision;
- 256 preview nodes.

The page never recursively requests or generates the complete repertoire tree.

## Persistence and resume finding

### Implemented behavior

RB-010 adds no Prisma model, migration, builder-session endpoint, browser storage or background job.

The draft exists only in the page-scoped store. Refreshing or leaving and recreating the page starts a new draft. This limitation is stated in the page header, setup dialog and workbench context.

Reopening setup is explicitly labelled **Restart setup**. Submitting it replaces the current route-local draft; the dialog warns about replacement and permits cancellation.

### Review question

The implementation proves that the full deterministic decision loop can operate without adding a second state model or premature storage schema. It does not prove that route-local recovery is sufficient for real use.

Hands-on review must determine:

- whether typical bounded sessions are short enough to finish without durable resume;
- whether accidental refresh/navigation loss is unacceptable;
- whether one simultaneous draft is sufficient;
- whether cross-device resume is required;
- whether archive/delete/expiry behavior is needed.

Persistence remains conditional under RB-D024. A durable adapter should be added only if review demonstrates a concrete need and must store the RB-009 snapshot rather than duplicating its lifecycle rules.

## Architecture

### Feature boundary

Changed Angular areas:

- `apps/web/src/app/features/repertoire-builder/`;
- `apps/web/src/app/app.routes.ts`;
- `apps/web/src/app/core/layout/main-navigation/main-navigation.component.ts`;
- focused navigation regression coverage.

The feature follows the repository Angular guidance:

- standalone OnPush components;
- lazy route composition;
- page-scoped providers;
- private writable signals with readonly/computed exposure;
- HTTP-only typed data access;
- pure feature helpers;
- presentational setup and workbench components;
- no domain logic in templates;
- no global mutable feature state.

### Existing boundaries reused

- RB-001 speed/rating vocabulary and peer-resolution endpoint;
- RB-006 target schema, population resolver and default/override provenance;
- RB-007 candidate request/response contract and authenticated API route;
- RB-009 session ownership, revision, branch, queue, staleness, transposition and preview semantics;
- shared Chessground board, page header, panel and navigation conventions.

No API, contract, Prisma or `chess-domain` changes were required.

## Validation

Final implementation-head CI run `30436890029` / CI #1408 passed:

- root lint;
- root build, including Angular and API builds;
- opening-classification audit and artifact upload;
- architecture guardrails;
- database migrations;
- imported-game opening-classification audit and artifact upload;
- complete repository tests.

Focused tests cover:

- schema-valid explicit target construction;
- factual peer-resolution provenance and `MY_PEERS_PLUS_ONE` population expansion;
- owner-scoped session creation and bounded candidate requests;
- user-move acceptance followed by opponent-response work;
- deferral and reopen behavior;
- manual legal board-move inclusion;
- stale candidate-response suppression;
- accessible setup and explicit refresh-loss messaging;
- explicit active-draft replacement warning;
- Builder navigation presence and active-route behavior.

## Validation not completed in this environment

An authenticated populated browser runtime was not available through the repository connector, and the execution container could not resolve `github.com` for a local checkout. Therefore the following remain hands-on review requirements rather than claimed validation:

- real account and peer-resolution behavior against populated data;
- candidate latency and evidence readability in realistic positions;
- desktop review at production widths;
- mobile review at production widths;
- keyboard traversal through the complete rendered route;
- whether the 24-decision limit and route-local lifetime are usable;
- whether the preview is sufficient input for RB-011 course planning.

The implementation includes responsive layouts, labelled controls, dialog semantics, progress semantics and focus-visible styling, but those facts do not replace browser review.

## Proven assumptions

- RB-006 targets can be constructed entirely in the frontend without inventing a second target contract.
- The existing candidate endpoint supports both user-move and opponent-response decisions for the workbench.
- RB-009 can be used directly from a page-scoped Angular store without UI-specific leakage into the domain.
- Manual board choices can reuse `includeMoveUci` instead of bypassing candidate evidence.
- A bounded queue and structural preview can be rendered without course persistence.
- Target fit and profile fit can remain visibly separate.

## Assumptions still requiring user review

- One primary board and focused evidence are readable with the user's real data.
- Initial-position-only setup is sufficient for the first hands-on slice.
- Six candidates and 24 decisions are useful bounds rather than arbitrary friction.
- Route-local state is acceptable for initial review.
- Coverage percentages and queue status are understandable without additional onboarding.
- The structural preview is stable enough for RB-011 to consume after acceptance.

## Explicit exclusions

RB-010 adds no:

- database or browser persistence;
- builder-session API;
- course preview, chapter organization or course write;
- existing-course entry point;
- profile-derived setup default;
- traps mode;
- LLM dependency;
- automatic full-tree traversal;
- collaboration;
- broad opening-analysis or courses redesign.

## Downstream impact

RB-010 moves to `REVIEW` through PR #184.

RB-011 remains `BLOCKED` until:

1. the user reviews the populated route at desktop and mobile widths;
2. the target/candidate/queue interaction is accepted;
3. the preview shape is accepted as a stable input boundary;
4. PR #184 is accepted and integrated.

RB-012 remains blocked on accepted RB-010 and RB-011.

No new task, priority change or roadmap resequencing is proposed. If hands-on review demonstrates a durable-resume requirement, persistence should be added to the smallest justified owning task or a newly reviewed RB task at that time.

## GitHub state

- Issue: #98, open for review.
- Claim PR: #182.
- Implementation PR: #184.
- Repository task state after synchronization: `REVIEW`.

## Completion decision

RB-010 is implemented for review, not complete. The deterministic and automated acceptance surface is satisfied, but browser review, populated-data review, persistence sufficiency and preview acceptance remain user gates before merge, `DONE`, or RB-011 readiness.
