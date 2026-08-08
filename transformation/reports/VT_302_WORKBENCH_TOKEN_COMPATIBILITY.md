# VT-302 — Workbench visual-token compatibility

Date: 2026-08-08

Issue: [#133](https://github.com/vokerg/chess_repertoir_trainer/issues/133)

Pull request: [#309](https://github.com/vokerg/chess_repertoir_trainer/pull/309)

Branch: `visual-transformation/vt-302-workbench-token-compatibility`

Final review base: `main` `0ae880e8cba60be69caba5aa55c5fb64112b48c1`

## Scope

This continuation slice resolves the documented visual-semantic compatibility debt in the global workbench stylesheet and the remaining Repertoire Builder workbench/setup/explanation surfaces.

It does not complete VT-302 and must not close issue #133.

## Audited boundary

VT-301 intentionally migrated the shared analytical component implementations without globally rewriting `apps/web/src/workbench.css`, Builder, or line-editor presentation. Since then, Line Editor has converged on the shared analysis-workbench presentation, while Repertoire Builder still retained a concentrated legacy visual-token layer in its workbench, setup dialog, and optional candidate explanation.

The audited boundary for this slice is therefore:

- `apps/web/src/workbench.css`;
- `apps/web/src/app/features/repertoire-builder/components/repertoire-builder-workbench.component.css`;
- `apps/web/src/app/features/repertoire-builder/components/repertoire-builder-setup-dialog.component.css`;
- `apps/web/src/app/features/repertoire-builder/components/repertoire-builder-workbench-explanation.component.css`;
- the architecture guard that protects this migration.

The shared `--space-*` spacing scale remains intentionally untouched. Home `--home-*` aliases, global `.library-*` presentation, and unrelated legacy consumers in `styles.css` are not part of this boundary.

## Implementation

The migrated files now use production `--ui-*` roles for:

- surfaces, borders, text hierarchy, selected state, action state, and semantic status;
- control/panel radii and overlays;
- focus outlines;
- warning, error, success, and information presentation;
- workbench move-tree, engine, notes, setup, candidate, queue, evidence, and state presentation.

The Builder cleanup also removes unresolved visual aliases such as `--surface-2`, `--surface-3`, `--on-accent`, and `--shadow-lg` from the audited surfaces.

`docs/frontend/design-tokens.md` now records that `workbench.css` is still a later specialized stylesheet but no longer depends on legacy visual-semantic names. `docs/frontend/angular-migration.md` removes this boundary from accepted compatibility debt while retaining the global spacing and other explicitly known compatibility layers.

## Regression guard

`scripts/check-architecture-guardrails.mjs` now reads the four migrated stylesheets and rejects the bounded legacy visual-token names. This is deliberately narrower than a repository-wide ban: other explicitly documented compatibility consumers still exist and must be migrated only after their own complete consumer boundaries are proven.

## Behavior preserved

This slice does not change:

- routes or route parameters;
- APIs, contracts, schemas, database behavior, or persistence;
- Angular store/facade ownership;
- board, engine, move-tree, or line-editing behavior;
- Builder ranking, evidence, eligibility, queue, decision, or course-write semantics;
- Home aliases, line-training globals, or unrelated transformed workflows;
- dependencies or visual frameworks.

## Validation

CI run #2242 passed on implementation head `5e40464b7a0b327a26bdeb7554cd88c85c607b99`. That repository workflow exercises build, test, lint, architecture, migrations, and the other configured CI gates.

After that pass, `main` advanced by one disjoint Repertoire Builder documentation commit. The task branch was rebuilt on `main` `0ae880e8cba60be69caba5aa55c5fb64112b48c1`; comparison showed the expected five runtime/guard files ahead and zero commits behind before documentation reconciliation.

Local checkout-based commands are not claimed because the execution runner cannot resolve `github.com`. Direct authenticated browser review is also not claimed for this token-only slice. The pull-request head CI remains the final executable review gate after documentation commits.

## Residual risk

This cleanup removes a documented visual-semantic compatibility boundary; it does not remove every legacy CSS variable from the application. `styles.css` still supplies the shared spacing scale and known compatibility consumers, Home retains its calibrated aliases, and `.library-*` training presentation remains a separate consumer-boundary problem.

Visual parity across every Builder/workbench state is not represented as manually observed in an authenticated browser. Automated compilation and CI guard against invalid token references and architectural regression, while final visual acceptance still depends on the normal reviewed PR process.
