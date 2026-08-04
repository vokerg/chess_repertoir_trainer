# ONB-005 — Third self-review addendum

Date: 2026-08-04

Task: [ONB-005](../tasks/ONB-005-admin-auth-diagnostics-actions.md)

Pull request: [#275](https://github.com/vokerg/chess_repertoir_trainer/pull/275)

## Outcome

A third adversarial review found one material completion defect: the branch defined a final administrator architecture and implementation tasks but did not reconcile four canonical program records required by the completion protocol.

The omitted files still described ONB-005 as `READY` or provisional, left all ONB-005 research questions open, omitted the implementation phases, and identified ONB-005 as the next task. Merging in that state would have left `main` internally contradictory even though the primary report was substantially correct.

The defect is corrected. A subsequent implementation-feasibility pass found two narrower handoff conflicts: the proposed `(createdAt, id)` user cursor assumed an `AppUser.createdAt` index that does not exist, and a required multi-instance PostgreSQL request budget would contradict ONB-022's migration-free scope if no shared mechanism already exists. Both contracts are corrected below.

The review then rechecked task ordering, issue ownership, changed-file scope, current repository state, official Clerk assumptions, PR discussion state, and final validation requirements.

## Material defect found

The branch had not updated:

- `DECISIONS.md`;
- `OPEN_QUESTIONS.md`;
- `ROADMAP.md`;
- `STATUS.md`.

This violated the program completion rule in `GITHUB_ISSUES.md`, which requires all four records to be reassessed before closure.

The omissions had practical consequences:

- D-042 and D-043 remained provisional despite the report finalizing them;
- ONB-005 questions still asked whether to use a shared secret, whether Angular sufficed, and how recent authentication/audit retention worked;
- the roadmap still marked ONB-005 `READY` and did not describe ONB-022/023/024 delivery phases;
- status still listed ONB-005 as the next claimable task and as a production blocker;
- ONB-022 had not been promoted after its research dependency was satisfied.

## Corrections

### Decision register

`DECISIONS.md` now locks:

- Clerk as the only production login boundary and a server-only exact-subject bootstrap policy;
- the direct-link Angular boundary with API authority;
- bounded aggregate diagnostics and sensitive-field exclusions;
- signed `fva` plus one-use request-bound `reverification_id` for administrator execution;
- topology-aware request-budget enforcement;
- configurable 30/365-day operational retention seeds and domain-separated versioned HMAC keys;
- deferral of administrator whole-user deletion.

It explicitly rejects:

- `AppUser.isAdmin`;
- Clerk Organizations solely for global operators;
- shared secrets or simulated reauthentication;
- an unbounded support console.

### Open-question ownership

`OPEN_QUESTIONS.md` now records no unresolved ONB-005 research question. It delegates concrete implementation choices to:

- ONB-022 for configuration names, verified-session shape, capabilities, cursors, query plans, logging, and topology-specific budgets;
- ONB-023 for Angular component/store behavior and accessibility;
- ONB-024 for pinned-Clerk reverification integration and lifecycle adapters;
- ONB-019/020/021 for physical lifecycle persistence and execution.

### Roadmap and status

`ROADMAP.md` now:

- marks ONB-005 complete;
- shows read-only administration independently from destructive lifecycle delivery;
- adds phases for ONB-022, ONB-023, and ONB-024;
- removes obsolete ONB-005 blockers from ONB-019/020/021;
- preserves ONB-024 dependency on canonical lifecycle services and proven reverification.

`STATUS.md` now:

- records the ONB-005 contract and validation;
- promotes ONB-022 to `READY` without changing the deterministic next research task;
- identifies ONB-006 as the next ordered task;
- records current implementation blockers rather than completed research questions.

### Queue and task completion

The final queue marks ONB-005 `DONE`, promotes ONB-022 to `READY`, retains ONB-023/024 as `PROPOSED`, and keeps orders 190/200/210 so administration support work does not pre-empt the existing product critical path.

### Migration-free user cursor

The primary report proposed a cursor over `(createdAt, id)`. The current `AppUser` model has a primary-key index on `id` but no index on `createdAt`. Requiring that cursor while also declaring ONB-022 migration-free would either produce an avoidable sort/scan path or force an undeclared migration.

Normative correction:

- initial user pagination uses deterministic `id DESC` keyset ordering;
- the opaque versioned cursor contains the last returned user id;
- created/updated timestamps remain response fields but are not the initial sort key;
- any later created-time sort or index requires measured evidence and a separately coordinated migration.

### Migration-free request-budget boundary

The primary report allowed a PostgreSQL-backed shared budget for multiple API replicas while ONB-022 explicitly prohibited schema changes. A real time-window rate budget generally requires shared state; the current repository has no existing administrator budget table or shared limiter.

Normative correction:

- strict page/filter/query/concurrency bounds and security telemetry are unconditional;
- a verified single API instance may use an explicitly best-effort in-process budget;
- a multi-instance deployment may use already-existing shared infrastructure if it supplies a real budget without new persistence;
- if no shared mechanism exists, ONB-022 does not emit `429` or claim distributed request-rate enforcement;
- any new PostgreSQL persistence or infrastructure for shared rate limiting is a separate reviewed task, preserving ONB-022's migration-free scope.

### Historical report metadata

The primary report retains `Status: review candidate` as its creation-stage metadata. Completion authority is carried by the ONB-005 task record, `TASKS.md`, `STATUS.md`, this final addendum, the merged PR, and the closed completed issue. The retained historical header is not a live queue or policy state.

## External revalidation

Current official Clerk documentation was rechecked during this review:

- session-token V2 contains signed factor-verification-age (`fva`) information;
- custom session claims can carry a one-use `reverification_id` for backend action correlation;
- Organization roles and permissions are evaluated in active-Organization context and therefore remain inappropriate as the default global-operator model for this repository.

No external finding changed the architecture.

## Final adversarial checks

The review checked for:

- stale live `READY`, `REVIEW`, or provisional ONB-005 state outside explicitly historical report metadata;
- ONB-005-owned questions left unresolved;
- ONB-022 still blocked solely by completed ONB-005;
- administrator tasks reordering P0 product work;
- pagination contracts that require undeclared indexes;
- shared-budget requirements that violate migration-free scope;
- runtime, schema, migration, dependency, deployment, or workflow changes;
- unresolved PR review threads or submitted change requests;
- branch divergence from current `main`;
- unverified claims about API replica count, recent authentication, Clerk Organizations, sensitive-field safety, or distributed rate limiting.

No further material architecture defect was found after the canonical and feasibility corrections.

## Validation gate

The branch remains documentation/planning only. GitHub Actions on the final reconciled head is the authoritative build, lint, test, migration, and architecture gate because this runtime cannot resolve `github.com` for a local clone.

Do not merge unless:

- the final branch remains based on current `main`;
- the complete changed-file set is documentation/planning only;
- no review thread or requested change is outstanding;
- final-head CI succeeds;
- PR #275 is mergeable.

## Files inspected in this review

- all PR #275 changed files and patches;
- `apps/api/prisma/schema.prisma`, especially the `AppUser` indexes;
- `north-star/onboarding/DECISIONS.md`;
- `north-star/onboarding/OPEN_QUESTIONS.md`;
- `north-star/onboarding/ROADMAP.md`;
- `north-star/onboarding/STATUS.md`;
- `north-star/onboarding/TASKS.md`;
- `north-star/onboarding/GITHUB_ISSUES.md`;
- all ONB-005 reports and task files;
- ONB-022/023/024 issues and task files;
- PR #275 metadata, reviews, comments, and review threads;
- current `main` comparison;
- official Clerk session-token, reverification, custom-claim, and Organization authorization documentation.
