---
name: angular-frontend
description: "Use for Angular frontend work under apps/web: route pages, standalone components, signals, stores/facades, data-access services, templates, OnPush, course UI, line editor, training UI, game import/review UI, and frontend refactors. Do not use for backend-only changes."
---

# Angular Frontend

Use this skill for Angular work under `apps/web`.

## Read first

Before editing frontend code, read the relevant parts of:

* `docs/frontend/angular-architecture.md`
* `docs/frontend/angular-patterns.md`
* `docs/frontend/angular-migration.md`
* `docs/skills/frontend-feature-module.md`

These project docs are authoritative. Generic Angular reference material is not authoritative for this repo.

## Core rules

* Use standalone components.
* Use `ChangeDetectionStrategy.OnPush`.
* Prefer signals and `computed` for local/component state.
* Use immutable updates.
* Use built-in control flow: `@if`, `@for`, `@switch`.
* Track repeated domain entities by stable ids.
* Keep templates readable and avoid complex inline expressions.
* Prefer explicit typed models over loose object shapes.

## Feature structure

Prefer feature-local organization:

```text
features/<feature>/
  pages/
  components/
  state/
  data-access/
  helpers/
```

Use this split:

* `pages`: route-level composition and user workflow entry points.
* `components`: presentational UI pieces.
* `state`: stores/facades and page workflow state.
* `data-access`: typed HTTP services.
* `helpers`: pure feature-local helpers.

Do not create a global shared service just because two nearby files currently need similar logic. First check whether the logic belongs in a feature helper, feature store, or shared domain package.

## Page components

Route/page components should:

* Compose child components.
* Connect UI events to feature store/facade actions.
* Avoid large imperative workflows.
* Avoid direct low-level HTTP orchestration when a data-access service/store would be clearer.
* Preserve current user context such as filters, pagination, selected rows, expanded rows, and loaded data.

## Stores/facades

Feature stores/facades should:

* Own async workflows for the page/feature.
* Own mutable page state.
* Expose clear readonly state to components.
* Keep update transitions explicit and testable.
* Avoid leaking backend DTO details deeply into presentational components.

## Data-access services

Data-access services should:

* Own typed HTTP calls only.
* Return typed results.
* Avoid UI state.
* Avoid business decisions that belong in domain logic or stores/facades.

## Presentational components

Presentational components should:

* Receive data through typed inputs.
* Emit typed events.
* Avoid HTTP calls.
* Avoid backend DTO knowledge when a UI model is more appropriate.
* Avoid reaching into parent state directly.

## Before finishing

For frontend changes:

* Run `npm run build:web`.
* If tests exist for the touched feature/store/helper, run them too.
* Report warnings or skipped validation.
