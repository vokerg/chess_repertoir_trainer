# ONB-010 — Build functional onboarding and Home re-entry

Status: PROPOSED

Priority: P1

Order: 100

Delivery class: Implementation

Planning maturity: Decisioned by ONB-001; blocked on functional backend lifecycle

GitHub issue: [#195](https://github.com/vokerg/chess_repertoir_trainer/issues/195)

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

## Outcome

Build the Angular first-run, progress, recovery, and Home re-entry experience on top of the server-owned onboarding contract without duplicating orchestration or recommendation logic in the browser.

## Why this task exists

The product needs a usable functional flow after durable lifecycle and commands exist. Home must consume one authoritative preparation projection while direct protected navigation and the technical global job panel remain intact.

## Dependencies

- ONB-008 / #193 disposition/readiness projection.
- ONB-009 / #194 lifecycle commands.
- Functional import/preparation implementations produced from ONB-002 and ONB-003.
- Coordinate implementation base and shared primitives with Visual Transformation #132 and #133.

## In scope

- Protected `/onboarding` route.
- Typed HTTP data access and feature store.
- Account selection/connection handoff and explicit recipe review.
- Start, skip, pause, resume, cancel, retry, and expansion controls from server-allowed actions.
- Exact stage/count/readiness/warning presentation without unapproved ETA.
- `/home` full Start/Resume treatment before core readiness and compact preparation card afterward.
- Cross-session/device re-entry through server state.
- Coexistence with the root imported-game job panel.
- Focused router/store/component tests and browser validation.

## Out of scope

- Provider, worker, Prisma, or lifecycle business logic in Angular.
- Client-side batching or workflow advancement.
- Final product-wide visual/accessibility polish owned by #133.
- Native mobile onboarding UI.
- Automated repertoire or course generation.

## Acceptance criteria

- Onboarding can be left and resumed from another route, session, or device.
- Signed-in users are not globally trapped behind onboarding.
- Login return URLs and existing protected routes remain valid.
- Home consumes the authoritative onboarding projection instead of independently deriving lifecycle.
- Skip and cancel are visibly and behaviorally distinct.
- Partial and failure states expose deterministic actions.
- Technical child jobs remain available through the global job panel.
- Responsive, keyboard, and basic screen-reader behavior are validated, with final polish deferred to #133.

## Required validation

- Focused Angular store/component/router tests.
- First-run, active, no-data, partial-failure, all-index-failed, skipped, core-ready, and returning browser scenarios.
- Direct-route and login-returnUrl regression tests.
- Job-panel coexistence checks.
- Representative desktop, compact, narrow, keyboard, and screen-reader smoke checks.

## Completion

Report: none

Pull request: none

Completed at: none