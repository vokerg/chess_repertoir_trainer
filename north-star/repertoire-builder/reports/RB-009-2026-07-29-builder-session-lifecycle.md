# RB-009 builder session and queue lifecycle report

Date: 2026-07-29

Status: implemented for review

Task: RB-009

GitHub issue: #97

Branch: `rb-009/issue-97-builder-session-lifecycle`

Claim pull request: #173

Implementation pull request: #177

## Purpose

Provide the minimum deterministic state foundation required by the routed, human-controlled repertoire builder before production Angular composition or course writes begin.

The model must preserve one repertoire target, accepted choices, opponent coverage work, deliberate deferrals, ignored branches, stale evidence, transpositions and a previewable output tree without automatically generating an entire repertoire.

## Delivered scope

### Pure domain boundary

RB-009 adds a feature-local `builder-session` domain under `packages/chess-domain`.

The domain has no dependency on Fastify, Prisma, Angular, course repositories, candidate providers or an LLM. It consumes target and candidate provenance as serializable snapshots rather than recalculating either RB-006 targets or RB-007 evidence.

Package exports expose:

- serializable types and constants;
- deterministic lifecycle transitions;
- snapshot validation and active-decision lookup;
- a bounded preview projection.

### Versioned session snapshot

Model version: `2026-07-v1`.

A session retains:

- session ID and owner ID;
- optimistic integer revision;
- `ACTIVE`, `COMPLETED` or `ABANDONED` lifecycle;
- target revision and complete generic target snapshot;
- target contract version, target ID and capture time;
- repertoire side and starting FEN;
- normalized starting-position identity;
- branch records and queue order;
- creation, update, completion and abandonment times.

The target value remains generic so `chess-domain` does not acquire a dependency on the contracts package. Consumers are expected to pass the complete validated RB-006 target value and retain its contract version.

### Decision provenance

Every accepted decision retains:

- decision ID and branch-local revision;
- active, superseded or stale status;
- `USER_MOVE` or `OPPONENT_RESPONSE` role;
- RB-007 candidate contract version;
- ranking-policy version;
- candidate generation time;
- normalized decision position;
- source-version record;
- selected move UCI and SAN;
- resulting FEN and normalized FEN;
- candidate rank where present;
- coverage contribution where present;
- stable reason and warning codes;
- acceptance and supersession times.

This is enough to explain which evidence version supported an accepted choice without storing the entire candidate response or coupling the session reducer to evidence providers.

### Branch identity

Each branch has two distinct identities:

1. a path-stable ID derived from ordered UCI moves, for example `root/e2e4/c7c5`;
2. normalized FEN plus decision role, used to identify transpositions.

Path identity preserves history and move-order context. Normalized position identity avoids treating a transposed decision point as unrelated work.

A transposed branch is retained as an explicit record. When it reaches an accepted or completed canonical position with the same decision role, it becomes `COMPLETED` with reason `TRANSPOSED`, records the canonical branch ID and does not enter the queue.

The implementation does not collapse different paths into one mutable node. This keeps auditability and future course-preview context while avoiding duplicate decision work.

### Branch states

The model defines:

- `PENDING` — unresolved work in the active queue;
- `ACCEPTED` — an active decision exists and immediate child work has been created;
- `DEFERRED` — deliberately postponed and absent from the active queue;
- `IGNORED` — deliberately excluded for this draft version;
- `COMPLETED` — branch-specific stopping rule or transposition completed the work;
- `STALE` — previous work is retained but cannot be treated as current.

Decision history separately uses:

- `ACTIVE`;
- `SUPERSEDED`;
- `STALE`.

This separation prevents a branch lifecycle label from erasing previous decision provenance.

### Deterministic transitions

The public reducer supports:

- creating a session;
- resuming and validating a snapshot;
- accepting or replacing a decision;
- deferring and reopening a branch;
- restarting stale work;
- ignoring a branch;
- completing a branch with an explicit stopping reason;
- marking evidence or source-course work stale;
- replacing the target snapshot;
- reordering queued work;
- completing or abandoning a session.

