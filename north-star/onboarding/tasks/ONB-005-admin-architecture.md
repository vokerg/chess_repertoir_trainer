# ONB-005 — Design administrator access, diagnostics, and action model

Status: READY

Priority: P1

Order: 60

Delivery class: Research

Planning maturity: Outlined

GitHub issue: [#152](https://github.com/vokerg/chess_repertoir_trainer/issues/152)

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

## Outcome

Define a minimal operator access boundary for inspecting users and their data and later executing lifecycle operations approved by ONB-004.

## Why this task exists

The repository has authenticated user-owned routes but no administrator guard, read model, audit log, or operator UI. Support and lifecycle actions need a reviewed application boundary instead of manual database work.

## Current repository anchors to inspect

- `apps/api/src/auth/auth.config.ts`
- `apps/api/src/auth/auth.plugin.ts`
- `apps/api/src/auth/request-auth.ts`
- `apps/api/src/auth/current-app-user.service.ts`
- `apps/api/src/app.ts`
- `apps/api/src/routes/index.ts`
- `apps/api/prisma/schema.prisma`
- `apps/api/src/modules/jobs/`
- `apps/api/src/modules/courses/`
- `apps/web/src/app/app.routes.ts`
- `apps/web/src/app/core/auth/`
- current transformed shell/navigation/shared UI on the actual base branch

## Dependencies

- ONB-000.
- Mutation/action contracts depend on ONB-004.
- Cleanup action integration coordinates with ONB-006.
- Inspect current identity-provider and Visual Transformation state.

## In scope

- Access-control alternatives and threat model.
- Recommended production and development configuration.
- API module/guard boundary.
- Paginated user/account/import/job/preparation/game/course read model.
- Audit, preview, execution, idempotency, and stale-preview behavior.
- Lazy Angular operator route versus separate app decision.
- Read-only first-release scope.
- Long-running action observation and diagnostics.
- Bounded implementation task proposal.

## Out of scope

- Credentials stored in source or authority exposed to the normal client bundle.
- Production operator routes or UI.
- Destructive implementation before ONB-004.
- Impersonation, billing, CRM, or a broad support platform.

## Questions owned

See `OPEN_QUESTIONS.md` under ONB-005.

## Acceptance criteria

- Normal users cannot obtain or exercise operator authority.
- Every mutation is attributable and idempotent.
- Reads are paginated and database-aggregated.
- Read-only diagnostics can ship before mutations.
- Production and development authorization are explicitly separated.
- Any temporary access mechanism has an explicit removal boundary.
- Follow-up implementation tasks are narrow.

## Required validation

- Reinspect auth and route registration.
- Review current identity-provider documentation if material.
- Threat-model browser, API, logs, and environment configuration.
- Prototype representative read queries for boundedness.
- Identify authorization, ownership, audit, and stale-preview tests.

## Completion updates

- Report, decisions, open questions, queue, issue #152, and implementation tasks.

## Completion

Report: none

Completed at: none
