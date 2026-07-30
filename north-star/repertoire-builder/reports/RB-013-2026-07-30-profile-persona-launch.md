# RB-013 — Profile-derived Builder personas and overrides

Date: 2026-07-30

Status: review

Task: RB-013

GitHub issue: #101

Claim PR: #231

Implementation PR: #232

Implementation branch: `rb-013/issue-101-profile-persona-launch`

Implementation head before reporting: `bf37e06ca20f157d2e6af16d2ad294263fab6df8`

Implementation CI: run `30583815998` / #1690 — success

## Purpose

Turn the integrated Player Chess Profile into an optional, inspectable starting point for the existing Repertoire Builder without converting descriptive profile evidence into a permanent persona, hidden constraint, ranking input, or course-write rule.

## Delivered scope

RB-013 now provides:

- deterministic White and Black Builder suggestions derived independently from the loaded profile opening groups;
- a minimum evidence boundary of five classified opening-group games for a side before an action appears;
- explicit **Build White repertoire** and **Build Black repertoire** actions on `/progress/profile` only for eligible sides;
- mapping from the strongest weighted classified character to the existing Balanced, Solid, Aggressive, or Surprise target preset;
- dominant classified theory burden, applied profile speed preset, and visible persona coverage default in the suggestion;
- a bounded route snapshot containing selected side, suggested values, profile contract version, profile generation time, classification version, classified-game count, and descriptive strongest character;
- strict source/intent/value parsing with a 24-hour expiry and safe ordinary-Builder fallback for malformed, unsupported, incomplete, future-dated, or stale launch state;
- one Builder source panel explaining that the profile is a starting point rather than a factual label or constraint;
- an explicit **Use standard Builder defaults** action before the route-local session starts;
- immutable `PLAYER_PROFILE` default provenance for speed, objective, and coverage in the RB-006 target snapshot;
- independent `PEER_RESOLUTION` provenance for population instead of presenting population as a profile conclusion;
- exact RB-006 `overriddenFields` when effective speed, objective, or coverage differs from the profile suggestion;
- automatic removal of profile provenance when the user deliberately changes repertoire side;
- expanded persona cards that disclose preferred character, minimum soundness, risk, complexity, theory, and coverage defaults;
- a Repertoire Builder public boundary for the cross-feature profile launch protocol;
- route-local documentation and focused contract, helper, page-action, setup, provenance, override, stale-state, and alternate-persona tests.

## Architecture areas changed

### Shared profile contract

- added an exported Player Chess Profile contract version for route provenance;
- exposed the opening-character TypeScript type used by the pure suggestion helper;
- did not change the API response schema, calculation service, persistence, or profile formula.

### Player Chess Profile feature

- composes eligible side-specific actions from the current immutable response;
- delegates navigation through a Builder public boundary;
- retains existing filter, store, recalculation, request-ordering, and evidence presentation behavior.

### Repertoire Builder feature

- adds a pure bounded profile-launch protocol alongside the existing Course-ending and Opponent-gap route protocols;
- carries optional immutable profile defaults inside the route-local setup value;
- reuses the existing setup dialog and target factory rather than introducing a second persona editor or workflow;
- keeps course-finding launch context distinct so profile launches cannot lock a destination or enter RB-011 course reintegration context;
- leaves `RepertoireBuilderStore`, RB-007 candidate requests, RB-009 reducers, RB-011 preview/apply, and course writers unchanged.

### Documentation

- documents eligibility, deterministic derivation, expiry, provenance, overrides, rejection, and route-local lifetime in the Player Chess Profile experience guide;
- reconciles the North Star task, queue, status, and roadmap to review state.

## Decisions made

1. **Personas are target presets, not player labels.**
   The profile derives one optional setup per eligible side. It does not assign or save a permanent archetype.

2. **No course metadata in v1.**
   Persona and profile provenance exist only in the route-local RB-006 target snapshot. Nothing is persisted on a course or line.

3. **Profile and population evidence remain separate.**
   Speed, objective, and coverage can use `PLAYER_PROFILE` provenance. Population continues to use factual peer resolution or an explicit manual population.

4. **Manual choices always win.**
   The existing setup controls remain the only effective target input. Differences from immutable profile defaults are recorded through existing RB-006 override semantics.

5. **Changing side rejects the side-specific profile inference.**
   The selected values remain usable as manual choices, but the `PLAYER_PROFILE` source is removed.

6. **Profile route state is bounded and transient.**
   It expires after 24 hours and is not stored in Prisma, browser storage, a hidden history, or a background job.

7. **No new persistence follow-up is created now.**
   Retained course intent, reusable saved personas, and course-library presentation require demonstrated post-apply value before a new task is justified.

## Evidence used

- integrated RB-004 Player Chess Profile contracts and calculation endpoint;
- integrated RB-005 `/progress/profile` page and page-scoped response state;
- RB-006 `PLAYER_PROFILE`, `PEER_RESOLUTION`, defaults, and `overriddenFields` algebra;
- existing Builder setup controls and persona target factory;
- existing route-query launch patterns for Course endings and Opponent gaps;
- existing separation of profile fit and target fit in candidate evidence;
- existing RB-011 destination/preview/apply boundary.

## Validation performed

Complete repository CI run `30583815998` / #1690 passed:

- lint;
- repository build;
- generated opening-classification audit;
- architecture guardrails;
- database migrations;
- imported-game opening-classification audit;
- complete API and Angular tests.

Focused tests cover:

- independent White and Black suggestion derivation;
- insufficient-side omission;
- route serialization and unified Builder parsing;
- malformed provenance and stale-launch rejection;
- profile return navigation and initial-position start;
- accepted profile defaults with zero overrides;
- separate peer-population provenance;
- partial objective/coverage overrides;
- alternate-persona selection;
- side-change provenance removal;
- standard Builder setup without hidden profile state;
- profile action visibility and command composition;
- setup-dialog provenance preservation and explicit rejection behavior;
- continued Course-ending and Opponent-gap launch compatibility.

## Validation not performed

- authenticated hands-on browser walkthrough against the user's populated profile;
- visual comparison across desktop and mobile beyond existing responsive component patterns and compile-time template validation;
- post-apply course-library presentation, because target intent is intentionally not persisted;
- real usage measurement, which remains RB-016 scope.

## Limitations and residual risks

- suggestion quality depends on the classified opening groups included in the current profile response and should be judged against populated personal data;
- the five-game eligibility threshold is a bounded product rule, not a statistical confidence claim;
- opening-group truncation can mean the suggestion reflects the bounded visible profile sample rather than every historical opening;
- route-local profile provenance disappears on refresh, matching the current Builder draft lifetime;
- a profile suggestion does not create a distinct saved course identity; users can still create multiple intents by launching or editing separate route-local drafts;
- RB-004/RB-005 issue and planning closure metadata remains stale even though their runtime contracts and UI are present on `main`; that reconciliation should not be duplicated inside RB-013 acceptance.

## Product and North Star impact

Standalone value improves because Chess profile findings can now start a concrete Builder workflow rather than ending as descriptive analysis.

North Star value improves because the system now demonstrates the intended separation:

- factual player profile;
- explicit target persona;
- editable theory and coverage intent;
- independent population evidence;
- inspectable overrides;
- unchanged deterministic candidate and course-write authority.

## Queue and roadmap recommendation

Move RB-013 from `IN_PROGRESS` to `REVIEW` without changing priority or order.

Do not create a persistence or course-library task yet. Keep RB-017 independently claimed and RB-016 blocked on real usage. RB-004/RB-005 acceptance and closure metadata should be reconciled separately from this implementation review.
