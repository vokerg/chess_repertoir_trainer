# RB-030 Closure — Single-dialog Builder Setup V2

**Task:** RB-030  
**Issue:** #320  
**PR:** #335  
**Branch:** `repertoire-builder/rb-030-single-dialog-setup-v2`  
**Final implementation head:** `621ee6abb9a311646859357f8de41d4a6c4528e7`  
**Final CI:** #2478 (`31420953443`) — green  
**Squash merge:** `9bfcf3f5b4337c827719f5ee170bcd5f67b6f3c2`  
**Closed:** 2026-08-11

## Delivered product behavior

RB-030 reduces normal Builder launch to one setup dialog with four concepts: repertoire side/starting scope, speed population, rating target, and one repertoire persona.

The normal setup no longer asks the user to choose an opponent-response coverage target or a hard maximum theory burden. Coverage is feedback from the opponent replies actually selected under RB-029, and theory burden is not a separate V2 setup preference.

Persona appears once and retains the V2 definitions:

- Balanced — practical peer-tested choices with sound validation;
- Solid — established, dependable choices with strong Master/objective support;
- Aggressive — active, justified choices that accept bounded objective cost;
- Surprise — uncommon viable choices that overperform in the selected population.

The RB-026 Cockpit, RB-009 route-local reducer/session behavior, RB-029 opponent-preparation authority, and RB-011 course preview/apply write boundary remain unchanged.

## Starting-scope boundary

Normal setup now owns an explicit starting scope that resolves through one starting-position helper into the existing Builder start path.

For White the presets are full repertoire, `1.e4`, `1.d4`, `1.c4`, and `1.Nf3`; for Black they mean all White first moves or preparation against those same first moves. Each non-full preset resolves to the canonical FEN after the corresponding first move.

The `Other position or move sequence` path accepts the same practical chess formats already used elsewhere in the application: FEN, PGN, SAN, or UCI moves. Input is validated and normalized through `chess.js`; invalid input blocks launch with an explicit error.

Scoped starts become exact draft roots, not descriptive labels. The setup start context carries both normalized `startingFen` and the versioned target `startingPoint` through the existing Builder launch/start boundary.

## Exact course launches

Course-review and opponent-gap launches retain their exact source position. When the source fixes the side/position, the dialog displays `Exact course position` instead of asking the user to choose a broader starting scope.

The existing course-position target identity and return-navigation semantics remain authoritative. RB-030 does not reinterpret an exact course launch as a normal first-move preset.

## V1 target compatibility

The shared V1 `RepertoireTarget` contract still contains objective/coverage fields consumed by existing deterministic services and historical snapshots. RB-030 therefore keeps explicit compatibility values while removing them as V2 user choices.

- `REPERTOIRE_BUILDER_COMPATIBILITY_COVERAGE_PERCENT = 80` preserves schema/default reproducibility; RB-029 does not use it to rank or recommend opponent replies.
- `REPERTOIRE_BUILDER_COMPATIBILITY_THEORY_BURDEN = HIGH` is deliberately non-restrictive. A self-review found that retaining the earlier `MEDIUM` compatibility value could still make Candidate Decision reject or warn about high-theory candidates according to an invisible control. Raising the compatibility ceiling to `HIGH` removes that hidden V2 decision while keeping the old contract valid.
- target/default provenance uses `2026-08-builder-v2` for the new setup semantics and compatibility material.

This is compatibility, not a second hidden setup model. Future removal of V1 fields requires a deliberate contract-version migration rather than silently reinterpreting stored snapshots.

## Profile-derived defaults

Player Chess Profile launch/default mapping was updated to the V2 setup shape. Profile-derived side, population and persona suggestions remain editable and provenance-aware; removed coverage/theory controls are no longer presented as profile-derived user choices.

## Review corrections

The implementation went through final self-review before merge.

1. The compatibility theory value was changed from `MEDIUM` to the non-restrictive `HIGH` ceiling after tracing Candidate Decision theory filtering and finding that the hidden compatibility value could still affect candidate acceptance/warnings.
2. Course materialization was traced through the existing preview/apply planner to verify that a scoped root FEN remains the course line starting FEN; no course reintegration rewrite was needed.
3. A bridge-level regression assertion was added so tests prove that a chosen setup scope is converted to the exact FEN/target starting point passed into the existing Builder start path, rather than testing the parser helper in isolation.

## Validation

Final implementation head `621ee6abb9a311646859357f8de41d4a6c4528e7` passed GitHub Actions CI #2478 (`31420953443`). The run completed successfully across lint, Angular build/template compilation, architecture guardrails, database migrations, opening/import audits, trap validation and the complete test step.

Focused coverage includes:

- normal one-dialog setup and absence of coverage/theory controls;
- White/Black full and first-move scope options;
- FEN, PGN, SAN and UCI custom starts plus validation failures;
- setup-scope conversion into the existing Builder start context;
- exact course-position launches;
- versioned target construction and compatibility defaults;
- profile-derived launch defaults;
- destructive restart behavior.

Authenticated populated browser/device evidence is not claimed by this closure; the merge authority is source review plus exact-head CI.

## Scope boundaries

RB-030 adds no backend/API/contract structural change, Prisma schema or migration, MCP surface, background job, queue, persisted Builder session, automatic course creation, or Cockpit redesign.

RB-031 subsequently completed the Cockpit evidence-hierarchy presentation on PR #336. With RB-027 through RB-031 integrated, RB-016 / #104 is the only remaining Builder execution task and remains blocked until sufficient post-V2 Builder/course usage, training and later-game evidence exists.