Every mutation requires the owner ID and expected session revision. Owner mismatch and stale revision produce typed domain errors rather than silently applying a change.

Replacing an accepted ancestor:

- supersedes the previous active decision;
- marks previous descendants stale;
- removes stale descendants from active queue work;
- retains their historical decisions and reasons;
- creates only the immediate new resulting branches.

Target replacement:

- increments the target revision;
- marks every branch and active decision stale;
- retains the old history;
- queues only the root so work is regenerated lazily.

Evidence or source-course invalidation:

- marks the selected branch, its descendants and dependent transposition records stale;
- returns only the affected root to the queue;
- leaves unrelated pending branches unchanged.

### Lazy queue algorithm

The queue stores branch IDs in explicit deterministic order.

- New immediate child branches append in selected-move order.
- A user may move one queued branch to another valid queue index.
- Deferral, ignore and completion remove a branch.
- Reopen and stale restart append the branch.
- No reducer transition recursively calculates candidates or expands grandchildren.

This supports the RB-008 opponent-response queue and branch progress without background generation.

### Preview projection

The preview function returns a bounded, serializable tree containing:

- branch path and position;
- role and lifecycle status;
- active decision and retained evidence references;
- transposition target;
- completion reason;
- stale reason and source version;
- bounded child nodes;
- active queue entries;
- counts for every branch status;
- truncation flag and omitted branch count.

The projection is presentation-neutral. RB-010 can map it into the board-first workbench without moving Angular state into `chess-domain`.

## Boundedness

V1 hard limits are:

- 256 branches per session;
- 128 queued branches;
- 8 selected moves per decision;
- 256 preview nodes.

The reducer throws a typed `SESSION_LIMIT_EXCEEDED` error rather than silently dropping work.

These limits are guardrails, not product defaults. RB-010 may use smaller view-level page sizes without changing the domain maximums.

## Persistence decision

### Decision

Do not add persistence in RB-009.

### Evidence

Repository inspection found existing ownership and lifecycle models for courses, training, imports and jobs, but no builder draft or reviewed builder workbench demonstrating:

- how long a draft must live;
- whether cross-device resume is required in the MVP;
- whether one user needs multiple simultaneous drafts;
- whether route-local recovery is sufficient for hands-on review;
- what delete/expiry/archive behavior is required;
- what source-course references must be transactionally protected.

Adding Prisma, repositories and routes now would lock storage shape before the interaction exists.

### Staged boundary

The pure snapshot already contains the information a later adapter requires:

- owner ID;
- optimistic revision;
- model version;
- target and evidence provenance;
- complete serializable branch and queue state;
- lifecycle timestamps.

RB-010 should compose and test the routed workbench against this model first. Persistence should be added only when review demonstrates a concrete resume requirement. A future adapter must preserve this reducer's semantics rather than duplicating lifecycle logic in a service or Angular store.

## Files and architecture areas changed

### Domain

- `packages/chess-domain/src/builder-session/types.ts`
- `packages/chess-domain/src/builder-session/internal.ts`
- `packages/chess-domain/src/builder-session/state.ts`
- `packages/chess-domain/src/builder-session/preview.ts`
- `packages/chess-domain/src/builder-session/index.ts`
- `packages/chess-domain/src/index.ts`

### Tests

- `packages/chess-domain/test/builder-session.test.ts`

### North Star coordination

- `north-star/repertoire-builder/tasks/RB-009-builder-session-and-queue.md`
- `north-star/repertoire-builder/TASKS.md`
- `north-star/repertoire-builder/STATUS.md`
- `north-star/repertoire-builder/FEATURES.md`
- `north-star/repertoire-builder/ROADMAP.md`
- `north-star/repertoire-builder/OPEN_QUESTIONS.md`
- this report.

