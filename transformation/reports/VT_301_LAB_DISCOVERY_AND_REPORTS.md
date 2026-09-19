# VT-301 Lab discovery and tabular reports

Date: 2026-08-03

Issue: #132

Branch: `visual-transformation/vt-301-lab-reports`

Pull request: #252

## Scope

This batch modernizes the Lab discovery page and three low-risk tabular experiments:

- `/lab`;
- `/lab/top-opponents`;
- `/lab/monthly-games`;
- `/lab/training-log`.

Performance by rating and tactical detections remain outside this batch so their denser filters and domain presentation can be reviewed separately.

## Implementation

- Replaced the Lab hub's legacy `section-card` presentation with the shared production `app-panel`.
- Kept Labs explicitly experimental in the page copy rather than presenting the reports as established core workflows.
- Migrated hub links, report surfaces, tables, state messages, and controls from legacy short tokens and hard-coded amber-era backgrounds to production `--ui-*` roles.
- Moved refresh commands into the existing panel action contract without changing when or how each store loads data.
- Preserved the Monthly Games `Exclude bullet games` control and its existing store-owned behavior.
- Added semantic column scopes and accessible table labels.
- Applied the production monospaced stack and tabular numerics to counts, dates, percentages, ratings, move sequences, and mistake totals.
- Added explicit loading live regions, alert semantics for errors, visible focus treatment, compact-width containment, horizontal overflow for dense tables, and reduced-motion handling for Lab discovery links.

## Self-review corrections

### First reviewer pass

The first implementation head passed repository CI, but a separate reviewer-style pass identified and corrected three presentation-quality gaps:

- wide table regions are keyboard-focusable and visibly focused so horizontal scrolling is not pointer-only;
- non-interactive rows no longer gain hover treatment that could imply a click action;
- analytical number columns are right-aligned while dates and move sequences retain readable monospaced alignment.

The first pass also added component tests for the refresh action contract.

### Second reviewer pass

A second review re-read the complete diff, current shared panel/action implementation, design-token contract, Angular frontend rules, stores, current `main`, PR discussions, and CI history. It identified two additional quality gaps:

- the component specs replaced each real template with an empty template, so they proved only the computed action array and did not exercise the rendered shared panel controls;
- the Monthly Games options wrapper had an `aria-label` on a generic element without a corresponding semantic role.

Corrections:

- all three component specs now render their production templates, verify initial loading, click the actual shared panel refresh button, and assert the rendered disabled/`Loading…` state;
- the Monthly Games spec also clicks the actual checkbox and verifies delegation to the existing store;
- the Monthly Games options wrapper now uses `role="group"` with its accessible label;
- the branch was refreshed from current `main` through sync PR #265 before final validation. The intervening commits did not overlap Lab or shared-panel files.

## Behavior preserved

No route, API, contract, schema, database, store, aggregation, filter, import, or training behavior changed.

The following remain unchanged:

- initial load and manual refresh behavior;
- Top Opponents grouping and game counts;
- Monthly Games rows, labels, rating calculations, score formatting, and bullet exclusion;
- Training Log result, active-state, date, accuracy, sequence, and mistake formatting;
- route-level experiment headers and the return path to `/lab`.

## Shared-system boundary

This batch reuses the proven `app-panel` and production token contract. It introduces no new shared primitive and does not generalize Lab-specific table composition.

## Validation

### Repository inspection

- Inspected the current route registration, selected Lab pages and stores, shared panel/action contracts, production token contract, Angular frontend patterns, transformation coordination, current `main`, open pull requests, reviews, and review threads.
- Re-read the complete PR diff after both self-review passes.
- Verified that the three commits added to `main` after the previous review touched candidate-decision, repertoire-builder, and planning/documentation files only, with no Lab or shared-panel collision.
- Refreshed the feature branch from `main` commit `7168707389d34eb33f773a5e0cec6b61e440dd8d` through PR #265; the branch is zero commits behind `main` before final validation.

### Automated validation

- Initial implementation head `e15bf9936bc3a59773b483f61d82645c15ae8f76` passed CI #1762.
- First self-review head `c67527bbaa01e1ec3c1c067a4eeda660498288fd` passed CI #1794, including lint, full builds, opening audits, architecture checks, migrations, the complete test suite, and `343/343` Angular web tests.
- Final exact-head CI after the second self-review and `main` refresh is tracked on PR #252 and issue #132. Merge is permitted only if that run passes and the PR remains mergeable with no unresolved review threads.

### Local validation limitation

A local clone was retried on 2026-08-03 and failed with:

```text
Could not resolve host: github.com
```

No local build, test run, or authenticated browser session is represented as completed.

### Browser review disposition

Direct authenticated browser review remains unavailable in this execution environment. The following review is explicitly deferred rather than represented as observed:

- populated, loading, error, and empty states for all four routes;
- desktop, compact, and narrow-phone widths;
- keyboard operation of Lab links, panel actions, the Monthly Games checkbox, and horizontally scrollable table regions;
- containment of wide tables within the application canvas and mobile navigation clearance;
- readability of table headers, numeric values, dates, and long training sequences;
- assistive-technology announcements for loading and error states.

## Residual scope

VT-301 still needs:

- Settings disposition through PR #209;
- Lab Performance by Rating migration;
- Lab Tactical Detections migration;
- explicit disposition of any remaining authenticated routes before issue #132 can close.
