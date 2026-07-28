# RB-006 repertoire target contract report

Date: 2026-07-28

Status: completed and integrated

Task: RB-006

GitHub issue: #94

Branch: `rb-006/issue-94-repertoire-target-contract-v2`

Pull request: #157

Squash commit: `9d833d910205f687b87f3c54e2ff4ea71ced3cb5`

Superseded pull requests: #145 and #146, closed without merge

## Purpose

Define the explicit, versioned target for one repertoire build without confusing selected intent with factual player, peer-population, or intrinsic opening evidence.

The target is intended to be the stable input boundary for RB-007 candidate evidence/ranking and the immutable or versioned target snapshot owned by RB-009 builder sessions.

## Delivered scope

The shared `@chess-trainer/contracts/repertoire-target` export defines:

- target identity, contract version, side and starting point;
- one RB-001 speed preset;
- one requested Lichess population target and its effective benchmark groups;
- factual peer-resolution snapshots for `MY_PEERS` and `MY_PEERS_PLUS_ONE`;
- account context without changing factual player-level evidence;
- named persona plus explicit character, soundness, risk, theory and complexity dimensions;
- opponent-response and personal-encounter coverage policy;
- per-field defaults with system, persona, Player Chess Profile or peer-resolution provenance;
- explicit overrides that must exactly match effective values changed from recorded defaults;
- immutable, mutable and candidate-recalculation field sets;
- pure population-resolution, adjacent-group and change-impact helpers;
- canonical new-course, existing-course, profile-override and alternate-persona examples;
- invariant, invalid-combination and helper tests.

No API route, Angular UI, persistence model, course write, candidate ranking, trap extension, background job or LLM behavior was added.

## Files and architecture areas changed

- `packages/contracts/package.json`
- `packages/contracts/src/index.ts`
- `packages/contracts/src/repertoire-target/index.ts`
- `packages/contracts/src/repertoire-target/repertoire-target.schemas.ts`
- `packages/contracts/src/repertoire-target/repertoire-target.examples.ts`
- `packages/contracts/test/repertoire-target-contract.test.mjs`
- North Star task, status, queue, decisions and open-question records

The schema is owned by `packages/contracts` because it is a stable cross-workspace JSON boundary planned for API and Angular consumers. It contains no Fastify, Prisma, Angular, persistence or provider-call implementation. The pure helpers are limited to deterministic contract resolution and change-impact semantics required by the task.

## Decisions

### Population snapshot

The v1 population source is mandatory and fixed to `LICHESS_GAMES`.

A target stores both the requested population and effective Lichess benchmark groups. Peer-derived targets also retain the completed factual `LichessGamesPeerResolution`, including evidence period, selected groups, distribution, account/provider/speed contributions, normalization profile and resolver policy version.

`MY_PEERS_PLUS_ONE` appends exactly one adjacent group above the highest factual selected group. At `2500+`, it remains capped rather than inventing another band.

An explicit benchmark group may replace a peer-derived default. The target records that override; it does not modify the factual peer resolution or Player Chess Profile.

### Defaults and overrides

Effective target values are authoritative for the current build.

Defaults are recorded per field with their original values and provenance. `overriddenFields` must exactly equal the recorded defaults whose values differ from the effective target. This supports partial profile/persona acceptance without one coarse derivation label.

### Persona and intent

Persona remains a transparent label. Ranking consumes the explicit objective dimensions rather than inferring policy from the label alone.

Target-intent soundness and theory burden exclude factual `UNKNOWN`: uncertainty remains valid in opening/profile evidence, but it is not a deliberate user choice.

A `DUBIOUS` target requires explicit `allowDeliberatelyDubious: true`; the flag is invalid for non-dubious targets.

### Mutability and recalculation

Immutable fields:

- `contractVersion`;
- `targetId`;
- `createdAt`.

Mutable fields that require candidate recalculation:

- side;
- starting point;
- speed preset;
- requested/effective population;
- account context;
- objective;
- coverage.

Mutable provenance/metadata fields do not require candidate recalculation when effective candidate inputs are unchanged:

- defaults;
- overridden fields;
- `updatedAt`;
- changed peer-resolution detail that resolves to the same requested/effective population.

RB-009 must retain an immutable or versioned target snapshot per decision history. It owns descendant invalidation, stale decisions and resume behavior.

## Canonical examples

### New course

White from the initial position, Blitz and slower, `MY_PEERS_PLUS_ONE`, balanced persona, medium theory/complexity and 80% response coverage. The factual peer snapshot resolves 1400 and 1600, then adds 1800.

