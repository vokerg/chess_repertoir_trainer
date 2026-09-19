# Phase 0A landing-page visual proof

This folder contains the high-fidelity visual proof and review evidence for the Chess Repertoire Trainer transformation.

It is intentionally static HTML/CSS and SVG rather than Angular production code. Its purpose is to validate identity, landing-page composition, responsive behavior, typography hierarchy, and the provisional palette before Phase 1 changes application routes or the product shell.

## View locally

From the repository root:

```bash
python3 -m http.server 4173 --directory transformation/prototypes/phase-0a-landing
```

Open `http://localhost:4173/`.

The page also opens directly from `index.html`, but using a local server gives browser behavior closer to production hosting.

## Included assets

- `node-branch-mark.svg` — monochrome standalone symbol.
- `node-branch-badge.svg` — graphite badge with mint geometry.
- `node-branch-badge-reversed.svg` — mint badge with graphite geometry.
- `proof-sheet.svg` — original Phase 0A identity and landing-hero summary.
- `review-sheet.svg` — current decision artifact with complete small-size rendering, palette contrast evidence, typography samples, and decision recommendations.
- `index.html` — complete landing-page composition.
- `styles.css` — self-contained responsive styling.

## Scope boundaries

This prototype:

- does not change the Angular application;
- does not register routes;
- does not change authentication;
- does not add dependencies;
- uses static illustrative product data;
- does not claim that all displayed metrics already exist as a single API payload.

The examples are grounded in real product concepts: imported games, opening assignment, course gaps, continuation discovery, targeted line training, tactical review, and progress.

## Review order

1. Read `../../reports/PHASE_0A_REVIEW_REFINEMENT.md`.
2. Open `review-sheet.svg`.
3. Review the full `index.html` prototype at approximately:
   - 1440px desktop;
   - 1024px compact desktop/tablet;
   - 768px tablet;
   - 390px mobile.
4. Use `proof-sheet.svg` only as the original Phase 0A summary.

## Decision checklist

Decide explicitly:

1. whether Node Branch geometry v1 is approved for production asset work;
2. whether the badge should be the required 16px treatment;
3. whether the strong-mint text token should move from `#23836D` to the accessible candidate `#1F7865`;
4. whether the wordmark proportions and typography direction are acceptable for auth/home prototyping;
5. whether the current public copy, section order, density, and mobile hierarchy should carry forward.

## Current status

The visual direction remains provisional until the Phase 0A decision gate is explicitly approved or revised. No production Angular work should begin from this folder alone.
