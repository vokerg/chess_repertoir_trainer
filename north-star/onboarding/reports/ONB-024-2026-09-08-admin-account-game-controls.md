# ONB-024 account/game administrator lifecycle controls

Pull request: [#417](https://github.com/vokerg/chess_repertoir_trainer/pull/417)

## Outcome

The administrator page now previews and controls the four canonical ONB-020 account/game lifecycle actions without duplicating destructive orchestration. The API resolves administrator authority and target identity, then delegates to the existing coordinator.

## Delivered

- Separate diagnostics, lifecycle-preview, and lifecycle-execute capabilities decided by the server.
- Target-bound preview, execute, status, and permitted stop routes.
- Pseudonymous administrator actor and target identities persisted in the existing lifecycle operation and audit records.
- Signed Clerk `fva` freshness and `reverification_id` checks before execution.
- A uniquely persisted one-use record for every consumed reverification identifier, bound to actor, target, action, preview, operation, and idempotency key, including partial-operation resume.
- Bounded lifecycle operation and pseudonymous audit summaries in recent-work diagnostics.
- Angular action selection, exact impact preview, typed confirmation, Clerk reverification, durable state refresh, and stop request.
- Client-side invalidation guards that discard stale preview responses and re-check the bound preview after reverification before execution.
- OpenAPI route schemas, shared capability/error contracts, focused route/store/data-access tests, and operator documentation.

## Boundaries

The browser renders state and sends commands; it does not coordinate lifecycle phases. Whole-user deletion remains disabled pending ONB-021. Shared-position cleanup remains absent pending ONB-026. Audit browsing is limited to bounded, pseudonymous lifecycle summaries and exposes no identity hashes, verification evidence, or sensitive payloads.

## Deployment requirement

Apply migration `20260908213000_add_admin_reverification_use`. Configure Clerk's session-token custom claim `reverification_id` from `{{session.reverification_id}}`. Administrator authorization remains disabled by default and continues to use the exact Clerk-subject allow-list.

## Validation

Pull-request CI is the authoritative final validation for the current head and runs the repository's dependency audit, lint, build, architecture and hygiene guardrails, database migrations, and full test suites.

Focused regression coverage includes:

- administrator capability and target-authorization boundaries;
- one-use reverification binding for initial execution and partial resume;
- supported Clerk session reverification plus fail-closed token refresh;
- OpenAPI bodyless stop-action convergence;
- stale-preview invalidation, including input changes while preview or reverification work is in flight.

Browser validation against a real configured Clerk instance remains a deployment-environment check.
