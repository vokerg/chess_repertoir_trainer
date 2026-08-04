# ONB-024 — Add administrator lifecycle previews and controls

Status: PROPOSED

Priority: P1

Order: 185

Delivery class: Implementation

GitHub issue: [#274](https://github.com/vokerg/chess_repertoir_trainer/issues/274)

Target branch: `main`

Suggested branch: `admin/onb-024-lifecycle-controls`

## Objective

Expose capability-gated administrator preview, execution, operation-status, allowed cancellation, and audit reads as thin adapters over the canonical ONB-019/020/021 lifecycle services.

## Dependencies

- ONB-005 accepted and merged;
- ONB-022 accepted and merged;
- ONB-019 accepted and merged;
- applicable ONB-020/021 operation implementation accepted and merged;
- ONB-023 for Angular controls;
- coordinate later ONB-006 cleanup exposure through the same action protocol.

## Primary repository touch points

- `apps/api/src/modules/admin/` adapters;
- canonical lifecycle application services and contracts from ONB-019/020/021;
- `@chess-trainer/contracts/admin` and lifecycle contracts;
- Clerk verified-session/reverification integration from ONB-022;
- administrator Angular feature from ONB-023;
- focused API/lifecycle/audit/reverification/UI tests.

## Scope

### API adapters

Provide capability-gated routes equivalent to:

- create lifecycle preview;
- execute from a valid preview;
- get operation status;
- request cancellation only where the canonical lifecycle contract permits it;
- browse bounded audit summaries.

The administrator route resolves actor authority and target identity, then calls the same lifecycle service used by self-service routes. It does not own deletion SQL or lifecycle state transitions.

### Reverification

Execution requires:

- valid preview bound to actor, target, kind, version/digest, and expiry;
- typed confirmation;
- idempotency key;
- signed Clerk `fva` within the configured freshness window;
- a signed one-use `reverification_id`;
- backend binding of the reverification id to actor, target, operation kind, preview digest, and idempotency key;
- rejection of stale, reused, missing, or mismatched evidence.

If the pinned Clerk JS integration cannot produce and refresh this evidence, execution remains disabled. Do not simulate reauthentication.

### Audit and retention

- use ONB-019 persisted pseudonymous audit;
- keep raw Clerk subject, email, username, PGN, provider URL, token, FEN/scenario/AI content, and arbitrary exception payloads out of audit;
- use configurable 365-day mutation-audit default;
- retain HMAC key versions until corresponding audit records expire;
- separate actor/target HMAC domains from deleted-identity tombstones;
- expose only bounded audit list/detail summaries.

### Initial action exposure

- un-analyse/un-index: eligible for administrator adapters after ONB-020;
- account purge/delete: eligible after ONB-020;
- whole-user delete: self-service first; administrator execution stays disabled until an explicit support/policy decision reopens it;
- orphan shared-position cleanup: eligible only after ONB-006 implementation through the same preview/execute/status pattern.

## Explicit exclusions

- no raw table delete/update;
- no second lifecycle operation/audit model;
- no shared administrator secret;
- no password-prompt simulation;
- no execution before canonical lifecycle dependencies exist;
- no cancellation after the lifecycle contract's mutation boundary;
- no administrator whole-user execution by default;
- no sensitive payload browsing;
- no client-coordinated deletion phases.

## Acceptance criteria

- every mutation is linked to a versioned pseudonymous administrator actor key;
- non-admin and insufficient-capability requests cannot enumerate targets;
- preview expiry/state changes fail safely;
- idempotent replay returns the same canonical operation;
- idempotency key reuse with different semantics conflicts;
- each reverification id authorizes at most one matching execution;
- stale/missing/mismatched `fva` or reverification evidence blocks execution;
- accepted long-running work returns durable `202` and survives browser/API/worker restart;
- administrator adapters cannot bypass resource fences, claim drain, bounded phases, retry, failure state, or audit;
- no parallel destructive implementation exists;
- Angular renders server state and never coordinates phases.

## Validation

- capability/target non-enumeration tests;
- preview expiry/digest/state-change tests;
- typed confirmation and idempotency tests;
- `fva` freshness and one-use reverification tests;
- replay/mismatch/concurrent execution tests;
- adapter tests proving calls enter the canonical lifecycle service;
- fence/drain/partial failure/restart tests inherited from and integrated with ONB-019/020/021;
- audit sensitive-field and key-version tests;
- Angular preview/confirm/accepted/status/failure/reverification tests;
- full API/web/contracts/lifecycle build, lint, test, OpenAPI, migration, and architecture gates.

## Claim rule

Do not claim until all applicable dependencies are DONE and `TASKS.md` promotes ONB-024 to READY. Before branching, re-inspect the final lifecycle service and pinned Clerk reverification API. Do not commit directly to `main`.
