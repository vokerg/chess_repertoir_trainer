# ONB-005 — Design administrator authentication, diagnostics, and action model

Status: DONE

Priority: P1

Order: 60

Delivery class: Research

GitHub issue: [#152](https://github.com/vokerg/chess_repertoir_trainer/issues/152)

Claimed by: ChatGPT research session for `vokerg`

Claim branch: `onb-005/issue-152-admin-auth-diagnostics`

Claimed at: 2026-08-04

Pull request: [#275](https://github.com/vokerg/chess_repertoir_trainer/pull/275)

## Outcome

Define a minimal production-defensible operator boundary that can inspect bounded aggregate user/account/work state and later invoke the same canonical lifecycle operations as self-service without impersonation, leaked authority, raw-table mutation, simulated re-authentication, or a parallel destructive state machine.

## Final direction

- reuse normal Clerk authentication as the only production login boundary;
- add a server-only administrator policy after verified Clerk authentication;
- bootstrap with an exact Clerk-subject allowlist, disabled by default and hidden behind a replaceable capability interface;
- do not add a shared secret, email allowlist, `AppUser.isAdmin`, client role, separate login, or Clerk Organizations solely for global operators;
- retain a minimal verified session context for `sid`, token version, issued-at/JWT id, `fva`, optional `reverification_id`, and a future small global admin claim;
- ship migration-free read-only API diagnostics before Angular and before mutation adapters;
- use internal numeric user id only in the initial identity projection;
- expose a lazy direct-link `/admin` feature with no required normal-navigation item;
- require signed recent factor age plus one-use reverification id for destructive administrator execution;
- keep execution disabled until that flow is proven with the pinned Clerk JS integration;
- route every mutation through ONB-019/020/021 lifecycle services;
- retain read-access security logs for a configurable 30-day default and lifecycle mutation audit for a configurable 365-day default, both requiring explicit production confirmation;
- use exact row counts rather than untrustworthy per-user byte estimates;
- require request-budget enforcement to match verified API replica topology;
- keep administrator whole-user deletion disabled until a separate support/recovery policy decision;
- allocate ONB-022, ONB-023, and ONB-024 at orders 190/200/210 so supporting administration work does not pre-empt the existing product critical path.

## Dependencies consumed

- ONB-000 program foundation;
- ONB-004 destructive lifecycle, fence, drain, preview, idempotency, audit, and shared-service boundary;
- ONB-007 queue/heartbeat/reconcile/rate-limit/stage-duration warning semantics and operation budget envelope;
- current Clerk/dev-single-user authentication and current Angular auth/navigation patterns;
- current Render/Neon/Vercel deployment documentation;
- ONB-006 cleanup exposure boundary;
- ONB-019/020/021 for persisted mutation execution.

## Deliverables

- `reports/ONB-005-2026-08-04-admin-auth-diagnostics-actions.md`;
- `reports/ONB-005-2026-08-04-self-review-addendum.md`;
- `reports/ONB-005-2026-08-04-second-self-review-addendum.md`;
- `reports/ONB-005-2026-08-04-third-self-review-addendum.md`;
- `tasks/ONB-022-admin-authorization-diagnostics-foundation.md`;
- `tasks/ONB-023-admin-diagnostics-angular.md`;
- `tasks/ONB-024-admin-lifecycle-controls.md`;
- corrected GitHub issue definitions #272, #273, and #274;
- canonical `DECISIONS.md`, `OPEN_QUESTIONS.md`, `ROADMAP.md`, `STATUS.md`, `TASKS.md`, and `GITHUB_ISSUES.md` reconciliation.

## In scope completed

- exact administrator identity/bootstrap strategy;
- future claim migration boundary;
- threat model;
- verified-session and capability contracts;
- Fastify module/guard and shared-contract placement;
- bounded database aggregate read model;
- sensitive-field exclusions;
- warning-code and partial-section semantics;
- honest request-budget/deployment-topology boundary;
- structured read-access logging;
- mutation audit retention/key rotation handoff;
- recent-auth/reverification contract;
- self-service versus administrator action boundary;
- Angular lazy-route/store/navigation boundary;
- implementation issue decomposition, ordering, and exclusions;
- canonical decision/question/roadmap/status reconciliation.

## Out of scope preserved

- production administrator API or UI;
- Prisma migration;
- destructive execution;
- audit/lifecycle schema;
- Clerk Organizations rollout;
- global authentication SDK rewrite;
- support impersonation;
- display name/email/username search;
- full PGN/course/position/AI browsing;
- arbitrary exports or SQL;
- new queue, Redis, broker, or deployment.

## Acceptance assessment

- authority is server-derived and absent from normal browser configuration: satisfied;
- production dev-single-user cannot become administrator: satisfied by startup rejection contract;
- mutations are attributable: satisfied by versioned pseudonymous actor keys and ONB-019 audit;
- lists are cursor-paginated and database-aggregated: satisfied;
- read-only diagnostics can ship independently: satisfied by migration-free ONB-022;
- dev and production behavior are explicit: satisfied;
- ONB-004/006/007 and Clerk dependencies are explicit: satisfied;
- recent auth is backed by signed claims and non-replay: satisfied by `fva` plus one-use `reverification_id` contract;
- first-release metadata and footprint scope are bounded: satisfied;
- rate/abuse controls do not overclaim deployment guarantees: satisfied;
- new implementation tasks do not silently reorder existing P0 work: satisfied;
- decision, question, roadmap, status, queue, issue, and task records agree: satisfied after third self-review correction.

## Validation

- current queue/branch/issue/PR state reconciled after ONB-007 merge;
- current API auth, app factory, route registration, module, schema, contracts, jobs, and tests inspected;
- current Angular route, navigation, auth, interceptor, API, data-access, and signal-store patterns inspected;
- current hosted deployment guide inspected;
- official Clerk session, authorized-party, reverification, custom-claim, and Organization authorization docs reviewed and revalidated during the third review;
- assumptions independently challenged and corrected in three self-review addenda;
- canonical completion files reconciled;
- no production code, schema, migration, dependency, workflow, worker, authentication, deployment, or UI behavior changed;
- final-head GitHub Actions is the authoritative repository gate because local clone/build was unavailable in this runtime.

## Completion

Completed through squash-merged PR #275 after final-head CI, mergeability, changed-file, branch-divergence, and review-thread checks passed.
