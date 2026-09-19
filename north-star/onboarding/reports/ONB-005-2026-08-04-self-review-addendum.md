# ONB-005 — Self-review addendum

Date: 2026-08-04

Task: [ONB-005](../tasks/ONB-005-admin-auth-diagnostics-actions.md)

Pull request: [#275](https://github.com/vokerg/chess_repertoir_trainer/pull/275)

## Outcome

The initial ONB-005 branch was not reviewable. It contained only a broad report and task stub, did not reconcile current `main`, did not inspect the actual Angular navigation/auth integration, did not verify current Clerk session/reverification contracts, created follow-up issues before the architecture was sufficiently bounded, and omitted the canonical program files expected from completed North Star research.

The branch was force-reset to current `main` after ONB-007 merged and rebuilt. This addendum records the defects found and the corrections applied. It is normative where it narrows or corrects the main report.

## Problems found

### 1. The branch was based on stale queue state

The first pass treated ONB-007 as still under review. PR #266 subsequently merged and current `main` explicitly names ONB-005 as the next deterministic task. Continuing on the old branch head would have produced an avoidable planning conflict.

Correction:

- reset the ONB-005 branch to current `main`;
- consume the final ONB-007 warning, transaction-budget, and no-ETA handoffs;
- keep ONB-005 as the correct next task rather than switching to a lower-order item.

### 2. Repository inspection was too shallow

The first pass inspected the top-level auth hook, route registry, and schema but claimed frontend and implementation directions without reading:

- Angular routes;
- the actual static navigation composition;
- Angular auth/token refresh behavior;
- the HTTP interceptor;
- feature store/data-access patterns;
- app-factory auth configuration tests;
- contract subpath exports;
- existing job route projections.

Correction:

- inspect those files directly;
- make the lazy `/admin` route fit the existing normal `authGuard`, typed API, and feature-provided signal-store patterns;
- remove the assumption that the current static navigation can automatically hide/reveal an administrator item;
- require no normal-navigation entry in the first UI release.

### 3. “Recent authentication” was asserted without retained evidence

The current auth plugin discards Clerk session claims after creating `RequestAuth`. The first pass proposed recent authentication without proving what signed evidence exists or how it reaches the lifecycle action.

Correction:

- verify Clerk session-token V2 `fva` semantics;
- verify Clerk's one-time `reverification_id` pattern;
- require a separate minimal verified session context containing only normalized session/freshness fields;
- bind one reverification id to one actor/target/action/preview/idempotency request;
- keep administrator execution disabled if the pinned Clerk JS integration cannot complete that flow.

### 4. Clerk Organizations were treated as the obvious future migration

Clerk Organization roles are scoped to an active Organization and intended for multi-tenant B2B applications. This repository has no Organization context and models product data under one `AppUser` owner.

Correction:

- reject introducing Organizations solely for global product operators;
- keep an exact-subject allowlist as the minimal bootstrap;
- place it behind a stable policy interface;
- identify a small signed global custom claim as the more compatible future migration, subject to token-size and refresh behavior;
- reconsider Organizations only if the product later adopts genuine tenancy.

### 5. The diagnostics scope was still too permissive

The first pass allowed a vague “display label”, masked identity capability, and data-footprint estimates without proving the operational need or feasibility.

Correction:

- initial lookup is numeric application user id only;
- email/username search and identity detail are deferred behind a separate capability and evidence requirement;
- course diagnostics are counts/timestamps only, never move trees;
- data footprint is exact row counts by approved model family;
- per-user byte estimates are rejected because current PostgreSQL storage metrics are relation-wide and current rows do not provide trustworthy attribution.

### 6. Rate limiting was described as solved without an implementation basis

The repository has no rate-limit dependency or external shared counter. An in-process limiter would not be globally authoritative in a multi-instance deployment.

Correction:

- require strict pagination/filter bounds and query-shape tests regardless of limiter;
- introduce an injectable `AdminRequestBudget` seam;
- verify deployment topology during ONB-022;
- permit an in-process bucket only as an explicitly best-effort single-instance guard;
- require PostgreSQL/existing-infrastructure shared enforcement for multiple instances;
- prohibit a new Redis/service dependency for this feature;
- return `429` only when a real budget is enforced.

### 7. Audit retention was left as an unowned future choice

ONB-005 explicitly owns retention and key-rotation policy. Leaving it fully open would block ONB-019 and ONB-024.

Correction:

- set configurable operational defaults of 30 days for read-access security logs and 365 days for persisted lifecycle mutation audit;
- state that these are operational defaults, not legal claims;
- retain old HMAC key versions in read-only form until their audit records expire;
- separate actor/target HMAC domains from deleted-identity tombstones.

### 8. The follow-up tasks were not sufficiently bounded

The first issue drafts mixed authorization, read models, Angular navigation, lifecycle controls, and audit without exact dependency or exclusion boundaries.

Correction:

- ONB-022 requires no Prisma migration and owns server authorization/read-only diagnostics only;
- ONB-023 owns the lazy Angular diagnostics feature and does not require a normal-navigation item;
- ONB-024 depends on the canonical lifecycle foundation and owns only adapters/reverification/UI controls;
- whole-user administrator execution is not enabled by default;
- task files specify concrete paths, acceptance, validation, and forbidden approaches.

### 9. Canonical program reconciliation was missing

Accepted ONB research updates queue, decision, open-question, status, roadmap, issue mapping, and downstream task records. The first branch changed only two files.

Correction:

- add detailed ONB-022/023/024 task files;
- update issue bodies to match the corrected contracts;
- update task queue and issue mapping on the branch;
- explicitly reassess decisions, open questions, roadmap, and status in the PR review record;
- keep the PR draft until branch validation and canonical reconciliation are complete.

## Adversarial review of the corrected recommendation

### Could `AppUser.isAdmin` still be simpler?

It would be simpler mechanically, but it creates an authority write path in the product database, couples operator access to ordinary identity upsert and deletion behavior, requires a privileged bootstrap mutation, and makes Clerk revocation/configuration less direct. The small server policy is safer and does not require a migration.

Conclusion: retain the server-only policy.

### Is an exact subject allowlist operationally fragile?

Yes. It requires deployment/configuration change for membership changes and does not provide a role-management UI. The initial operator population is expected to be very small, and the allowlist is deliberately a bootstrap behind a replaceable interface. It is safer than a shared secret or email match and materially smaller than introducing tenancy.

Conclusion: acceptable for the first release with disabled-by-default configuration and startup validation.

### Should the API migrate to Clerk's backend SDK now?

Clerk recommends official authentication helpers, but the repository currently uses `jose` directly and already validates issuer, audience, and authorized parties. Adding the backend SDK solely for ONB-005 would be a dependency/authentication rewrite beyond this research scope. ONB-022 should first extend the existing verified-claim normalization and test it. A future auth-hardening task may migrate the whole plugin coherently.

Conclusion: do not add the SDK opportunistically in ONB-022; preserve official claim semantics and tests.

### Is direct-link-only `/admin` discoverable enough?

It is intentionally operator-facing, not normal-user discoverability. Adding capability-aware navigation requires shared bootstrap state and changes the currently static navigation component. That may be reasonable later but is not required to ship safe diagnostics.

Conclusion: direct link/bookmark first; conditional navigation is an explicit ONB-023 enhancement, not assumed infrastructure.

### Are 30/365-day retention defaults arbitrary?

They are operational starting points rather than legal requirements. The important architecture decision is separate retention classes, configurability, and key-version survival for the retained period. Production can adjust them through reviewed deployment policy.

Conclusion: keep defaults clearly labelled and configurable.

### Does numeric-id-only lookup make support impractical?

It limits convenience, but avoids creating a PII search surface before a concrete support workflow exists. User/account pages and support reports can expose internal ids to the user/operator where appropriate later. An audited exact email lookup can be added behind `ADMIN_IDENTITY_READ` if evidence shows it is required.

Conclusion: numeric id first; identity search deferred.

### Can read diagnostics really avoid a Prisma migration?

Yes for the first slice: current `AppUser`, `ExternalAccount`, `ImportedGame`, `ImportRun`, `JobRun`, and `JobTask` rows support bounded aggregate reads. Future preparation/lifecycle models become additional optional sections. Persisted read-audit tables are not required initially; structured access logs suffice. Mutation audit remains ONB-019-owned.

Conclusion: ONB-022 should stay migration-free and avoid schema collision.

### Is a PostgreSQL-backed request budget excessive?

Possibly for one API instance. The corrected decision does not mandate it unconditionally; it requires deployment topology to be verified and forbids calling an in-memory bucket globally authoritative. Strict query bounds remain the primary safety control.

Conclusion: exact budget mechanism remains ONB-022-local after topology inspection.

## Remaining risks

- The pinned Clerk JS version's exact client reverification API still requires implementation verification; destructive administrator execution stays disabled until proven.
- Production API instance topology has not been recorded in the inspected repository files; request-budget enforcement must not assume one instance.
- Future ONB-019 schema names and retention cleanup mechanics are intentionally not pre-designed here.
- Current manual JWT verification remains a broader authentication-maintenance risk outside ONB-005; ONB-022 must add claim-shape tests but should not silently rewrite global authentication.
- Read-model aggregate performance remains unmeasured until representative fixture/query-plan validation in ONB-022.

## Validation performed

- rechecked current `main`, queue order, issue state, branch divergence, and PR state;
- compared accepted ONB-004 and ONB-007 research change sets and review standards;
- inspected current API auth, app factory, route, module, contracts, schema, and job conventions;
- inspected current Angular routing, navigation, auth/token, interceptor, API, and signal-store conventions;
- reviewed current official Clerk session token, authorized-party, reverification, custom-claim, and Organization role documentation;
- challenged the allowlist, Organizations, recent-auth, navigation, rate-limit, retention, identity-search, migration, and read-model choices;
- corrected the report and implementation decomposition accordingly.

## Files inspected in this review

- all files listed in the main ONB-005 report;
- current `main` commits and ONB queue after PR #266;
- PR #263 and PR #266 changed-file inventories;
- PR #275 metadata/diff;
- issue #152 comments and handoffs;
- issue #272, #273, and #274 drafts.
