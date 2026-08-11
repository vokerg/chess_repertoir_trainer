# RB-030 — Single-dialog Builder setup V2

Status: IN_PROGRESS

Priority: P1

Order: 230

Delivery class: Frontend product flow

Planning maturity: Agreed

GitHub issue: #320

Claimed by: ChatGPT

Claim branch: `repertoire-builder/rb-030-single-dialog-setup-v2`

Claimed at: 2026-08-10

Claim scope: single-dialog Builder setup V2; side/scope, speed, rating and one persona; remove coverage/theory as normal setup decisions; preserve exact course-position launches, RB-026 Cockpit behavior, RB-029 opponent-preparation authority and versioned V1 target snapshot compatibility

## Objective

Simplify normal Builder launch to one focused setup dialog. Persona is chosen exactly once; there is no second persona/objective step.

## Normal setup surface

Keep only understandable pre-build choices:

- repertoire side and starting scope;
- speed population;
- rating target;
- one persona: Balanced, Solid, Aggressive or Surprise.

Starting scope should provide bounded practical shortcuts using existing starting-position/session mechanics, for example White full/`1.e4`/`1.d4`/`1.c4`/`1.Nf3`/other and Black full/against `1.e4`/against `1.d4`/common flank/other. Exact labels and the `other` interaction must be designed from existing board/FEN/manual-entry patterns after inspection.

## Remove from normal setup

- opponent-response coverage slider;
- persona-specific coverage defaults;
- hard maximum-theory-burden control;
- duplicated persona/objective screens.

A future independent theory preference may return only if it has understandable operational semantics; do not preserve the current control just for compatibility.

## Persona copy

- Balanced — practical peer-tested choices with sound validation.
- Solid — established, dependable choices with strong Master/objective support.
- Aggressive — active, justified choices that accept bounded objective cost.
- Surprise — uncommon viable choices that overperform in the selected population.

## In scope

- setup UI/state and target construction compatible with RB-027/RB-029;
- starting-scope shortcuts;
- fixed exact-position/course-review launch behavior;
- destructive restart copy and tests;
- responsive/keyboard behavior.

## Out of scope

- second persona step;
- Builder Cockpit redesign;
- persisted persona templates;
- Builder-session persistence;
- automatic course creation.

## Dependencies

Coordinate final target-contract cleanup with RB-027 and RB-029. Existing-course entry points from RB-012 must remain valid.

## Acceptance criteria

- one dialog starts a normal draft and shows persona once;
- White/Black and common scoped starts use existing starting-position semantics;
- exact course-position launches remain exact and do not force an irrelevant scope choice;
- coverage/theory internals are not mandatory setup decisions;
- generated target/session snapshots remain versioned and reproducible;
- restart remains explicitly destructive;
- focused tests cover full scope, common scoped starts, fixed launches, restart and other/manual start.

## Completion

Report: none

Completed at: none
