# Chess Repertoire Trainer brand assets

The production symbol is the geometric **Node Branch** mark approved by the visual transformation program.

## Geometry

All production variants use the same `0 0 64 64` geometry:

- a source line rises from the lower-left node;
- the line branches through the center decision point;
- endpoints resolve at the upper-center and lower-right target nodes;
- stroke width is `5` with round caps and joins;
- node radius is `5.5`;
- badge corner radius is `16`.

Do not redraw or substitute a different branch topology in feature code. Focused optical corrections must update the assets and `BrandMarkComponent` together.

## Files

- `branch-mark.svg` — transparent mint mark for controlled dark or neutral surfaces;
- `branch-badge.svg` — graphite badge with mint geometry;
- `branch-badge-reversed.svg` — mint badge with graphite geometry;
- `favicon.svg` — standard badge geometry for browser metadata.

The Angular `BrandMarkComponent` owns inline, themeable UI rendering. Static SVG files are for metadata, external references, and contexts where an Angular component is unavailable.

## Usage

- Use the standard badge on light workspaces and neutral surfaces.
- Use the reversed badge where a mint tile is required on graphite chrome.
- Use the transparent mark only when the surrounding surface supplies sufficient contrast.
- Use live HTML text for `Chess Repertoire` and `TRAINER`; never embed the wordmark in an SVG.
- Decorative instances must be hidden from assistive technology. Meaningful standalone marks require an accessible label.

## Sizes

The geometry is intended for 16px, 24px, 32px, 42px, 48px, and larger display use. Verify exact browser rasterization when favicon and production shell screenshots are reviewed.

## Deferred

A social-preview asset remains deferred until public metadata and final landing-page copy are reviewed together.
