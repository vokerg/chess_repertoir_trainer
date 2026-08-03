# VT-301 Performance by Rating

Date: 2026-08-03

Issue: #132

Branch: `visual-transformation/vt-301-performance-by-rating`

Pull request: pending

## Scope

This batch modernizes the dense analytical Lab route:

- `/lab/performance-by-rating`.

Settings remains owned by draft PR #209. Tactical Detections and residual authenticated-route disposition remain outside this batch.

## Implementation

- Replaced the legacy outer `section-card` and hand-built report header with the shared production `app-panel`.
- Moved manual refresh into the existing panel action contract without changing store initialization or query behavior.
- Kept date range, minimum opponent rating, report-type selection, column presets, individual column visibility, and rating-reference disclosure feature-owned.
- Migrated the filter surface, column menu, status messages, normalization reference, dense report table, small-sample marker, and compact-width layout from legacy short tokens and hard-coded amber backgrounds to production `--ui-*` roles.
- Preserved sticky report headers and the two sticky identity columns while applying production table surfaces and analytical numeric typography.
- Added semantic fieldsets and legends for report types and column groups, pressed-state semantics for presets and report-type toggles, scoped table headings, accessible table labels, and keyboard-focusable scroll regions.
- Added visible focus treatment for controls, disclosures, menu inputs, and both horizontal-scroll regions.
- Added rendered-template component tests covering initialization, the shared panel refresh action, loading-disabled state, filter delegation, report-type toggling, column preset selection, and individual column toggling.

## Behavior preserved

No route, API, contract, schema, database, store calculation, store default, normalization profile, report metric, or filtering behavior changed.

The following remain unchanged:

- three-month default date range;
- minimum opponent rating default and clamping;
- bullet disabled by default while blitz and rapid remain enabled;
- explicit Apply filters query behavior;
- report-type toggles filtering already-loaded rows client-side;
- Core, Stories, All, and custom column selection behavior;
- rating-grade normalization loading and error isolation;
- WDL, score, story-percentage, accuracy, coverage, rating-band, and low-sample calculations;
- initial parallel loading of report data and the normalization profile.

## Shared-system boundary

This batch reuses `app-panel` and the production token contract. The dense report filters, column menu, normalization table, sticky columns, and report layout remain feature-local because no compatible cross-feature contract has been proven.

No new dependency, shared primitive, generic table abstraction, or global styling rule is introduced.

## Validation

### Repository inspection

Inspected current `main`, the VT-301 queue, open pull requests, route composition, the Performance by Rating component/template/styles/store/store tests, Batch 7a Lab conventions, shared panel/action implementation, Angular frontend rules, and production design-token guidance.

No open branch or pull request was found touching the Performance by Rating files. Open PRs #209, #266, and #268 do not overlap this feature or the shared panel implementation used by this batch.

### Automated validation

Pending repository CI on the draft pull request.

Required gates:

- Angular compilation and tests, including the rendered component regressions;
- full repository lint and build;
- architecture guardrails;
- migrations and complete repository tests.

### Browser review disposition

Direct authenticated browser review is not yet represented as completed. Review or explicit deferral is required for:

- populated, loading, error, empty, and normalization-reference states;
- Core, Stories, All, and custom column configurations;
- all report-type toggle combinations, including no enabled types;
- date/minimum-rating filter operation and invalid-range error presentation;
- desktop, tablet, compact, and narrow-phone widths;
- sticky headers/columns and keyboard scrolling in both wide tables;
- column menu overlay containment and compact inline expansion;
- keyboard focus, pressed states, fieldset/legend semantics, and error announcements;
- mobile-navigation clearance and zoom containment.

## Residual scope

VT-301 still needs:

- Settings disposition through PR #209;
- Lab Tactical Detections migration;
- explicit disposition of remaining authenticated routes before issue #132 can close.
