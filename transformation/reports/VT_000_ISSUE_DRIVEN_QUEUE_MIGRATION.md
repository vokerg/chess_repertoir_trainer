# VT-000 Issue-Driven Queue Migration

Date: 2026-07-27

Branch: `visual-transformation/vt-000-issue-driven-queue`

Target: `visual_transformation`

Program issue: #122

Pull request: #134

Disposition: approved and squash-merged into `visual_transformation`

## Purpose

Move live Visual Transformation execution coordination from a manually maintained prose queue in repository status documentation to an ordered GitHub Issue queue, while keeping repository documents authoritative for visual direction, architecture, decisions, acceptance criteria, integrated history, validation, and reports.

The migration also reconciles Phase 1D after its approved squash merge.

## Work completed

- verified PR #120 was squash-merged into `visual_transformation` as `bf9308d65b61323d534f99eeda0c0223907c20bb`;
- verified post-merge integration CI run #1051 passed;
- created branch `visual-transformation/vt-000-issue-driven-queue` from the updated integration branch;
- inspected the existing Repertoire Builder issue-coordination model, including its parent program issue, task metadata, dependencies, claims, branches, and PR tracking;
- created Visual Transformation Program issue #122;
- created ordered execution issues #123–#133;
- marked #123 and #124 `READY`;
- marked downstream issues `BLOCKED` by explicit issue-number dependencies;
- recorded priorities, numeric order, phase, canonical documentation, planned branch, scope, acceptance criteria, exclusions, validation expectations, and execution rules in each child issue;
- made #123 the deterministic next task because it is the highest-priority ready issue with the lowest order;
- allowed #124 to run in parallel only after an explicit file and decision collision check;
- locked the hybrid repository-document/GitHub-Issue ownership model in D-022;
- reconciled D-021 as integrated through PR #120;
- updated the transformation entry point, status, and working rules to use issue #122 as the live queue;
- added program-issue comments recording branch, PR #134, and successful final-head validation;
- opened PR #134 against `visual_transformation`;
- passed complete final-head CI run #1072;
- received explicit approval to squash merge PR #134;
- finalized the repository records to their post-merge state before integration;
- squash-merged PR #134 into `visual_transformation`;
- preserved residual direct-browser validation as open work;
- made no application or configuration change.

## Queue created

| Issue | Task | State | Priority | Order | Dependencies |
|---|---|---|---|---:|---|
| #123 | VT-101 inline animated navigation accordion | READY | P1 | 10 | integrated rail baseline |
| #124 | VT-102 Home canvas and palette calibration | READY | P1 | 20 | integrated Home/rail baseline |
| #125 | VT-103 production colour tokens and typography | BLOCKED | P1 | 30 | #124 |
| #126 | VT-104 residual browser validation | BLOCKED | P1 | 40 | #123, #124 |
| #127 | VT-201 Games modernization | BLOCKED | P1 | 100 | #125 |
| #128 | VT-202 Study modernization | BLOCKED | P1 | 110 | #125 |
| #129 | VT-203 Opening Analysis modernization | BLOCKED | P1 | 120 | #125 |
| #130 | VT-204 proven shared primitives | BLOCKED | P2 | 130 | #127, #128, #129 |
| #131 | VT-205 final mobile-primary navigation | BLOCKED | P2 | 140 | #127, #128, #129 |
| #132 | VT-301 remaining-page and Labs rollout | BLOCKED | P2 | 200 | #130 |
| #133 | VT-302 onboarding, empty states, accessibility, and responsive polish | BLOCKED | P2 | 210 | #132 |

## Ownership contract

### Repository documents own

- visual direction and identity;
- architecture and phase outcomes;
- decisions and rejected alternatives;
- detailed acceptance criteria and explicit exclusions;
- integrated checkpoint history;
- migration records;
- validation evidence and residual risks;
- implementation and review reports.

### GitHub Issues own

- live priority and numeric order;
- readiness and blocking dependencies;
- current claim and owner;
- implementation branch and pull request;
- active blockers;
- completion state.

`STATUS.md` no longer owns or duplicates the live queue.

## Deterministic selection contract

A new transformation session must:

1. read `TRANSFORMATION.md` and all governing repository documents;
2. open program issue #122;
3. consider only open child issues with `Repository state: READY`;
4. exclude unresolved dependencies and active claims;
5. choose highest priority, then lowest numeric order;
6. inspect open branches and PRs for collision;
7. comment to claim the issue before implementation;
8. update the issue to `IN_PROGRESS` and record branch/PR state;
9. close only after squash merge and documentation reconciliation.

Parallel execution requires both tasks to be ready and a concrete collision check covering files, decisions, branches, and review boundaries.

## Files changed

- `TRANSFORMATION.md`
- `transformation/DECISIONS.md`
- `transformation/STATUS.md`
- `transformation/WORKING_RULES.md`
- `transformation/reports/VT_000_ISSUE_DRIVEN_QUEUE_MIGRATION.md`

