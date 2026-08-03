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
- Added semantic fieldsets and legends for report types and column groups, pressed-state semantics for presets and report-type toggles, scoped table headings and row headers, accessible table labels, full accessible names for abbreviated metric headings, and keyboard-focusable scroll regions.
- Added visible focus treatment for controls, disclosures, menu inputs, and both horizontal-scroll regions, including inward focus rings inside clipped normalization-reference surfaces.
- Added rendered-template component tests covering initialization, the shared panel refresh action, loading-disabled query actions, filter delegation, report-type pressed state and toggling, the actual column-disclosure workflow, preset and checkbox delegation, populated analytical-table rendering, report and normalization loading/error/empty/populated states, scroll-region and table-heading semantics, row-header semantics, full accessible metric and column-control names, small-sample explanation, sticky-header separation, and error announcement.

## Self-review corrections

The initial reviewer-style pass identified and fixed:

- an accessible label on the generic column-picker panel without a semantic role; the panel now uses `role="group"`;
- a rendered-test double that supplied a readonly-array signal where the store exposes a mutable-array computed signal; the test double now matches the production contract.

A second independent quality pass then identified and fixed:

- a column-control test that clicked descendants while their parent `<details>` element was still closed; the test now opens and verifies the disclosure before interacting;
- insufficient rendered evidence for report and normalization populated/loading/error/empty states, table semantics, scroll regions, and pressed-state behavior;
- a stale report statement that still described exact-head CI #1861 as pending after it had passed;
- focus rings on the normalization disclosure and reference table that could be clipped by the parent `overflow: hidden`; these rings now render inward;
- duplicated sticky-column widths and offsets that could drift between desktop and mobile rules; feature-local CSS variables now own both widths and the dependent offset;
- a test fixture that rendered all 15 metrics while claiming the Core 10-column preset; the fixture now consistently represents the All preset;
- opponent rating ranges using the normal UI font despite the production typography contract classifying ratings as analytical numerics; rating cells now use the mono stack with tabular numerics while the Low-n badge retains the UI font;
- abbreviated metric headings relying on `title` for their expanded meaning; each heading now exposes its full label through `aria-label`, with a rendered test protecting that contract.

A third independent review before merge identified and fixed:

- the sticky metric-header row used a `2.1rem` top offset while the sticky group-header row still included `0.7rem` vertical padding on both sides; a Chromium layout probe reproduced roughly 23 px of header overlap during vertical scrolling;
- the group-header tier now owns an explicit feature-local height with zero block padding, and the metric tier is positioned immediately below its rendered border;
- the two sticky identity cells in each report row were ordinary data cells, so assistive-technology table navigation lacked explicit row-header context; both are now scoped row headers;
- column descriptions were available only through pointer-hover `title` text; each checkbox now receives an accessible name containing its full label and explanation;
- the compact `Low n` badge now exposes the full meaning “Low sample: fewer than five games” to assistive technology;
- the component suite now includes a real Chrome layout assertion that scrolls the report region and verifies that the two sticky header tiers do not overlap.

No correction changed report calculations, query semantics, routes, APIs, stores, or persisted data.

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

Inspected current `main`, the VT-301 queue, open pull requests, route composition, the complete Performance by Rating component/template/styles/store/store-test implementation, contract schemas, Batch 7a Lab conventions, shared panel and action implementation, responsive breakpoint constants, Angular frontend rules, production design-token and typography guidance, transformation decisions and working rules, and the complete PR diff.

No open branch or pull request was found touching the Performance by Rating files. Settings remains isolated in PR #209. Its documentation changes include `transformation/STATUS.md` and `docs/frontend/angular-migration.md`, so this batch deliberately avoids creating a documentation collision in those files; live batch state remains recorded in issue #132.

The feature branch was zero commits behind current `main` commit `892ea8dc5daa6f89c090d3a3e6f8b4cfcdfa55b8` at the start of the third review.

### Automated validation

- CI #1856 passed dependency installation, lint, all builds, opening audits, architecture guardrails, and all 52 migrations, then failed while compiling the new component spec because of the test-double signal mismatch described above.
- Corrected head `87f9a5b5cad59c4310acd47981ced2c88902e41b` passed CI #1857 completely, including `355/355` Angular web tests.
- After refreshing from current `main`, exact-head CI #1861 passed the complete repository workflow with `356/356` Angular web tests.
- Exact-head CI #1871 after the second independent review passed dependency installation, lint, all domain/contracts/API/web/mobile builds, opening audits, architecture guardrails, all 52 migrations, the complete test suite, and artifact uploads.
- CI #1871 passed `359/359` Angular web tests; the API runner passed 85 test files; domain tests passed 33; mobile tests passed 22.
- A local isolated Chromium layout probe reproduced the third-review sticky-header overlap before the correction and confirmed the metric tier aligns below the group tier after the correction.
- The final exact-head workflow after the third-review corrections is maintained on PR #269 and issue #132. This report intentionally does not embed that moving-head result because changing the report would itself create a new exact head requiring another workflow.

### Browser review disposition

Direct authenticated application browser review is not represented as completed. The user explicitly authorized squash merge after a clean additional self-review, so the authenticated browser matrix is deferred rather than represented as observed.

The deferred matrix remains:

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
