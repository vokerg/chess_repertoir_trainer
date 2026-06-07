# Angular migration ledger

This document tracks existing frontend debt while `angular-architecture.md` remains the stable target. Remove entries as components are migrated; do not weaken architecture rules to match legacy code.

## Completed

- Application shell: external template/styles and OnPush.
- Games explorer store: immutable row patching without row-action list reloads.
- Game detail: feature-local route page, signal store, typed data access, pure tree helpers, presentational summary/workbench components, and built-in control flow.
- Move tree: OnPush, signal inputs/outputs, built-in control flow, and stable tracking.

## Migration order

Prioritize by responsibility count and user-facing risk:

1. Opening analysis page.
2. Accounts page.
3. Library browser page.
4. Line editor and course detail pages.
5. Training session and lines pages.
6. Games table and filter panel.
7. Lab, courses, training marathon, and stats pages.
8. Remaining shared board, engine, PGN, and note components.

## Per-component completion criteria

- Lives under the owning feature where practical.
- Route page is a composition shell.
- Uses OnPush and built-in template control flow.
- Uses external template/styles when non-trivial.
- Has no direct HTTP workflow in a presentational component.
- Uses signals/computed state and lifecycle-safe observable interop.
- Uses immutable updates and stable repeated-item tracking.
- Extracted pure logic and high-risk state transitions have tests.
- Application TypeScript, spec TypeScript, and Angular template compilation pass.

## Tooling debt

- `apps/web` has an `ng lint` script but no Angular lint target.
- `angular-eslint` and Angular template lint rules are not installed.
- The web test script is currently a placeholder even though Jasmine/Karma scaffolding exists.
- Karma execution requires missing packages such as `karma-jasmine` before committed specs can run in CI.

Add lint/test dependencies in a dedicated tooling change. Enable rules in warning mode first, migrate existing violations, then promote stable rules to errors in CI.
