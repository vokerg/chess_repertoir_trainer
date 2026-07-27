# Phase 1C Integration Reconciliation

Date: 2026-07-27

Branch: `visual-transformation/phase-1c-integration-reconciliation`

Target: `visual_transformation`

Pull request: #118

## Purpose

Reconcile the persistent visual-transformation documentation with the actual repository state after PR #112 was already squash-merged into `visual_transformation`.

PR #112 integrated the Phase 1C production navigation rail, but the documentation committed with that pull request still described its review branch as active and instructed future sessions not to merge the already-merged pull request. Because root `TRANSFORMATION.md` is the mandatory entry point for later sessions, leaving that mismatch in place could cause duplicate review work, incorrect branch selection, or out-of-sequence implementation.

This checkpoint changes documentation only. It does not modify application runtime behavior.

## Work completed

- created `visual-transformation/phase-1c-integration-reconciliation` from the current `visual_transformation` head;
- verified that PR #112 is closed and merged;
- verified that `visual_transformation` matched the PR #112 squash commit before this branch was created;
- verified successful CI for the integrated Phase 1C commit;
- added PR #112 to the integrated checkpoints in `TRANSFORMATION.md`;
- replaced the obsolete Phase 1C implementation checkpoint with this documentation-only reconciliation checkpoint;
- updated D-010 and D-020 to record Phase 1C integration;
- moved D-315 from open disposition to locked and integrated disposition;
- marked the Phase 1C production rail complete in `STATUS.md`;
- updated the Phase 1 backlog and session log;
- replaced the obsolete PR #112 stop condition in `WORKING_RULES.md`;
- preserved outstanding browser-validation items and later product decisions;
- retained landing-page scroll-reveal motion as a candidate requiring separate explicit approval;
- opened PR #118 back into `visual_transformation`.

## Design and implementation rationale

### Restore the stable entry point first

The transformation process explicitly treats `TRANSFORMATION.md` and the files under `transformation/` as the source of truth for visual direction, sequencing, decisions, and session handoff. Runtime code correctly reflected the integrated navigation rail, while the transformation records did not.

The narrowest safe next action was therefore to correct the persistent documentation before approving another runtime slice.

### Keep the checkpoint documentation-only

No product behavior, visual behavior, route, component, style, test, dependency, API, contract, schema, database model, job, or backend behavior needed correction. Mixing a new runtime change into this branch would make the reconciliation harder to audit and would violate the approved checkpoint boundary.

### Preserve residual risks

Squash merge acceptance does not prove every previously recorded browser condition. The reconciliation closes only the obsolete question of whether Phase 1C was accepted and integrated. It deliberately keeps long labels and names, viewport-edge flyouts, Clerk controls, mobile boundary widths, imported-game job-panel spacing, representative page widths, and earlier authentication/home/brand browser checks open.

### Do not auto-approve the next runtime slice

The browser-review report records restrained public landing-page scroll-reveal motion as the clearest follow-up. This reconciliation records that candidate without treating it as an implementation instruction. A separate explicit approval and branch remain required.

## Files changed

- `TRANSFORMATION.md`
- `transformation/DECISIONS.md`
- `transformation/STATUS.md`
- `transformation/WORKING_RULES.md`
- `transformation/reports/PHASE_1C_INTEGRATION_RECONCILIATION.md`

No runtime or test files are changed.

## Validation performed

### Repository-state inspection

Confirmed through the GitHub connector:

- PR #112 is closed and merged into `visual_transformation`;
- its squash commit is `a7d1ed76b827454ed9bb440981f146a421f8702f`;
- `visual_transformation` matched that squash commit before creation of this branch;
- the merged implementation includes the desktop rail, separate child disclosures, mobile grouped sheet, and focused tests described by the transformation reports;
- the integrated commit has successful CI run #983;
- earlier implementation runs #940, #945, and #953 also passed;
- PR #118 targets `visual_transformation` from the dedicated reconciliation branch.

### Documentation review

Reviewed the changed records for these invariants:

- no remaining instruction says PR #112 is awaiting merge;
- PR #112 is listed as integrated consistently;
- D-315 is no longer an open decision;
- residual browser checks remain explicit;
- no later runtime checkpoint is represented as approved;
- `MASTER_PLAN.md` remains unchanged because program scope, architecture, phases, and target outcomes did not change.

## Commands skipped and why

The following application commands were not run:

```text
npm run build:web
npm run test --workspace=apps/web
npm run lint
npm run check:architecture
```