### Existing-course adaptation

Black from a specific course/line anchor, Blitz, all Lichess groups, solid/low-risk/low-theory intent and 90% response coverage. It is a fully manual target with no derived defaults.

### Profile-derived target with overrides

A Player Chess Profile suggests Blitz and slower, peer population and an aggressive/high-theory objective. The user explicitly chooses Blitz, the 1800 group and a solid objective while retaining the suggested coverage. Only those changed fields are recorded as overrides.

### Alternate persona

The same FEN and account context can produce a separate Bullet surprise target with explicit dubious opt-in, low theory and lower response coverage. It remains distinct from the profile-aligned target without treating either as a factual-profile correction.

## Validation performed

Review-head CI run `30382976492` / #1251 passed:

- root lint;
- root build;
- opening-classification audit and artifact upload;
- architecture guardrails;
- database migrations;
- imported-game opening-classification audit and artifact upload;
- complete repository tests, including the new repertoire-target contract examples, invalid combinations and pure helper coverage.

Final documentation-head CI run `30383511789` / #1256 passed the same complete workflow.

The first implementation run exposed two test-expectation mismatches around Zod error wording and normalized evidence-only changes. The tests were corrected to assert the stable public behavior rather than incidental error text or duplicated peer-evidence bookkeeping, and the complete review-head workflow then passed.

## Validation skipped

- no endpoint/OpenAPI serialization test because RB-006 adds no endpoint;
- no Angular consumer test beyond the complete repository build because there is no immediate UI consumer;
- no persistence, ownership or migration test specific to RB-006 because persistence is explicitly out of scope;
- no hands-on UI review because RB-008 already owns the accepted visual direction and production UI remains RB-010/RB-013 work.

## Downstream impact

### RB-007

RB-007 receives stable target inputs for speed, effective population groups, explicit objective/risk/theory/complexity and coverage policy. It must keep target fit separate from profile fit and use `allowDeliberatelyDubious` only as explicit permission while preserving objective warnings.

### RB-009

RB-009 receives target identity/version, immutable fields and candidate-recalculation semantics. It must snapshot or version the target, retain policy/evidence provenance, and invalidate affected descendants when recalculation fields change.

### RB-013

RB-013 no longer needs to invent an override data model. It should implement preset/profile initialization and explanation using per-field defaults, provenance and `overriddenFields`, then decide whether persona/target metadata is stored with courses.

### RB-008 and production planning

The accepted setup dialog can map directly to side, starting point, account context, speed, population, persona/objective and coverage. The workbench can display factual peer evidence, profile defaults and selected target as separate layers.

## Unresolved persistence questions

RB-006 deliberately does not decide:

- whether a builder draft is persisted for the MVP;
- whether completed courses retain a full target snapshot, a target reference or selected metadata;
- how target revisions invalidate saved decisions and descendants;
- whether saved persona templates become user data;
- whether one course can retain multiple historical target versions.

RB-009 owns draft/session persistence and lifecycle. RB-013 and RB-011 own course-facing persona/target metadata and materialization decisions.

## Limitations and residual risks

- V1 supports only the Lichess Games population source; another provider requires an explicit contract version and evidence semantics.
- The contract stores FEN text but does not validate chess legality; legal/canonical position behavior belongs to chess-domain/API consumers.
- Persona preset values and Player Chess Profile-to-target mapping policies are not implemented here; only their stable provenance shape is defined.
- Numeric ranking thresholds and interpretation of risk/theory dimensions remain RB-007 policy work.
- Branch-specific target policy is not supported in v1; one target applies to one build/session snapshot.
- Course persistence remains unresolved by design.

## Standalone and North Star impact

There is no standalone runtime feature in this contract-only task.

North Star uncertainty is reduced materially: candidate ranking and builder-session work now have one explicit target boundary, factual peer evidence is reproducible without becoming mutable intent, profile/persona defaults are explainable, and manual alternatives remain first-class.

## GitHub and queue impact

- Issue #94 is completed after accepted integration.
- PR #157 was squash-merged into `main` as `9d833d910205f687b87f3c54e2ff4ea71ced3cb5`.
- PRs #145 and #146 were superseded and closed without merge.
- No new RB task or GitHub issue is required.
- RB-007 moves from `BLOCKED` to `READY`.
- RB-009 remains blocked on sufficiently stable RB-007 candidate semantics.
- RB-013 remains the next owner of preset/profile initialization UX and course metadata decisions.
- Queue order and priorities remain unchanged.