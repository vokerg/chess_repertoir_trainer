# Phase 0C signed-in home prototype

This prototype visualizes the first signed-in `/home` direction using existing repository concepts and stable API contracts. Values are illustrative; the available data fields and actions are repository-grounded.

## Review

Start with `review-sheet.svg` for a GitHub-renderable desktop/mobile overview.

To open the responsive HTML prototype from the repository root:

```bash
python3 -m http.server 4173 --directory transformation/prototypes/phase-0c-home
```

Then open `http://localhost:4173/` and review at approximately:

- 1440px desktop;
- 1024px collapsed-rail desktop/tablet;
- 768px compact layout;
- 390px mobile.

## Data foundation

The proposed first implementation uses existing stable endpoints:

- `GET /me/accounts`;
- `GET /library/catalog`;
- `GET /imported-games/facets`;
- `GET /imported-games?sort=endedAtDesc&limit=...`;
- `GET /me/accounts/:accountId/performance-stats`;
- optionally `GET /me/accounts/:accountId/rating-history` or `/rating-stats` for the compact trend.

No Lab endpoint or new backend aggregation is assumed.

## Scope boundary

This is a design/discovery artifact only. It does not implement `/home`, change post-login navigation, create production brand assets, or finalize desktop/mobile navigation behavior.
