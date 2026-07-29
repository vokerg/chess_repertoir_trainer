# ONB-001 — Define onboarding lifecycle and default preparation recipe

Status: REVIEW

Priority: P0

Order: 10

Delivery class: Research

Planning maturity: Decisioned

GitHub issue: [#148](https://github.com/vokerg/chess_repertoir_trainer/issues/148)

Claimed by: ChatGPT coding/research session for vokerg

Claim branch: `onb-001/issue-148-lifecycle-default-recipe`

Claimed at: 2026-07-29

Claim scope: inspect current lifecycle, routing, account, job, Home, progress, opening, game, Player Chess Profile, Visual Transformation, and Repertoire Builder contracts; produce the ONB-001 research report; reconcile onboarding decisions, open questions, queue, status, and bounded implementation tasks; no production implementation

## Outcome

Define a persisted, deterministic onboarding lifecycle and default product recipe that can be consumed by API, Angular, Home, mobile, import, preparation, and readiness work.

## Why this task exists

Without a lifecycle contract, import/orchestration and UI tasks would independently invent completion, skip, recovery, re-entry, and first-value semantics.

## Current repository anchors inspected

- `apps/api/prisma/schema.prisma`
- `apps/api/src/auth/current-app-user.service.ts`
- `apps/api/src/routes/externalAccounts.ts`
- current imported-game workflow, opening-analysis, and Player Chess Profile services
- `apps/web/src/app/app.routes.ts`
- `apps/web/src/app/core/auth/`
- `apps/web/src/app/features/accounts/`
- `apps/web/src/app/core/jobs/`
- current Home, progress, games, opening, and Player Chess Profile implementations
- `docs/imported-game-job-processing.md`
- `docs/opening-struggles.md`
- `docs/player-chess-profile.md`
- current Visual Transformation and Repertoire Builder issue state

## Dependencies

- ONB-000 — complete.
- Coordinates with ONB-002, ONB-003, and ONB-007.
- Functional Angular implementation must coordinate with Visual Transformation #132/#133.

## Decisions delivered

- Persist a user-level `PENDING` / `COMPLETED` / `SKIPPED` disposition separately from operational jobs.
- Use repeatable user-owned `DataPreparationRun` records with at most one non-terminal run per user.
- Create a run only when the user accepts a concrete recipe.
- Default to one selected account, a fixed inclusive UTC date-only three-calendar-month range, standard blitz and rapid, rated and unrated, newest first.
- Require bounded import plus terminal indexing with at least one indexing success for core onboarding completion.
- Let engine analysis continue after onboarding completion.
- Derive feature-specific readiness from persisted evidence and existing feature thresholds.
- Keep `/home` as signed-in entry, add resumable `/onboarding`, preserve direct protected navigation and login `returnUrl`.
- Keep skip distinct from pause/cancel.
- Adopt existing users as completed during migration; new users begin pending.
- Show exact state/counts only; no ETA before ONB-007.

## In scope completed

- State machine and persistence boundary.
- Exact default recipe wording/policy.
- First-value, readiness, and completion gates.
- Route and re-entry behavior.
- Skip, pause, cancellation, failure, retry, reset, and expansion semantics.
- Insight-readiness matrix.
- API/UI contract outline.
- Bounded implementation task proposal.

## Out of scope preserved

- Production schema, routes, Angular implementation, provider import, or worker changes.
- Final visual design.
- Repertoire generation.

## Acceptance criteria

- Every user-visible state has a server-derived meaning — satisfied.
- Initial value does not require full-history import or full analysis — satisfied.
- Defaults and expansions are explicit — satisfied.
- Re-entry works across navigation/session/device — satisfied by the persisted contract.
- Readiness is coverage/evidence-based — satisfied.
- Relationship with `/home`, Settings, job panel, #133, and #105 is explicit — satisfied.
- Follow-up tasks are bounded — satisfied through ONB-008, ONB-009, and ONB-010.

## Validation

Performed:

- direct repository and issue inspection through GitHub;
- stale branch reconciliation onto current `main`;
- paper state-machine checks for failure, recovery, skip, cancellation, restart, no-data, legacy-user, and expansion scenarios;
- canonical planning and issue allocation reconciliation.

Skipped:

- no build, test, lint, migration, browser, provider, worker, Stockfish, or deployment checks because this task changes documentation only.

## Completion

Report: `reports/ONB-001-2026-07-29-lifecycle-default-recipe.md`

Implementation tasks:

- ONB-008 / [#193](https://github.com/vokerg/chess_repertoir_trainer/issues/193)
- ONB-009 / [#194](https://github.com/vokerg/chess_repertoir_trainer/issues/194)
- ONB-010 / [#195](https://github.com/vokerg/chess_repertoir_trainer/issues/195)

Pull request: pending

Ready for review at: 2026-07-29