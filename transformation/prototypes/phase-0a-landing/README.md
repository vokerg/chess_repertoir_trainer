# Phase 0A landing-page visual proof

This folder contains the first high-fidelity visual proof for the Chess Repertoire Trainer transformation.

It is intentionally a static HTML/CSS prototype rather than Angular production code. Its purpose is to validate the identity, landing-page composition, responsive behavior, typography hierarchy, and provisional palette before Phase 1 changes the application shell or routes.

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
- `proof-sheet.svg` — pull-request-friendly summary of the identity and hero.
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

## Review checklist

Review at approximately:

- 1440px desktop;
- 1024px compact desktop/tablet;
- 768px tablet;
- 390px mobile.

Judge:

1. whether the product promise is immediately understandable;
2. whether graphite and mint feel distinctive without becoming cold;
3. whether the Node Branch mark remains legible at small sizes;
4. whether the product composition feels authentic;
5. whether the page is too dense, too sparse, too corporate, or too generic;
6. whether the three capability sections correctly represent the product;
7. whether the mobile layout preserves hierarchy.

## Current status

This is version 1 for review. Palette values, final copy, and exact mark geometry remain provisional until the visual checkpoint is approved.
