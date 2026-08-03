# VT-301 Performance by Rating

Date: 2026-08-03

Issue: #132

Branch: `visual-transformation/vt-301-performance-by-rating`

Pull request: #269

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
- Added rendered-template component tests covering initialization, the shared panel refresh action, loading-disabled query actions, filter delegation, report-type pressed state and toggling, the actual column-disclosure workflow, preset and checkbox delegation, populated analytical-table rendering, scroll-region and table-heading semantics, error announcement, and empty-state recovery.

## Self-review corrections

The first reviewer-style pass re-read the complete feature diff against the Batch 7a accessibility findings and identified one concrete issue before opening the pull request: the column-picker panel had an accessible label on a generic container without a semantic role.

The panel now uses `role="group"` with its existing label. The nested preset controls retain their own labelled group and every metric family remains a semantic fieldset.

The first CI run then found a test-double type mismatch: the rendered component spec supplied a readonly array signal where the real store exposes a mutable-array computed signal. Production lint, build, audits, guardrails, and migrations had already passed. The test double was corrected to match the actual store contract; no production code or behavior changed.

A second independent quality pass identified two additional evidence problems:

- the column-control test dispatched clicks against controls while their parent `<details>` element was still closed, so it did not represent the actual user workflow;
- this report still described final exact-head CI as pending after CI #1861 had already passed.

The component spec now opens and verifies the disclosure before interacting with its controls. It also verifies populated report output, semantic table headings, keyboard-focusable scrolling, loading-disabled query actions, report-type pressed state, error announcement, and empty-state recovery. The validation record below has been reconciled with the completed CI history; the final run after this review is tracked on PR #269 and issue #132.

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

Inspected current `main`, the VT-301 queue, open pull requests, route composition, the Performance by Rating component/template/styles/store/store tests, Batch 7a Lab conventions, shared panel/action implementation, Angular frontend rules, production design-token guidance, and the complete PR diff.

No open branch or pull request was found touching the Performance by Rating files. Settings remains isolated in PR #209, and the `main` refresh merged through PR #270 changed an unrelated Games-table action implementation.

The feature branch is zero commits behind current `main` commit `892ea8dc5daa6f89c090d3a3e6f8b4cfcdfa55b8` at the time of this review.

### Automated validation

- CI #1856 passed dependency installation, lint, all builds, opening audits, architecture guardrails, and all 52 migrations, then failed while compiling the new component spec because of the test-double signal type mismatch described above.
- Corrected head `87f9a5b5cad59c4310acd47981ced2c88902e41b` passed CI #1857 completely, including `355/355` Angular web tests.
- After refreshing from current `main`, exact-head CI #1861 passed dependency installation, lint, all domain/contracts/API/web/mobile builds, opening audits, architecture guardrails, all 52 migrations, the complete test suite, and artifact uploads.
- CI #1861 passed `356/356` Angular web tests; the API runner passed 85 test files; domain tests passed 33; mobile tests passed 22.
- The second quality pass adds test-only evidence on commit `248cb2fb21eae4d00d1b1eed1a2d51818fc05306`. The final workflow result for the resulting PR head is recorded on PR #269 and issue #132 after GitHub assigns and completes that run.

### Browser review disposition

Direct authenticated browser review is not represented as completed. Review or explicit deferral is required for:

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
