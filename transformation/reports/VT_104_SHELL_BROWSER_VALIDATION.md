# VT-104 Shell and Entry-Point Browser Validation

Date: 2026-07-28

Issue: #126

Branch: `visual-transformation/vt-104-shell-browser-validation`

Target: `main`

Disposition: in progress; initial evidence matrix established and one authentication handoff defect corrected

## Purpose

Complete the residual Phase 0–1 browser-validation record for the public landing page, authentication experience, signed-in Home, brand, desktop/mobile navigation, imported-game job panel, wide signed-in workspaces, and the production-token compatibility boundary.

This report deliberately distinguishes direct observation from implementation evidence. A passing test, a correct CSS rule, or an earlier implementation report supports a check but does not become direct browser evidence by assertion.

## Evidence levels

- **DIRECT — current:** observed by the user against the current or immediately preceding implementation and relevant to the current contract.
- **DIRECT — historical:** observed in an earlier accepted checkpoint; valid for the unchanged behavior, but not proof of later surrounding changes.
- **AUTOMATED:** covered by focused tests or the complete repository workflow.
- **STATIC:** supported by inspected template, component, style, route, or asset code only.
- **OPEN — browser:** requires direct reproduction or an explicit inability/reason.
- **CORRECTED:** a concrete defect found during VT-104 and changed on this branch; final automated and browser disposition still required.

## Existing direct evidence

### Home palette and large-screen composition

The user supplied a 2048×1151 screenshot of populated `/home` with the expanded navigation rail.

Observed:

- the VT-102 green-grey Home palette, white/muted/quiet surface hierarchy, graphite emphasis, and mint signal remained coherent;
- navigation and Home read as one signed-in composition;
- the application left excessive horizontal space unused because the signed-in shell and Home content had conservative hard caps;
- the outer legacy body gutters showed that the screenshot was taken before the VT-103 global production layer was integrated.

VT-103 corrected the width contract before merge:

- signed-in `.page-shell`: 1600px → 1920px cap;
- Home `.home-page`: 1240px → 1560px cap;
- copy-level max widths and mobile breakpoints remained unchanged.

This is direct evidence for the palette direction and the existence of the former width defect. The post-correction 1920px/1560px result remains an **OPEN — browser** check.

### Navigation direction

The Phase 1C browser review recorded strong acceptance of the expanded/collapsed rail, primary destination behavior, identity, and overall composition. It also identified the need for a stronger child disclosure affordance; that correction and the later inline-accordion behavior are integrated.

This is **DIRECT — historical** evidence for the navigation direction. It does not by itself complete the current long-label, short-height, keyboard, flyout-edge, mobile-sheet, or production-token compatibility matrix.

## Correction found during VT-104

### Local-development authentication ignored `returnUrl`

The Clerk path already retained the query-param return URL:

- login and signup read `returnUrl`, defaulting to `/home`;
- authenticated completion calls `router.navigateByUrl(returnUrl)`;
- sign-in/sign-up switch links preserve the same query parameter.

The local-development templates instead hard-coded `routerLink="/library"`. This violated the explicit-return-URL contract and retained the superseded pre-Home destination.

VT-104 changes both local-development actions to:

```html
<a [routerLink]="returnUrl" class="auth-action">Continue to application</a>
```

Focused coverage in `auth-return-url.spec.ts` verifies local-development login and signup links for `/games` and `/opening-analysis` return URLs.

Status: **CORRECTED**; final CI and direct local-development browser confirmation remain required.

## Validation matrix

### Public landing page

| Check | Evidence | Status | Remaining action |
|---|---|---|---|
| Hero and first-screen content remain visible without reveal gating | Hero has no reveal marker; reveal helper touches only `[data-scroll-reveal]` | STATIC | Observe desktop and narrow phone |
| Selected lower sections reveal once on entry | `IntersectionObserver`, unobserve after reveal, focused spec | AUTOMATED | Observe normal-motion scrolling |
| Content remains visible without `IntersectionObserver` or `matchMedia` | Focused specs | AUTOMATED | No additional browser requirement unless unsupported-browser testing is available |
| Reduced motion skips pending animation | Helper and focused specs cover initial and runtime preference changes | AUTOMATED | Observe browser emulation with reduced motion |
| Reveal uses no layout-shifting geometry | Opacity and 18px transform only | STATIC | Observe for visual jump/focus anomalies |
| Workflow steps stack at 980px/640px boundaries | CSS changes 5 → 3 → 1 columns | STATIC | Observe tablet and narrow phone |
| Keyboard focus and skip link | Skip link and visible mint focus rules present | STATIC | Keyboard-only browser pass |
| Public header/footer and CTA wrapping | Responsive CSS present | STATIC | Observe 980px, 640px, and long-text behavior |

