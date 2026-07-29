# VT-104 Shell and Entry-Point Browser Validation

Date: 2026-07-28

Issue: #126

Branch: `visual-transformation/vt-104-shell-browser-validation`

Target: `main`

Disposition: approved for integration with explicitly retained browser-risk items

## Purpose

Complete the residual Phase 0–1 browser-validation record for the public landing page, authentication experience, signed-in Home, brand, desktop/mobile navigation, imported-game job panel, wide signed-in workspaces, and the production-token compatibility boundary.

This report deliberately distinguishes direct observation from implementation evidence. A passing test, a correct CSS rule, or an earlier implementation report supports a check but does not become direct browser evidence by assertion.

## Evidence levels

- **DIRECT — current:** observed by the user against the current or immediately preceding implementation and relevant to the current contract.
- **DIRECT — historical:** observed in an earlier accepted checkpoint; valid for the unchanged behavior, but not proof of later surrounding changes.
- **AUTOMATED:** covered by focused tests or the complete repository workflow.
- **STATIC:** supported by inspected template, component, style, route, or asset code only.
- **OPEN — browser:** not directly reproduced; retained with an explicit reason rather than treated as passed.
- **CORRECTED:** a concrete defect found during VT-104 and changed on this branch.

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

This is direct evidence for the palette direction and the existence of the former width defect. The post-correction 1920px/1560px result was not re-observed on a large display because the user no longer had access to one during final VT-104 review. That limitation is retained as an explicit browser-risk item rather than represented as a pass.

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

Status: **CORRECTED** and covered by corrected-head CI #1270. Direct local-development browser reproduction was not required as a merge blocker after user acceptance of the documented evidence boundary.

## Final review disposition

The user stated that they could not fully repeat the large-screen checks because a large display was unavailable, but confirmed that the task could be accepted and moved forward.

The acceptance boundary is therefore:

- automated and static evidence is accepted for the implemented contracts;
- previously supplied Home and navigation observations remain valid within their actual scope;
- unobserved large-screen, Clerk-specific, reduced-motion, long-content, and active-job edge cases remain explicitly documented below;
- those items are residual verification risks, not claims of completion and not blockers for Phase 2 sequencing;
- any later reproduced defect should be handled in the owning workflow task or a narrow follow-up rather than reopening the design direction without evidence.

This disposition satisfies VT-104’s requirement that each residual check be either evidenced or left open with a reason. It does not assert that every browser permutation was directly observed.

## Validation matrix

### Public landing page

| Check | Evidence | Status | Residual reason |
|---|---|---|---|
| Hero and first-screen content remain visible without reveal gating | Hero has no reveal marker; reveal helper touches only `[data-scroll-reveal]` | STATIC | Desktop and narrow-phone observation not repeated during final review |
| Selected lower sections reveal once on entry | `IntersectionObserver`, unobserve after reveal, focused spec | AUTOMATED | Normal-motion scrolling not repeated during final review |
| Content remains visible without `IntersectionObserver` or `matchMedia` | Focused specs | AUTOMATED | No additional browser requirement unless unsupported-browser testing becomes available |
| Reduced motion skips pending animation | Helper and focused specs cover initial and runtime preference changes | AUTOMATED | Browser reduced-motion emulation not repeated |
| Reveal uses no layout-shifting geometry | Opacity and 18px transform only | STATIC | Visual jump/focus observation remains a residual check |
| Workflow steps stack at 980px/640px boundaries | CSS changes 5 → 3 → 1 columns | STATIC | Tablet and narrow-phone observation not repeated |
| Keyboard focus and skip link | Skip link and visible mint focus rules present | STATIC | Keyboard-only browser pass not repeated |
| Public header/footer and CTA wrapping | Responsive CSS present | STATIC | Boundary and long-text observation remains open |

### Authentication

| Check | Evidence | Status | Residual reason |
|---|---|---|---|
| Auth is outside the signed-in shell | `AppComponent.isStandaloneUrl` covers `/login` and `/signup` | STATIC | Direct navigation not repeated |
| Desktop two-column and mobile focused layouts | Shared auth shell CSS uses two-column desktop and hides story below 760px | STATIC | Desktop/tablet/phone observation not repeated |
| Clerk mounts/unmounts in configured builds | Login/signup lifecycle code | STATIC | Requires a configured Clerk browser session |
| Login/signup switch preserves `returnUrl` | Existing query-param bindings | STATIC | Configured Clerk flow not reproduced |
| Auth completion navigates to explicit `returnUrl` | `navigateByUrl(returnUrl)` in both components | STATIC | Configured Clerk flow not reproduced |
| Local-development action preserves `returnUrl` | VT-104 correction plus focused spec | CORRECTED / AUTOMATED | Direct local-dev browser reproduction not repeated |
| Default return destination is `/home` | Component default | STATIC | Direct local/configured flow not repeated |
| Auth error state and focus | Alert markup and styled error state | STATIC | App-user resolution failure not reproduced |

### Signed-in Home

