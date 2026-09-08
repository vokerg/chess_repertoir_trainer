# ONB-024 account/game administrator lifecycle controls

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
- OpenAPI route schemas, shared capability/error contracts, focused route/store/data-access tests, and operator documentation.

## Boundaries

The browser renders state and sends commands; it does not coordinate lifecycle phases. Whole-user deletion remains disabled pending ONB-021. Shared-position cleanup remains absent pending ONB-026. Audit browsing is limited to bounded, pseudonymous lifecycle summaries and exposes no identity hashes, verification evidence, or sensitive payloads.

## Deployment requirement

Apply migration `20260908213000_add_admin_reverification_use`. Configure Clerk's session-token custom claim `reverification_id` from `{{session.reverification_id}}`. Administrator authorization remains disabled by default and continues to use the exact Clerk-subject allow-list.

## Validation

Passed:

- `npm run build`;
- `npm run lint`;
- `npm run check:architecture`;
- `npm run check:hygiene`;
- `npm run test:contracts`;
- full web suite: 529 tests;
- full mobile suite: 22 tests;
- focused administrator web suite: 17 tests;
- isolated administrator reverification binding test;
- Prisma format, client generation, and schema validation.

`npm test` passed the dependency audit, domain suite (59 tests), contracts, API build, trap validation, and initial API integration tests, then stopped at the pre-existing shared-database `AppUser(authProvider, authSubject)` collision for `dev-single-user`. It expected HTTP 410 and received Prisma `P2002`/HTTP 500 in `account-import.compatibility-routes.test.mjs`; no project migration was applied to that shared remote database.

Browser validation against a real configured Clerk instance remains a deployment-environment check.
