# RB-012 Course ending builder entry report

Date: 2026-07-29

Status: implemented for review

Task: RB-012

GitHub issue: #100

Implementation pull request: #205

Implementation branch: `rb-012/issue-100-course-ending-entry`

Implementation head before review-package documentation: `f77e11c88bd48b6b845954d2ef9dc67fe6d050dd`

## Purpose

Turn one existing computed course-maintenance finding into an actionable entry point for the same explainable builder and course-write workflow already delivered by RB-010 and RB-011.

The first slice uses Course endings because that finding already identifies one exact terminal course position, one observed opponent continuation and one or more exact line/node references. That gives the workflow a clear consequence: extend one selected existing line at its terminal node.

## Delivered behavior

### Line-specific Course ending action

Each Course ending card retains the source candidate key, terminal normalized FEN, repertoire side, observed move, count/results, examples and every course line reference.

For each line reference the card renders a separate **Extend this line in builder** action. A finding that maps to multiple course lines therefore requires the user to choose one exact line/node anchor rather than silently selecting the first match.

The existing course-line, game-review and analysis links remain available.

### Validated launch boundary

The launch route carries a bounded, typed frontend payload containing:

- source kind and `EXTEND_EXISTING_LINE` intent;
- course, chapter, line and terminal node identifiers;
- course and line display names;
- terminal FEN and repertoire side;
- observed move UCI/SAN;
- distinct-game count and result breakdown;
- minimum-games threshold;
- line-specific move sequence;
- applied game-filter summary and serialized filter query.

The builder validates IDs, source/intent, text bounds, UCI and FEN before accepting the context. Course endings expose the repository's normalized four-field FEN; the parser expands it to a full legal FEN before creating the RB-009 session.

Malformed or incomplete route state does not start a constrained session and shows a direct instruction to reopen the finding from Course review.

### Existing setup, precise start

The existing RB-010 setup dialog remains the target editor. Speed, population, persona, theory burden and opponent-response coverage remain editable.

The source course fixes the repertoire side because changing side would make the selected course endpoint semantically invalid.

After submission:

- the RB-006 target records a `COURSE_POSITION` starting point;
- the RB-009 session starts at the exact terminal FEN;
- the session's initial decision role follows the side to move at that FEN;
- the first RB-007 candidate request includes the observed continuation as `includeMoveUci`, ensuring it can be inspected when legal;
- no second candidate-ranking or recommendation engine is introduced.

### Visible source evidence and consequence

The builder page keeps a source panel visible with:

- course and exact line;
- course path;
- observed continuation;
- game count, threshold and result breakdown;
- the original filter summary;
- an explicit statement that this workflow extends the selected line only.

Replacement, a separate new line and another destination are not presented as equivalent outcomes.

### Exact RB-011 destination

After the builder session is completed, **Review course output** reuses the existing RB-011 draft projection and preview/apply API.

For a Course ending launch, the feature-local course store:

- preselects the source course and chapter;
- constructs one required `EXISTING_LINE`/`NODE` target from the source line, terminal node and normalized FEN;
- disables destination and line-name editing;
- rejects new-line and non-source preview candidates;
- enables apply only when RB-011 preview returns the exact conflict-free source endpoint;
- reports that the source no longer matches when the line/node/FEN is stale or absent.

RB-011 remains the authoritative ownership, conflict, legal-move, preview-token, course-revision and transactional-write boundary. The route payload cannot bypass those checks.

### Return to the originating report

The launch retains the bounded applied game filters and `minGames`. **Back to course endings** restores the Course endings mode and reapplies that scope rather than returning to a default report.

A successful apply does not persist a separate “resolved finding” record. Re-running Course endings naturally evaluates the changed course tree.

## Architecture decision

The implementation is frontend composition around existing contracts and services:

- existing Course review candidate response and unified page;
- existing imported-game query codec;
- existing RB-006 target contract;
- existing RB-007 candidate API and manual-inclusion field;
- existing RB-009 arbitrary-FEN session model;
- existing RB-010 page-scoped builder store/workbench;
- existing RB-011 completed-draft projection, preview and transactional apply.

No API route, Prisma model, migration, persistence adapter, queue, worker, background job or second recommendation engine is added.

The launch context remains route-local under the accepted RB-010 lifetime. Refresh still starts over.

## Acceptance mapping

- A real Course ending can launch the builder at its exact terminal position. — Implemented through line-specific route actions and arbitrary-FEN session start.
- Multi-line findings require an exact line choice. — Implemented with one action per line/node reference.
- Original evidence, threshold and filter summary remain visible. — Implemented in the builder source panel.
- Target speed/rating/persona/theory/coverage remain editable. — Existing setup reused; source side alone is fixed.
- Target records a course position and session starts at supplied FEN. — Implemented and unit tested.
- Observed continuation is included in the initial request. — Implemented and store tested.
- Consequence is explicitly extend-only. — Implemented in source panel and destination constraints.
- Course changes reuse mandatory RB-011 preview/apply at the exact source endpoint. — Implemented in the course store/dialog and tested.
- Existing review and analysis actions remain available. — Preserved on the finding card.
- Return navigation restores the source scope. — Implemented through serialized filters and route restoration helper/tests.
- Stale/changed anchors fail safely. — Exact candidate absence disables apply; RB-011 remains the transactional authority.
- No duplicate recommender or persistence layer. — Confirmed by the implementation boundary.

## Focused validation

Added coverage for:

- route payload round-trip, malformed context, four-field FEN normalization and restored return URL;
- Course review scope restoration;
- course-position target construction;
- arbitrary-FEN session start and observed-move candidate inclusion;
- normal RB-011 destination behavior remaining unchanged;
- locked source course/chapter/line/node selection;
- rejection of non-source targets;
- safe failure when the exact source endpoint is absent;
- fixed destination rendering and disabled alternatives.

Complete repository CI is required before PR #205 leaves draft state.

## Manual review still required

The GitHub connector does not provide a populated authenticated browser runtime. Review must verify:

- a real Course ending renders one line-specific action per line reference;
- the builder opens at the exact terminal board position;
- source evidence, filters and extend-only consequence are readable;
- source side is fixed while other target controls remain editable;
- the observed continuation is available in the first candidate set;
- a completed draft previews only the exact source line/node as an allowed target;
- apply updates that line and no other destination;
- Back to course endings restores the previous mode, filters and threshold;
- changed/deleted source anchors fail without a partial write;
- desktop/mobile readability and keyboard traversal remain acceptable.

These are review gates, not claims of completed hands-on validation.

## Next finding recommendation

1. **Opponent gaps next.** The consequence is still primarily extending coverage, and the existing finding already has an exact course position. It needs explicit anchor mapping inside an existing line rather than only at a terminal node, but it can reuse the same launch and exact-target pattern.
2. **My deviations after opponent gaps.** A personal deviation may imply replacing the repertoire choice, adding an alternate line, or keeping the current course and training adherence. Those consequences are not equivalent and require an explicit choice before builder launch.
3. Weak-choice/profile-driven adaptation should remain later and depend on accepted RB-004/RB-005/RB-013 profile semantics.

No existing Course endings report should be retired yet. It remains the inspectable source and recalculation surface for the builder action. Retirement or consolidation should be considered only after more finding types use the builder and equivalent maintenance value is demonstrated.

## Queue impact

RB-011 is complete and integrated. RB-012 moves from `BLOCKED` to `REVIEW` for this first bounded slice through PR #205 once final CI passes.

Task order and priority remain unchanged. Later RB-012 finding types can follow as separate reviewed slices rather than expanding this PR into an ambiguous all-findings migration.
