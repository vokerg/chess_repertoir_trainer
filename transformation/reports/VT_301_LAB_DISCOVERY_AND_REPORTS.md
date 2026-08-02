# VT-301 Lab discovery and tabular reports

Date: 2026-08-02

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

The first implementation head passed repository CI, but a separate reviewer-style pass identified and corrected three presentation-quality gaps:

- wide table regions are now keyboard-focusable and visibly focused so horizontal scrolling is not pointer-only;
- non-interactive rows no longer gain hover treatment that could imply a click action;
- analytical number columns are right-aligned while dates and move sequences retain readable monospaced alignment.

Focused component tests now verify that all three migrated refresh commands continue to invoke their existing stores and become disabled/relabelled while a load is active.

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

- Inspected the current route registration, selected Lab pages and stores, shared panel/action contracts, production token contract, transformation coordination, and open pull requests.
- Compared the implementation against the latest `main` before final review.
- The branch was refreshed onto current `main`; intervening commits touched API/opening-knowledge and planning files only, with no Lab or shared-panel collision.

### Automated validation

Initial implementation head `e15bf9936bc3a59773b483f61d82645c15ae8f76` passed the complete repository workflow in CI #1762:

- lint;
- full workspace build and Angular template/type compilation;
- opening audits;
- architecture guardrails;
- database migrations;
- all tests, including 337 Angular web tests.

The refreshed self-review head adds accessibility corrections and focused tests, so its exact-head CI result is tracked on PR #252 and issue #132.

### Browser review still required

Review authenticated populated, loading, error, and empty states for all four routes at representative desktop, compact, and narrow-phone widths. Confirm:

- Lab links have visible hover and keyboard-focus states;
- panel actions disable and relabel while loading;
- the Monthly Games checkbox remains operable by keyboard and updates the report as before;
- wide tables scroll without escaping the application canvas or mobile navigation clearance;
- table headers, values, and long training sequences remain readable;
- loading and error announcements are understandable to assistive technology.

No direct browser state is represented as observed in this report.

## Residual scope

VT-301 still needs:

- Settings disposition through PR #209;
- Lab Performance by Rating migration;
- Lab Tactical Detections migration;
- explicit disposition of any remaining authenticated routes before issue #132 can close.
