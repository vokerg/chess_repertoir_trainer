# Phase 0A Review Refinement Report

Date: 2026-07-25

Branch: `visual-transformation/phase-0a-review-refinement`

Base: `visual_transformation`

## Executive summary

This slice performs the repository-defined next checkpoint after the initial Phase 0A landing proof: a focused review refinement before auth/home visualization or production Angular implementation.

The review found two objective proof issues:

1. the original `proof-sheet.svg` small-size row rendered only one node rather than the complete Node Branch mark, so it did not actually validate the geometry at 16px, 24px, 32px, and 48px;
2. the provisional strong-mint text color `#23836D` has a contrast ratio of approximately `4.12:1` against the workspace canvas `#EEF3F0`, below the WCAG AA `4.5:1` threshold for normal text.

A new GitHub-renderable `review-sheet.svg` corrects the small-size evidence, records the contrast result, presents an accessible candidate token, and makes the remaining Phase 0A decisions explicit. No production code or runtime behavior changed.

## Work completed

- Created `review-sheet.svg` as the current Phase 0A decision artifact.
- Rendered the complete normal badge, reversed badge, and monochrome mark at 16px, 24px, 32px, and 48px.
- Added a geometry recommendation:
  - retain Node Branch geometry v1;
  - use the badge treatment, rather than the standalone mark, at 16px.
- Added palette contrast evidence:
  - current `#23836D` on `#EEF3F0`: approximately `4.12:1`;
  - candidate `#1F7865` on `#EEF3F0`: approximately `4.76:1`.
- Added typography, wordmark, and analytical-numeric samples while keeping font loading explicitly provisional.
- Added explicit recommendations for open decisions D-301, D-302, and D-303.
- Updated the transformation entry point, status tracker, and prototype README to point reviewers to the current artifact.
- Corrected the stale active-review-branch status left after PR #74 was merged.

## Design and implementation rationale

### Preserve the locked identity direction

The Node Branch concept is locked. This slice therefore does not restart logo exploration or introduce another symbol. It tests the existing controlled SVG geometry in the contexts required by the master plan.

### Correct evidence instead of silently approving it

The original proof claimed a small-size test, but the relevant row showed only one circle. Rather than treating that as approval evidence, the new review sheet uses the complete geometry at exact displayed sizes.

### Keep accessibility corrections narrow

The graphite, signal mint, workspace, and surface direction remains coherent. The identified issue is limited to strong-mint text on the light workspace. `#1F7865` is proposed because it retains the same visual role while raising the measured contrast above `4.5:1`.

The palette decision remains open until explicitly approved. The production prototype token is not changed in this slice.

### Avoid premature Angular implementation

The repository stop condition remains in force. This work stays under `transformation/` and produces review evidence only. It does not create production brand assets, routes, layouts, components, or authentication changes.

## Recommended Phase 0A decisions

### D-301 — Final Node Branch geometry

Recommend approval of geometry v1:

- `64 × 64` view box;
- `5` unit rounded stroke;
- `5.5` unit nodes;
- existing orthogonal branch path;
- existing normal and reversed badge proportions.

Usage recommendation:

- use the full badge at 16px and other favicon/collapsed-rail contexts;
- reserve the standalone mark for larger monochrome contexts.

### D-302 — Final production palette

Recommend revising only the provisional strong-mint text token:

- current: `#23836D`;
- candidate: `#1F7865`.

Keep the remaining palette values provisional until representative analytical pages test semantic states, evaluations, charts, warnings, and errors.

### D-303 — Landing copy and composition

Recommend retaining the current landing structure for the auth/home prototype stage:

1. product promise and realistic analytical hero;
2. continuous game-to-training workflow;
3. understand games;
4. build repertoire;
5. train what matters;
6. progress with context;
7. final call to action.

Copy can still receive focused editorial polish, but no structural rewrite is recommended before the related entry-point experiences are visualized.

### Typography and wordmark

Recommend carrying the current proportions into auth/home prototyping:

- `Chess Repertoire` primary;
- `TRAINER` secondary with expanded tracking;
- IBM Plex Sans direction;
- monospaced analytical numerics.

Font loading and the final type scale remain production implementation concerns and are not locked by this static proof.

## Files changed

- `TRANSFORMATION.md`
- `transformation/STATUS.md`
- `transformation/prototypes/phase-0a-landing/README.md`
- `transformation/prototypes/phase-0a-landing/review-sheet.svg`
- `transformation/reports/PHASE_0A_REVIEW_REFINEMENT.md`

## Validation performed

- Parsed the complete new `review-sheet.svg` as XML.
- Confirmed the SVG uses no raster images, embedded fonts, filters requiring external resources, scripts, or external dependencies.
- Confirmed normal, reversed, and monochrome symbols all reuse the same controlled geometry.
- Confirmed each treatment is instantiated at exact 16px, 24px, 32px, and 48px dimensions.
- Calculated contrast ratios from the recorded hexadecimal values using the WCAG relative-luminance formula:
  - `#23836D` on `#EEF3F0`: approximately `4.12:1`;
  - `#1F7865` on `#EEF3F0`: approximately `4.76:1`;
  - `#47B89C` on `#172321`: approximately `6.62:1`;
  - `#172321` on `#FFFFFF`: approximately `16.17:1`.
- Re-read the changed repository files from the working branch after connector writes.
- Compared the working branch with `visual_transformation` before opening the pull request.

## Commands skipped and why

The following repository commands were not run:

```text
npm run build:web
npm run test --workspace=apps/web
npm run lint
npm run check:architecture
```

Reason: this slice changes only static transformation review artifacts and Markdown documentation. It does not modify Angular, TypeScript, package configuration, runtime assets, or architecture boundaries.

Browser/Playwright rendering was not repeated because this connector-only session does not provide a checked-out browser workspace. The existing full landing prototype had already been rendered at four viewports during Phase 0A; this slice adds a standalone SVG review artifact whose XML structure was validated.

## Warnings, residual risks, and open decisions

- Exact visual rasterization at 16px varies by browser and display density. The full badge is recommended, but final favicon export should still be visually checked in production.
- `#1F7865` is an accessible candidate, not a locked token until explicitly approved and recorded in `DECISIONS.md`.
- The review sheet uses a font fallback stack; it does not prove IBM Plex Sans loading or platform-specific metrics.
- The current landing examples remain illustrative and must not be treated as evidence that one backend endpoint already supplies every displayed metric.
- Warning, danger, information, engine-evaluation, and chart palettes remain outside this checkpoint.
- D-301, D-302, D-303, typography proportions, density, and mobile composition remain open until explicit review.
- Auth/home visualization and Phase 1 Angular work remain blocked.

## Review and reproduction instructions

Start with:

1. `transformation/prototypes/phase-0a-landing/review-sheet.svg`
2. this report;
3. the full landing prototype.

To run the landing prototype from a local checkout:

```bash
python3 -m http.server 4173 --directory transformation/prototypes/phase-0a-landing
```

Open `http://localhost:4173/` and review at:

- 1440px;
- 1024px;
- 768px;
- 390px.

Approve or revise the recommendations for D-301, D-302, D-303, and typography/wordmark proportions. Stop there. Do not merge this PR or begin auth/home visualization without explicit approval.