Reason: this checkpoint changes Markdown documentation only. The repository working rules state that documentation checkpoints do not require application build or test execution when runtime files are untouched. The already-integrated Phase 1C implementation has successful full CI.

A direct local checkout was not available in the execution environment. The previously recorded command:

```text
git ls-remote https://github.com/vokerg/chess_repertoir_trainer.git HEAD
```

failed with:

```text
fatal: unable to access 'https://github.com/vokerg/chess_repertoir_trainer.git/': Could not resolve host: github.com
```

The GitHub connector remained available and was used for branch, file, PR, commit, diff, and workflow inspection.

## Warnings and residual risks

- documentation can become stale again if a future squash merge does not include a post-merge status reconciliation;
- long navigation labels and user names still need direct browser review;
- child flyouts may still need viewport-edge collision handling after further review;
- mobile grouped-sheet behavior still needs boundary-width and narrow-phone validation;
- Clerk account interaction and imported-game job-panel spacing remain unverified in a direct browser session;
- prior authentication, home, favicon, and brand-rasterization browser checks remain open;
- the landing-page motion candidate is not approved by this checkpoint;
- exact mobile primary navigation, final palette, and typography loading remain unresolved.

## Open decisions

This reconciliation does not decide:

- whether real use requires a small rail-width adjustment within the approved ranges;
- whether flyouts require viewport-edge repositioning;
- whether collapse persistence should be introduced later;
- final mobile-primary destinations;
- final production palette values;
- IBM Plex Sans loading strategy;
- final public metadata and social-preview composition;
- the next runtime transformation checkpoint.

## Review instructions

1. Confirm PR #118 contains only the five Markdown files listed above.
2. Confirm `TRANSFORMATION.md` lists PR #112 as integrated.
3. Confirm D-315 is locked and integrated rather than open.
4. Confirm `STATUS.md` marks the production rail complete while retaining residual checks.
5. Confirm `WORKING_RULES.md` no longer instructs reviewers not to merge PR #112.
6. Confirm landing-page motion is described only as a candidate requiring separate approval.
7. Confirm no runtime validation is falsely represented as newly performed by this documentation branch.

## Reproduction instructions

No application reproduction is required because runtime behavior is unchanged.

For repository-state reproduction:

1. open PR #112 and verify its merged state and target branch;
2. inspect the `visual_transformation` history for squash commit `a7d1ed76b827454ed9bb440981f146a421f8702f`;
3. inspect CI run #983 for the integrated commit;
4. compare PR #118 with `visual_transformation` and confirm the diff is limited to transformation Markdown records.

## Stop condition

Do not merge PR #118 without explicit approval. When approved, squash merge it into `visual_transformation`.

Do not begin landing-page motion, token migration, typography changes, bottom navigation, representative workflow modernization, route changes, dependency additions, or backend work on this branch.

## Files inspected

- `TRANSFORMATION.md`
- `AGENTS.md`
- `.agents/skills/angular-frontend/SKILL.md`
- `.github/instructions/web.instructions.md`
- `docs/frontend/angular-architecture.md`
- `docs/frontend/angular-patterns.md`
- `docs/frontend/angular-migration.md`
- `docs/frontend/responsive-layout.md`
- `docs/skills/frontend-feature-module.md`
- `transformation/MASTER_PLAN.md`
- `transformation/DECISIONS.md`
- `transformation/STATUS.md`
- `transformation/WORKING_RULES.md`
- `transformation/reports/PHASE_1B_NAVIGATION_DISCOVERY.md`
- `transformation/reports/PHASE_1C_NAVIGATION_RAIL_IMPLEMENTATION.md`
- `transformation/reports/PHASE_1C_BROWSER_REVIEW_FEEDBACK.md`
- `apps/web/src/app/app.component.css`
- `apps/web/src/app/core/layout/main-navigation/main-navigation.component.ts`
- `apps/web/src/app/core/layout/main-navigation/main-navigation.component.html`
- `apps/web/src/app/core/layout/main-navigation/main-navigation.component.css`
- `apps/web/src/app/core/layout/main-navigation/main-navigation-disclosure.css`
- `apps/web/src/app/core/layout/main-navigation/main-navigation.component.spec.ts`
- `apps/web/src/app/features/public/landing-page.component.ts`
- `apps/web/src/app/features/public/landing-page.component.css`
- PR #112 metadata, merge commit, changed-file list, review state, and workflow state
- PR #118 metadata and changed-file scope