### Authentication

| Check | Evidence | Status | Remaining action |
|---|---|---|---|
| Auth is outside the signed-in shell | `AppComponent.isStandaloneUrl` covers `/login` and `/signup` | STATIC | Observe direct navigation |
| Desktop two-column and mobile focused layouts | Shared auth shell CSS uses two-column desktop and hides story below 760px | STATIC | Observe desktop, tablet, phone |
| Clerk mounts/unmounts in configured builds | Login/signup lifecycle code | STATIC | Requires configured Clerk browser session |
| Login/signup switch preserves `returnUrl` | Existing query-param bindings | STATIC | Observe configured Clerk flow |
| Auth completion navigates to explicit `returnUrl` | `navigateByUrl(returnUrl)` in both components | STATIC | Observe configured Clerk flow |
| Local-development action preserves `returnUrl` | VT-104 correction plus focused spec | CORRECTED | Observe local dev login/signup |
| Default return destination is `/home` | Component default | STATIC | Observe local and configured flows |
| Auth error state and focus | Alert markup and styled error state | STATIC | Reproduce an app-user resolution failure if feasible |

### Signed-in Home

| Check | Evidence | Status | Remaining action |
|---|---|---|---|
| Populated desktop palette/composition | User 2048×1151 screenshot | DIRECT — current | Recheck after integrated width/global-token correction |
| Expanded rail with populated Home | Same screenshot | DIRECT — current | Recheck post-correction |
| 1920px shell / 1560px Home caps use large display | VT-103 CSS correction | STATIC | Observe large desktop after restarting the Angular dev server |
| Loading skeleton state | Explicit template and responsive CSS | STATIC | Reproduce/observe loading |
| Error and retry state | Explicit alert/template state | STATIC | Reproduce/observe error |
| Warning/partial-data state | Explicit status state | STATIC | Reproduce/observe warnings |
| Empty recommendation state | Explicit `@empty` card | STATIC | Reproduce/observe empty recommendations |
| Tablet and mobile stacking | 1000px and 760px CSS rules | STATIC | Observe representative widths |
| Focus and reduced motion | Home-local focus rules and reduced-motion transition/animation removal | STATIC | Keyboard and reduced-motion browser pass |
| Long account/content labels | Ellipsis and constrained copy rules | STATIC | Observe realistic long labels |

### Brand and favicon

| Check | Evidence | Status | Remaining action |
|---|---|---|---|
| One source Node Branch geometry | Shared component/assets and focused tests | AUTOMATED | None for topology |
| Decorative and labeled accessibility | Component bindings and focused tests | AUTOMATED | Screen-reader/browser spot check optional |
| Standard, plain, and reversed variants | Shared component CSS and tests | AUTOMATED | Observe contrast on integrated surfaces |
| Live-text wordmark | Shared lockup template and tests | AUTOMATED | Observe wrapping/proportions |
| Mobile lockup collapse | 640px rule and landing/mobile usage | STATIC | Observe phone widths |
| SVG favicon with ICO fallback | `index.html` links | STATIC | Observe browser tab/favicon cache behavior |
| Rasterization at 16/24/32/42/48px | Stable vector geometry only | OPEN — browser | Capture/inspect at required sizes |

### Desktop and mobile navigation

| Check | Evidence | Status | Remaining action |
|---|---|---|---|
| Expanded/collapsed direction and identity | Phase 1C direct review | DIRECT — historical | Confirm current token/width integration |
| Collapse/expand semantics | Focused component test | AUTOMATED | Keyboard/pointer spot check |
| Parent route remains navigable | Focused component test | AUTOMATED | Browser spot check |
| Expanded inline child group | Focused tests and disclosure CSS | AUTOMATED | Observe height/motion and focus order |
| Single open group | Focused component test | AUTOMATED | Browser spot check |
| Collapsed popup menu/backdrop | Focused component test | AUTOMATED | Observe placement near viewport edges |
| Escape and route cleanup | Focused tests | AUTOMATED | Keyboard browser pass |
| Reduced-motion disclosure behavior | CSS media query | STATIC | Observe browser emulation |
| Expanded rail scrolling on short height | Overflow/overscroll CSS | STATIC | Observe short viewport |
| Long labels and user names | Ellipsis/constrained layout rules | STATIC | Observe realistic long strings |
| Clerk user button/account interaction | Component integration | STATIC | Requires configured Clerk browser session |
| Grouped mobile sheet and route close | Template plus focused route-close test | AUTOMATED | Observe 760px boundary and narrow phone |
| Mobile keyboard/focus containment | No modal focus-trap contract is implemented | OPEN — browser/design disposition | Observe actual keyboard behavior and decide whether a narrow correction is required |

