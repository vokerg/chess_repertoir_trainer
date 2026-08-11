# RB-030 — Single-dialog Builder setup V2

Status: DONE

Priority: P1

Order: 230

Delivery class: Frontend product flow

Planning maturity: Delivered on PR #335

GitHub issue: #320

Claimed by: ChatGPT

Claim branch: `repertoire-builder/rb-030-single-dialog-setup-v2`

Claimed at: 2026-08-10

Claim scope: single-dialog Builder setup V2; side/scope, speed, rating and one persona; remove coverage/theory as normal setup decisions; preserve exact course-position launches, RB-026 Cockpit behavior, RB-029 opponent-preparation authority and versioned V1 target snapshot compatibility

## Objective

Simplify normal Builder launch to one focused setup dialog. Persona is chosen exactly once; there is no second persona/objective step.

## Delivered normal setup surface

The integrated setup keeps only understandable pre-build choices:

- repertoire side and starting scope;
- speed population;
- rating target;
- one persona: Balanced, Solid, Aggressive or Surprise.

Starting scope reuses the existing chess/session boundary:

- White: full repertoire, `1.e4`, `1.d4`, `1.c4`, `1.Nf3`, or Other;
- Black: all White first moves, against `1.e4`, against `1.d4`, against `1.c4`, against `1.Nf3`, or Other;
- Other accepts FEN, PGN, SAN, or UCI move sequences and resolves them to the exact draft root FEN;
- exact existing-course launches keep their fixed course position and do not expose a misleading broader scope choice.

## Removed from normal setup

- opponent-response coverage slider;
- persona-specific coverage defaults;
- hard maximum-theory-burden control;
- duplicated persona/objective screens.

Coverage is now workbench feedback from selected opponent replies under RB-029. Theory burden is not a separate V2 setup decision.

## Compatibility boundary

The existing V1 `RepertoireTarget` schema remains reproducible without restoring the removed controls as hidden product decisions.

- `coveragePercent` remains route-local compatibility data fixed at `80` while V2 opponent recommendation/coverage does not consume it as intent;
- `maximumTheoryBurden` remains compatibility data fixed to the non-restrictive `HIGH` ceiling so old Candidate Decision theory filtering cannot silently reject candidates according to an invisible setup choice;
- V2 target defaults use `2026-08-builder-v2` provenance for this compatibility material;
- no new persistence, session storage, queue, job, schema/migration, or automatic course-write path was introduced.

## Persona copy

- Balanced — practical peer-tested choices with sound validation.
- Solid — established, dependable choices with strong Master/objective support.
- Aggressive — active, justified choices that accept bounded objective cost.
- Surprise — uncommon viable choices that overperform in the selected population.

## Acceptance criteria

- [x] one dialog starts a normal draft and shows persona once;
- [x] White/Black and common scoped starts use existing starting-position/session semantics;
- [x] exact course-position launches remain exact and do not force an irrelevant scope choice;
- [x] coverage/theory internals are not mandatory setup decisions;
- [x] generated target/session snapshots remain versioned and reproducible;
- [x] restart remains explicitly destructive;
- [x] focused tests cover full scope, common scoped starts, fixed launches, restart and other/manual start.

## Validation

- final implementation head `621ee6abb9a311646859357f8de41d4a6c4528e7` passed CI #2478 (`31420953443`), including lint, build/template compilation, architecture guardrails, migrations, audits and the complete test step;
- final self-review added the setup-scope-to-existing-start-path bridge assertion and corrected the hidden theory compatibility ceiling to `HIGH`;
- PR #335 was squash-merged to `main` as `9bfcf3f5b4337c827719f5ee170bcd5f67b6f3c2` on 2026-08-11;
- issue #320 is closed as completed.

## Completion

Report: `../reports/RB-030-2026-08-11-single-dialog-setup-v2-closure.md`

Pull request: #335

Completed at: 2026-08-11