`DECISIONS.md` was inspected but not changed. Existing open decision RB-D024 already requires demonstrated resume value before persistence and remains the correct governing boundary pending RB-010 evidence.

## Validation performed

Implementation-head CI run `30425427760` / #1328 passed:

- root lint;
- root build;
- opening-classification audit;
- opening-classification artifact upload;
- architecture guardrails;
- database migrations;
- imported-game opening-classification audit;
- imported-game audit artifact upload;
- complete repository tests.

Focused tests cover:

- session creation, ownership and serializable resume;
- accepting a user move and lazy opponent-branch creation;
- opponent coverage selecting multiple immediate responses;
- explicit queue reorder;
- defer, reopen and ignore transitions;
- ancestor replacement and descendant staleness;
- move-order transposition reuse;
- targeted evidence invalidation without disturbing sibling work;
- stale restart;
- target replacement and root-only lazy restart;
- optimistic revision conflict;
- role-specific decision cardinality;
- bounded preview;
- complete and abandoned session lifecycle.

## Validation skipped

The task intentionally did not validate:

- Prisma persistence or migrations specific to builder drafts;
- API authentication or ownership routes;
- Angular routing, store composition or browser recovery;
- durable cross-device resume;
- concurrent database writes;
- candidate evidence fetching;
- course preview or application;
- long-running background traversal.

These are absent implementation areas, not untested claims.

## Decisions made

- The v1 session is a pure serializable domain snapshot.
- One session retains one target snapshot and target revision.
- Branch path identity and normalized-position transposition identity remain separate.
- Queue expansion is lazy and one decision deep.
- Deferred and ignored are materially different states.
- Historical decisions are retained after replacement or staleness.
- Owner and optimistic revision checks belong at the domain mutation boundary.
- Persistence is staged until RB-010 demonstrates concrete resume requirements.
- No public contracts package is added before an API or cross-workspace consumer exists.

These implementation choices follow existing open decision RB-D024 and do not lock a persistence architecture before user review.

## Limitations and residual risks

- There is no durable storage, route or browser recovery yet.
- Source freshness is not polled by the reducer; consumers must call explicit stale transitions when target, evidence or source-course versions change.
- Transpositions are detected when a resulting branch is created against accepted/completed positions already present in the snapshot; the reducer does not search an external repertoire graph.
- The preview is structural and does not estimate learning burden or produce course organization.
- Session limits need hands-on calibration during RB-010.
- The generic target snapshot trusts a validated RB-006 value supplied by the consumer; the pure domain does not parse the contracts package.
- No persistence means database-level ownership and concurrent-write behavior remain future integration work.

## Product and North Star impact

RB-009 supplies the durable semantics the accepted RB-008 workbench needs:

- one current branch for the board;
- candidate decisions with reproducible evidence references;
- an opponent-response queue;
- selected, pending, deferred, ignored, completed and stale work;
- branch progress and preview;
- transposition reuse;
- safe ancestor revision;
- a storage-neutral resume snapshot.

It has little standalone user value without RB-010, but it removes the main state-model risk from the critical path and prevents the UI from inventing lifecycle behavior locally.

## GitHub state

- Issue: #97, open for review.
- Claim branch: `rb-009/issue-97-builder-session-claim`.
- Claim PR: #173.
- Implementation branch: `rb-009/issue-97-builder-session-lifecycle`.
- Implementation PR: #177.
- Repository task state: `REVIEW`.

## New tasks proposed

None.

Persistence remains a conditional implementation concern, not a new task, until RB-010 review demonstrates a concrete requirement. If durable resume is required, the work should be added to the smallest existing owning task or created as a new RB task with its own issue at that time.

## Queue and roadmap recommendation

Keep queue order and priorities unchanged.

- RB-009 moves to `REVIEW` through PR #177.
- RB-010 remains `BLOCKED` until RB-009 is accepted and integrated.
- After accepted RB-009 integration, RB-010 should become the next ordered ready North Star task.
- No roadmap resequencing is justified.
