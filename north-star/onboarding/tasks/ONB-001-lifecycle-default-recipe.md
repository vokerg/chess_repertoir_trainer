# ONB-001 — Define onboarding lifecycle and default preparation recipe

Status: READY

Priority: P0

Order: 10

Delivery class: Research

Planning maturity: Outlined

GitHub issue: [#148](https://github.com/vokerg/chess_repertoir_trainer/issues/148)

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

## Outcome

Define a persisted, deterministic onboarding lifecycle and default product recipe that can be consumed by API, Angular, Home, mobile, import, preparation, and readiness work.

## Why this task exists

Without a lifecycle contract, import/orchestration and UI tasks would independently invent completion, skip, recovery, re-entry, and first-value semantics.

## Current repository anchors to inspect

- `apps/api/prisma/schema.prisma`
- `apps/api/src/auth/current-app-user.service.ts`
- `apps/web/src/app/app.routes.ts`
- `apps/web/src/app/core/auth/`
- `apps/web/src/app/features/accounts/`
- `apps/web/src/app/core/jobs/`
- `docs/player-chess-profile.md`
- current progress, games, opening, and Home implementations on the actual base branch
- `transformation/` and issue #133

## Dependencies

- ONB-000.
- Coordinate with ONB-002, ONB-003, and ONB-007.
- Inspect current Visual Transformation branch/PR state.

## In scope

- State machine and persistence boundary.
- Exact default recipe wording/policy.
- first-value, readiness, and completion gates.
- route and re-entry behavior.
- skip, pause, cancellation, failure, retry, reset, and expansion.
- insight-readiness matrix.
- API/UI contract outline.
- bounded implementation task proposal.

## Out of scope

- Production schema, routes, Angular implementation, provider import, or worker changes.
- Final visual design.
- Repertoire generation.

## Questions owned

See `OPEN_QUESTIONS.md` under ONB-001.

## Acceptance criteria

- Every user-visible state has a server-derived meaning.
- Initial value does not require full-history import or full analysis.
- Defaults and expansions are explicit.
- Re-entry works across navigation/session/device.
- Readiness is coverage/evidence-based.
- Relationship with `/home`, settings, job panel, #133, and #105 is explicit.
- Follow-up tasks are bounded.

## Required validation

- Reinspect current routes/stores/services.
- Map existing feature data prerequisites.
- Test state machine against failure/re-entry scenarios on paper or executable model.
- Record unresolved dependencies rather than guessing.

## Completion updates

- Report path.
- DECISIONS and OPEN_QUESTIONS.
- ROADMAP, TASKS, STATUS.
- Issue #148.
- New implementation tasks/issues.

## Completion

Report: none

Completed at: none