| Check | Evidence | Status | Residual reason |
|---|---|---|---|
| Populated desktop palette/composition | User 2048×1151 screenshot | DIRECT — current | Post-width/global-token result not re-observed on a large display |
| Expanded rail with populated Home | Same screenshot | DIRECT — current | Post-correction large-display observation unavailable |
| 1920px shell / 1560px Home caps use large display | VT-103 CSS correction | STATIC | User did not have large-display access during final review |
| Loading skeleton state | Explicit template and responsive CSS | STATIC | Loading state not reproduced |
| Error and retry state | Explicit alert/template state | STATIC | Error state not reproduced |
| Warning/partial-data state | Explicit status state | STATIC | Warning state not reproduced |
| Empty recommendation state | Explicit `@empty` card | STATIC | Empty recommendation state not reproduced |
| Tablet and mobile stacking | 1000px and 760px CSS rules | STATIC | Representative responsive widths not fully repeated |
| Focus and reduced motion | Home-local focus rules and reduced-motion transition/animation removal | STATIC | Keyboard and reduced-motion pass not repeated |
| Long account/content labels | Ellipsis and constrained copy rules | STATIC | Realistic long labels not reproduced |

### Brand and favicon

| Check | Evidence | Status | Residual reason |
|---|---|---|---|
| One source Node Branch geometry | Shared component/assets and focused tests | AUTOMATED | None for topology |
| Decorative and labeled accessibility | Component bindings and focused tests | AUTOMATED | Screen-reader/browser spot check optional |
| Standard, plain, and reversed variants | Shared component CSS and tests | AUTOMATED | Integrated-surface contrast not exhaustively re-observed |
| Live-text wordmark | Shared lockup template and tests | AUTOMATED | Wrapping/proportions not exhaustively re-observed |
| Mobile lockup collapse | 640px rule and landing/mobile usage | STATIC | Phone-width observation not repeated |
| SVG favicon with ICO fallback | `index.html` links | STATIC | Browser tab/cache behavior not re-observed |
| Rasterization at 16/24/32/42/48px | Stable vector geometry only | OPEN — browser | Required sizes not captured during final review |

### Desktop and mobile navigation

| Check | Evidence | Status | Residual reason |
|---|---|---|---|
| Expanded/collapsed direction and identity | Phase 1C direct review | DIRECT — historical | Current token/width integration not exhaustively re-observed |
| Collapse/expand semantics | Focused component test | AUTOMATED | Keyboard/pointer spot check not repeated |
| Parent route remains navigable | Focused component test | AUTOMATED | Browser spot check not repeated |
| Expanded inline child group | Focused tests and disclosure CSS | AUTOMATED | Height/motion/focus-order observation not repeated |
| Single open group | Focused component test | AUTOMATED | Browser spot check not repeated |
| Collapsed popup menu/backdrop | Focused component test | AUTOMATED | Viewport-edge placement not re-observed |
| Escape and route cleanup | Focused tests | AUTOMATED | Keyboard browser pass not repeated |
| Reduced-motion disclosure behavior | CSS media query | STATIC | Browser emulation not repeated |
| Expanded rail scrolling on short height | Overflow/overscroll CSS | STATIC | Short viewport not reproduced |
| Long labels and user names | Ellipsis/constrained layout rules | STATIC | Realistic long strings not reproduced |
| Clerk user button/account interaction | Component integration | STATIC | Requires configured Clerk session |
| Grouped mobile sheet and route close | Template plus focused route-close test | AUTOMATED | 760px boundary and narrow-phone observation not repeated |
| Mobile keyboard/focus containment | No modal focus-trap contract is implemented | OPEN — browser/design disposition | Actual keyboard behavior remains a known follow-up risk |

### Job panel and representative signed-in widths

| Check | Evidence | Status | Residual reason |
|---|---|---|---|
| Fixed panel stays inside viewport | 520px/max viewport width, mobile 10px gutters | STATIC | Active-job desktop/mobile observation not reproduced |
| Content scrolls within bounded height | 52vh/420px desktop, 45vh mobile | STATIC | Multiple runs and long labels not reproduced |
| Signed-in content reserves bottom space | App shell adds 170px desktop / 190px mobile padding when visible runs exist | STATIC | Long-page/mobile overlap not reproduced |
| Production-token compatibility on legacy routes | VT-103 intentionally preserves short-token feature styling | STATIC | Representative Games, Study, and Opening Analysis pass not exhaustive |
| Wide signed-in page use | Global 1920px cap integrated | STATIC | Large-display Home/legacy-route pass unavailable |

## Automated validation

- Initial CI #1268 and active-status CI #1269 reached the complete test suite and exposed a focused test-harness provider-order issue after lint, build, audits, architecture checks, and migrations had passed.
- The test harness was corrected so its mocked `ActivatedRoute` remains authoritative after router providers are installed.
- Corrected-head CI #1270 passed dependency installation, lint, the full repository build, both opening audits, architecture guardrails, database migrations, and the complete test suite.

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

## Final conclusion

VT-104 is accepted for integration and Phase 1 may close for transformation sequencing.

This is an evidence-bounded acceptance, not a blanket assertion that every browser permutation passed. The implementation has green automated validation, an evidence-driven auth correction, accepted direct palette/navigation direction, and explicit reasons for every unobserved residual check. Large-display re-observation, configured Clerk paths, reduced-motion permutations, long-content edges, and active-job overlap remain documented risks that can be verified when the required environment is available.

No Phase 2 workflow redesign is included in this task.