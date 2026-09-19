# VT-301 Tactical Detections

Date: 2026-08-04  
Issue: #132  
Pull request: #277  
Branch: `visual-transformation/vt-301-tactical-detections`

## Scope

Modernize the remaining Tactical Detections Lab surface without changing detection, filtering, routing, training, persistence, or shared game-filter behavior.

## Repository pattern applied

The first draft of this slice incorrectly introduced a second feature-local workspace header and hand-built action shell inside a route that already owns `app-page-header`. That approach was removed before review.

The corrected implementation follows the established VT-301 Lab pattern:

- the route page retains `LabExperimentPageHeaderComponent` as the single page heading;
- the experiment composes through the proven `app-panel` shell;
- the detection command uses a typed `UiShellAction`, while persisted-result queries remain inside their owning criteria panel;
- finding counts use typed `UiShellStat` inputs;
- the finding-type control reuses `app-select-menu` rather than adding another native or bespoke dropdown pattern;
- feature state, commands, filtering, and links remain owned by `TacticalDetectionsStore` and the existing experiment component.

## Implementation

- Migrated the remaining feature styling from legacy short tokens and hard-coded status colours to production `--ui-*` roles.
- Preserved initialization, persisted-result loading, detection runs, kind filtering, row limits, force-recheck semantics, shared game filters, reset/apply behavior, result counts, game links, and scenario-training links.
- Separated the actual store contracts in the presentation: finding type, row limit, and all game filters shape displayed persisted findings; only the selected date range and force-recheck option affect a new detection run.
- Separated action hierarchy: `Apply result filters` stays with result-query controls, while `Run detection` remains the panel-level command.
- Replaced the ambiguous combined evaluation cell with explicit `Before`, `After move`, and `After reply` columns using the same existing values and accessible header descriptions.
- Added semantic warning/success/danger labels for missed shots, punished blunders, and user blunders without relying on colour alone.
- Added a table caption, column scopes, game row headers, labelled scroll region, visible focus treatment, responsive control collapse, live loading/running feedback, alert semantics, and an actionable empty state.
- Added rendered Angular regression coverage for initialization, query/run ownership, loading/running state, select-menu filtering, row limit, force recheck, filter disclosure, scope messaging, error/completion/empty states, semantic finding labels, split evaluation columns, row headers, and trainable actions.

## Additional self-review

A further adversarial review after exact-head CI #1951 found three presentation-integrity gaps:

1. The page explained that detection runs use only the selected date range, but the shared collapsed-filter summary does not include dates. The active run scope was therefore invisible at the point of action. The detection options now display the exact `from`/`to` range, including all-time and one-sided ranges.
2. Finding type, maximum rows, and force recheck remained mutable while loading or running. That allowed the visible control state to diverge from the request already in flight. Those controls now share one computed disabled contract with the actions and game-filter panel.
3. The number input advertised the API's `1…500` range but manual invalid values could still be written into the store and rejected by the backend. The component now clamps integer values to the exact API boundary and restores the current valid value for empty input.

Rendered tests now cover the exact visible run scope, active-work control locking, and row-limit clamping.

## Validation

Local execution is unavailable in this session because the container cannot resolve `github.com`, so repository CI is the executable validation source for the branch.

Evidence:

- exact-head CI #1951 passed on `d59a2663634e8285141f8c7b9273c336d70fac69` before the additional hardening pass;
- that run passed dependency installation, lint, full Angular template/type compilation, opening audits, architecture guardrails, all migrations, and the complete test suite;
- the rebased hardening head requires a new exact-head repository CI run before approval.

Required before approval:

- Angular template/type compilation;
- focused Tactical Detections component spec;
- complete web and repository test suites;
- lint and architecture guardrails;
- exact-head CI result;
- direct authenticated browser review or an explicit recorded deferral.

## Browser checklist

- desktop populated, empty, loading, running, success, and error states;
- panel command and count stats;
- exact visible detection-run range;
- result filters versus detection-run scope messaging;
- shared finding-type menu keyboard and pointer operation;
- row-limit clamping and force-recheck control locking;
- collapsed and expanded finding game filters;
- horizontal table navigation and sticky header;
- semantic finding labels and split evaluations;
- game and training links;
- keyboard focus order;
- compact and narrow-phone layouts.

## Residual risk

Authenticated rendering evidence remains pending. No runtime, responsive, keyboard, or browser behavior is represented as passed until that evidence exists.