`transformation/MASTER_PLAN.md` is intentionally unchanged because program scope, architecture, phases, sequence, and target outcomes did not change. The new execution mechanics are owned by D-022 and `WORKING_RULES.md`.

No Angular, CSS, route, package, lockfile, API, contract, schema, database, job, mobile, or backend file is changed.

## Validation performed

### Repository and GitHub inspection

- verified PR #120 merge state and merge commit;
- verified integration CI #1051 success;
- inspected the integrated transformation entry point, master plan, decisions, status, and working rules;
- inspected the existing Repertoire Builder program issue #105;
- inspected representative task issue #116 and its claim comments;
- verified issue #122 contains the ordered checklist and deterministic task-selection contract;
- verified child issues #123–#133 exist with real numbered dependencies;
- verified only #123 and #124 are marked `READY`;
- verified every later issue is marked `BLOCKED` by an explicit dependency;
- verified #123 is the deterministic next task;
- verified PR #134 contains exactly five transformation Markdown files;
- verified PR #134 is mergeable;
- verified complete final-head CI run #1072 passed before merge approval.

### Automated validation

CI run #1072 passed:

- dependency installation;
- lint;
- full monorepo build;
- architecture guardrails;
- database migrations;
- complete test suite.

### Documentation validation

- removed stale Phase 1D active-branch and “do not merge PR #120” instructions;
- recorded PR #120 and integration CI #1051;
- locked D-022;
- preserved residual browser validation;
- separated repository-document ownership from issue ownership;
- changed the VT-000 records to their post-merge state before squash merge;
- confirmed no active VT-000 branch or PR is presented as the next checkpoint after integration;
- confirmed the branch changes only the five intended Markdown files.

## Commands skipped and reasons

Application commands were skipped locally:

```text
npm run build:web
npm run test --workspace=apps/web
npm run lint
npm run check:architecture
```

Reason: VT-000 changes only Markdown process/documentation files and creates GitHub Issues. It does not modify application runtime, configuration, dependencies, contracts, schemas, database, or backend code.

A direct local clone remains unavailable because the execution environment cannot resolve `github.com`. GitHub connector inspection and CI are the authoritative repository checks.

## Warnings and residual risks

- issue metadata is stored in issue bodies rather than repository labels; agents must read the body contract rather than infer state from missing labels;
- issue readiness must be updated deliberately after dependency merges; GitHub will not derive it automatically;
- simultaneous sessions can still collide if they fail to post claim comments or inspect open branches and PRs;
- repository documents and issue bodies can drift if closure reconciliation is skipped;
- direct browser validation from earlier phases remains open and is owned by #126;
- #124 may run in parallel with #123 only after a documented collision check;
- #123 revises the integrated D-312 expanded-rail interaction but must preserve the collapsed-rail flyout until its own review is complete.

## Review and reproduction instructions

1. Open issue #122 and verify the ordered checklist.
2. Confirm #123 and #124 are the only ready tasks.
3. Confirm #123 wins deterministic selection by order.
4. Open several blocked issues and verify their dependencies reference real issue numbers.
5. Review D-022 and confirm the ownership split is unambiguous.
6. Confirm `STATUS.md` contains integrated state and residuals, not a duplicate live backlog.
7. Confirm `WORKING_RULES.md` defines claim, branch, PR, merge, closure, and dependency-release rules.
8. Confirm no stale Phase 1D or VT-000 active-branch/merge instruction remains.
9. Confirm PR #134 contains only the five intended Markdown files.
10. Confirm final-head CI #1072 passed.
11. Confirm PR #134 is squash-merged into `visual_transformation` and issue #122 records the completed migration.

## Final state

VT-000 is complete. Issue #122 is the live execution queue.

While the issue state remains unchanged, the next session must claim #123 before creating `visual-transformation/vt-101-inline-navigation-accordion` from the current `visual_transformation` head.

## Files inspected

- `TRANSFORMATION.md`
- `AGENTS.md`
- `.agents/skills/angular-frontend/SKILL.md`
- `docs/frontend/angular-architecture.md`
- `transformation/MASTER_PLAN.md`
- `transformation/DECISIONS.md`
- `transformation/STATUS.md`
- `transformation/WORKING_RULES.md`
- `apps/web/src/styles.css`
- `apps/web/src/app/app.component.css`
- `apps/web/src/app/core/layout/main-navigation/main-navigation.component.ts`
- `apps/web/src/app/core/layout/main-navigation/main-navigation.component.html`
- `apps/web/src/app/core/layout/main-navigation/main-navigation.component.css`
- `apps/web/src/app/core/layout/main-navigation/main-navigation-disclosure.css`
- `apps/web/src/app/features/home/home-page.component.ts`
- `apps/web/src/app/features/home/home-page.component.css`
- Repertoire Builder program issue #105
- Repertoire Builder execution issue #116 and its comments
- Visual Transformation program issue #122
- Visual Transformation execution issues #123–#133
- PR #120 and integration CI #1051
- PR #134 and final-head CI #1072