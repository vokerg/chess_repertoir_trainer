# ONB-008 onboarding readiness projection implementation report

Date: 2026-08-23

Issue: #193

Pull request: #398

Branch: `onb-008/issue-193-onboarding-readiness`

## Outcome

ONB-008 adds the durable user onboarding disposition and the authenticated, server-owned readiness projection required before lifecycle commands and Angular onboarding can consume a single cross-session source of truth.

The implementation deliberately separates durable first-run disposition, repeatable physical preparation execution, and current product evidence. It reuses ONB-017/018 preparation/import state rather than introducing a second workflow engine, and it exposes no public ETA or weighted overall preparation percentage.

## Delivered implementation

### Durable disposition and convergence

- `AppUser` persists `PENDING`, `COMPLETED`, or `SKIPPED` disposition plus reason/timestamp;
- the rollout migration atomically adopts existing users as completed so legacy users are not forced through first-run onboarding;
- new users retain the database default `PENDING`;
- real `DataPreparationRun.coreReadyAt` convergence completes disposition only for an `ONBOARDING` run or a same-user `RECOVERY` retry lineage that contains `ONBOARDING`;
- `EXPANSION` alone cannot complete first-run disposition, and cross-user retry lineage cannot satisfy the completion fence;
- `SKIPPED` remains distinct from cancelling accepted preparation work.

### Authenticated readiness projection

- `GET /api/me/onboarding` is schema-backed, authenticated, ownership-scoped, and delegates to the onboarding service/read repositories;
- the latest `ONBOARDING`, `RECOVERY`, or `EXPANSION` preparation is projected with bounded targets, latest batches, milestones, aggregate progress, attention, actions, readiness, and reveals;
- target lists are capped at 16, latest technical batches at 8, actions at 4, and reveals at 3;
- provider-window percentages are emitted only when the window denominator is known;
- index/analysis fixed coverage appears only after the preceding scope is fixed, so the API does not invent an overall percentage while import can still discover games;
- retained `DataPreparationBatch` snapshots preserve technical history after child jobs are removed;
- current product readiness is derived from live imported/indexed/analysed/opening/tactical evidence rather than historical task totals.

### Readiness and tactical policy

- games/openings/analysis/tactics expose explicit `locked`, `partial`, `ready`, or `checked-empty` states;
- tactical readiness uses one dedicated policy/version-aware repository based on the current tactical thresholds hash and detection version;
- disliked tactical feedback is suppressed using the same user/game/kind/trigger key semantics as the canonical tactical list;
- the generic product aggregate does not maintain a second raw tactical-detection count.

### State and action semantics

- presentation state and physical execution status are intentionally separate: after core readiness, preparation may continue, pause, fail, or require attention while the product remains core-ready;
- post-core active preparation retains pause/cancel/recovery controls;
- returning completed users retain Home navigation during later expansion work;
- skipped users retain accepted background-work controls without letting unrelated expansion milestones overwrite durable skipped guidance;
- navigation (`VIEW_ONBOARDING`) is distinct from execution intents such as resume, pause, cancel, retry, restart, and skip;
- attention precedence keeps pause/cancel/failure execution truth visible even when product milestones are already satisfied.

### Ownership hardening

The final adversarial review found and fixed two independent read-side ownership gaps:

1. batch activity in `getScopeTotals` originally selected by preparation run id without re-fencing the owning user; it now verifies the parent run owner and has a PostgreSQL foreign-run regression;
2. target import projections originally trusted `DataPreparationTarget.currentImportRunId` after creation-time validation. Because the database foreign key itself is only by import-run id, malformed/manual data could otherwise expose another user's import status/window metadata. Both scope totals and target reads now join the pointed import only when its `userId` matches the owned preparation run and its `accountId` matches the target. A DB-backed regression deliberately creates a malformed cross-user link and proves the foreign import is projected as unknown rather than disclosed.

No repair or mutation of malformed execution state is performed by the readiness read model; it fails closed to unknown import progress.

## Acceptance and failure-state review

The implementation and focused tests cover:

- legacy adoption and new-user pending disposition;
- same-user onboarding/recovery completion lineage, expansion fencing, and cross-user retry isolation;
- running, paused, pause-requested, cancel-requested, cancelled, failed, needs-attention, core-ready, complete, and skipped presentation/action behavior;
- provider rate limiting and attention precedence;
- unknown-to-fixed provider denominator transitions;
- fixed index/analysis coverage and no public ETA/overall percentage;
- multi-account aggregation and bounded payloads;
- retained child-batch evidence after child-job history cleanup;
- current tactical policy/version evidence and checked-empty behavior;
- foreign preparation-run aggregate isolation and malformed foreign import-link isolation;
- shared contract and OpenAPI registration for the authenticated route.

## Scope intentionally not implemented

- no ONB-009 lifecycle command routes;
- no Angular onboarding/Home implementation owned by ONB-010;
- no provider adapter or account-import worker rewrite;
- no preparation candidate selection, child-job admission, or reconcile-loop duplication;
- no destructive lifecycle command/execution behavior owned by ONB-019/020/021;
- no public ETA or weighted overall preparation percentage;
- no final visual/accessibility transformation.

## Migration and integration review

The final review refreshed the branch onto current `main` after Repertoire Builder PR #401 landed. That concurrent change touches only Repertoire Builder web files and has no ONB-008 overlap.

The ONB-008 migration `20260820080000_onboarding_disposition_readiness` is ordered after the landed ONB-019 lifecycle migrations and after the durable import/preparation foundations. The reconciler advances `DataPreparationRun.coreReadyAt` in its locked durable run update, so the disposition trigger observes the authoritative physical milestone rather than a parallel application event.

## Validation environment

A local repository checkout remains unavailable in this execution environment because GitHub DNS resolution fails with:

`Could not resolve host: github.com`

No local build/test result is claimed. GitHub Actions is the executable validation authority for this connector-only implementation.

The current-main refreshed pre-hardening head `607c385f90f1a478a23d5228ca2fb2240b51eaf2` passed CI #3138 end-to-end, including dependency audit, lint, full build, opening audits, architecture/repository hygiene guardrails, the full migration chain, imported-game audits, and the complete test suite.

The exact final branch head, including the final import-link ownership regression and this review evidence, must pass the same complete GitHub Actions gate before squash merge. PR #398 validation metadata records that immutable final head/run evidence immediately before merge.

## Program-document reassessment

- `DECISIONS.md`: no architecture decision change required; this implementation consumes the accepted ONB-001/003/007/016 contracts.
- `OPEN_QUESTIONS.md`: no ONB-008 blocker was introduced by the final review.
- `ROADMAP.md` / `TASKS.md` / `STATUS.md`: downstream promotion/completion reconciliation belongs after accepted merge; this runtime PR does not opportunistically mark ONB-009/010 ready or ONB-008 done.
- ONB-009 remains owner of lifecycle commands and ONB-010 remains owner of functional Angular onboarding/Home re-entry.

## Review state

The implementation has been adversarially reviewed for current-main integration, state/action precedence, recovery/expansion lineage, ownership boundaries, retained technical evidence, tactical policy/version semantics, migration ordering, contracts/OpenAPI, and bounded query behavior.

ONB-008 remains `REVIEW`, not `DONE`, until PR #398 passes exact-head CI and is accepted/squash-merged. A separate completion-reconciliation change may update canonical queue/status records after merge without altering this runtime history.