### Job panel and representative signed-in widths

| Check | Evidence | Status | Remaining action |
|---|---|---|---|
| Fixed panel stays inside viewport | 520px/max viewport width, mobile 10px gutters | STATIC | Observe desktop/mobile with active jobs |
| Content scrolls within bounded height | 52vh/420px desktop, 45vh mobile | STATIC | Observe multiple runs and long labels |
| Signed-in content reserves bottom space | App shell adds 170px desktop / 190px mobile padding when visible runs exist | STATIC | Observe overlap with long pages and mobile controls |
| Production-token compatibility on legacy routes | VT-103 intentionally preserves short-token feature styling | STATIC | Observe Games, Study, Opening Analysis representative routes |
| Wide signed-in page use | Global 1920px cap integrated | STATIC | Observe Home and at least one representative legacy route |

## Files inspected

- `apps/web/src/app/app.component.ts`
- `apps/web/src/app/app.component.html`
- `apps/web/src/app/app.component.css`
- `apps/web/src/app/features/public/landing-page.component.ts`
- `apps/web/src/app/features/public/landing-page.component.css`
- `apps/web/src/app/features/public/landing-scroll-reveal.ts`
- `apps/web/src/app/features/public/landing-scroll-reveal.spec.ts`
- `apps/web/src/app/features/auth/auth-shell.component.ts`
- `apps/web/src/app/features/auth/auth-shell.component.css`
- `apps/web/src/app/features/auth/login-page.component.ts`
- `apps/web/src/app/features/auth/login-page.component.html`
- `apps/web/src/app/features/auth/login-page.component.css`
- `apps/web/src/app/features/auth/signup-page.component.ts`
- `apps/web/src/app/features/auth/signup-page.component.html`
- `apps/web/src/app/features/home/home-page.component.html`
- `apps/web/src/app/features/home/home-page.component.css`
- `apps/web/src/app/shared/ui/brand/brand-mark.component.ts`
- `apps/web/src/app/shared/ui/brand/brand-mark.component.html`
- `apps/web/src/app/shared/ui/brand/brand-mark.component.css`
- `apps/web/src/app/shared/ui/brand/brand-lockup.component.ts`
- `apps/web/src/app/shared/ui/brand/brand-lockup.component.html`
- `apps/web/src/app/shared/ui/brand/brand-lockup.component.css`
- `apps/web/src/app/core/layout/main-navigation/main-navigation.component.ts`
- `apps/web/src/app/core/layout/main-navigation/main-navigation.component.html`
- `apps/web/src/app/core/layout/main-navigation/main-navigation-disclosure.css`
- `apps/web/src/app/core/layout/main-navigation/main-navigation.component.spec.ts`
- `apps/web/src/app/core/jobs/imported-game-job-panel.component.css`
- `apps/web/src/index.html`
- `apps/web/src/design-system.css`
- `transformation/reports/PHASE_1A_BRAND_ASSETS_IMPLEMENTATION.md`
- `transformation/reports/PHASE_1C_BROWSER_REVIEW_FEEDBACK.md`
- `transformation/reports/VT_102_HOME_PALETTE_CALIBRATION.md`
- `transformation/reports/VT_103_PRODUCTION_TOKENS_TYPOGRAPHY.md`

## Current conclusion

Phase 1 shell and entry points cannot yet be declared browser-complete.

The implemented behavior has strong automated/static support and accepted direct evidence for the overall navigation direction and Home palette. VT-104 also found and corrected the local-development return-URL mismatch. The remaining direct checkpoints are now explicit rather than implicit: post-width Home, landing normal/reduced motion, auth desktop/mobile and Clerk/dev flows, brand rasterization/favicon, navigation edge cases, job-panel overlap, and representative legacy-route compatibility.

No Phase 2 workflow redesign is included in this task.
