# ONB-005 — Second self-review addendum

Date: 2026-08-04

Task: [ONB-005](../tasks/ONB-005-admin-auth-diagnostics-actions.md)

Pull request: [#275](https://github.com/vokerg/chess_repertoir_trainer/pull/275)

## Outcome

A second review of the rebuilt branch found one canonical-queue defect and two documentation clarifications. The task orders and issue metadata were corrected before review completion.

## 1. New administrator tasks were inserted ahead of existing P0 work

The first rebuilt queue assigned ONB-022 order 76 and ONB-023 order 79. Although both tasks remained `PROPOSED`, those positions would allow supporting administrator work to become the deterministic next implementation ahead of already-planned P0 preparation/onboarding work when promoted.

That contradicted the established program ordering pattern: research allocates new immutable tasks without silently reprioritizing the existing critical path.

Correction:

- ONB-022 order changed to `190`;
- ONB-023 order changed to `200`;
- ONB-024 order changed to `210`;
- `TASKS.md`, all three task files, and issues #272/#273/#274 were reconciled.

The dependencies are unchanged. Parallel execution can still be explicitly authorized later, but the canonical queue no longer grants implicit priority.

## 2. Hosted deployment topology does not prove a globally single API instance

`docs/deployment.md` documents one Render Web Service definition for the Fastify API and a separate background worker. It does not guarantee that the API will always run exactly one replica.

Correction:

- retain the ONB-022 requirement to recheck deployed replica topology;
- do not treat the current Render service definition as proof that an in-process request budget is cluster-wide;
- keep strict query bounds as unconditional protection;
- require shared PostgreSQL/existing-infrastructure enforcement before making distributed rate-limit claims.

## 3. Initial user identity remains numeric-id only

The main report mentioned a possible non-sensitive display label in a summary projection, but application display names can still identify a person.

Normative clarification:

- the initial ONB-022 user list/detail contract uses internal numeric application user id and aggregate state only;
- display name, email, username, and raw auth subject are absent;
- any later identity lookup/display requires a separate `ADMIN_IDENTITY_READ` capability, explicit operational evidence, and access audit.

The detailed ONB-022 task and issue already use the stricter boundary.

## Validation

- inspected `docs/deployment.md` directly;
- re-read current canonical order and priorities;
- compared new task positions with existing ONB-017 through ONB-021 backlog;
- updated repository task files and GitHub issues atomically in the same review pass;
- confirmed no runtime file, schema, dependency, deployment, or authentication behavior changed.
