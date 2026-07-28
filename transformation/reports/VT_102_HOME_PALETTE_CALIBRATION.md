# VT-102 Home Palette Calibration

Date: 2026-07-28

Issue: #124

Branch: `visual-transformation/vt-102-home-palette-calibration`

Pull request: #141 — draft

Target: `visual_transformation`

## Purpose

Calibrate the signed-in Home canvas and surface hierarchy so the graphite navigation rail, dominant Continue action, progress emphasis, and light analytical content read as one coherent graphite/mint workspace rather than isolated dark blocks on the legacy cool-grey application background.

This is a Home-local evidence slice for VT-103. It does not migrate global tokens or typography.

## Repository evidence before the change

The Home stylesheet already defined a green-grey `--home-canvas` role, but the canvas was not applied to `:host` or `.home-page`. The page therefore inherited the legacy global body gradient while rendering:

- a dark graphite rail beside it;
- a large graphite Continue card;
- a second dark graphite progress block;
- mostly white or translucent-white cards with relatively strong floating shadows.

The intended colours existed individually, but the page did not establish a continuous signed-in workspace hierarchy.

## Implementation

Only `apps/web/src/app/features/home/home-page.component.css` changes at runtime.

### Canvas

The Home host now owns a route-local green-grey workspace:

- primary canvas: `#E7EEEA`;
- soft upper canvas: `#EEF4F1`;
- lower canvas endpoint: `#E3EBE7`;
- restrained mint radial signal near the upper-right composition;
- a subtle inset edge between the rail gap and Home workspace.

The global body background and legacy page palette remain unchanged for routes that have not yet been transformed.

### Surface hierarchy

Home-local surface roles are:

- important/interactive cards: `#FFFFFF`;
- secondary containers: `#F2F6F4`;
- quiet loading/tonal surface: `#EAF1ED`;
- standard border: `#C4D1CB`;
- stronger interactive border: `#AEBFB7`.

Applied hierarchy:

- recommendation cards and metric cards remain clear white surfaces;
- account summary, workspace container, and progress container use the quieter secondary surface;
- shortcut cards remain white inside their muted container;
- loading skeletons use the Home tonal hierarchy rather than the legacy cool-grey shimmer.

### Dark emphasis

Graphite remains limited to:

- the integrated signed-in navigation chrome;
- the dominant Continue action;
- the justified primary recent-progress metric.

The progress block uses a softer graphite gradient from `#22312E` to `#2A3D38` with a restrained mint border rather than another isolated near-black block.

### Elevation

The previous large card shadows are reduced:

- important cards use a small low-opacity shadow;
- hover elevation remains visible but restrained;
- secondary containers use tonal separation and an inset highlight instead of floating elevation;
- the Continue card keeps the strongest Home elevation because it is the dominant action, but its shadow is reduced.

### Interaction and focus

Mint remains the interaction/signal colour. Home links and controls receive a Home-local strong-mint focus outline. The selector is scoped through `:host .home-page` so it has sufficient specificity to override the legacy shell-wide amber button focus rule without changing other routes. Hover treatments use border and tonal changes rather than large brightness or shadow changes.

Reduced-motion handling also removes the small hover transitions added to Continue and shortcut cards.

## Palette recommendation for VT-103

VT-103 should treat these as evidence, not automatically copy every literal value:

| Role | VT-102 evidence value | Recommendation |
|---|---:|---|
| transformed workspace canvas | `#E7EEEA` | promote as candidate signed-in canvas |
| soft canvas variation | `#EEF4F1` | retain as optional composition tint, not a required global gradient |
| strong surface | `#FFFFFF` | retain for important cards and metrics |
| muted secondary surface | `#F2F6F4` | promote as candidate secondary panel/container surface |
| quiet tonal surface | `#EAF1ED` | candidate for loading, subtle grouping, and disabled/quiet areas |
| border | `#C4D1CB` | candidate standard transformed border |
| stronger border | `#AEBFB7` | candidate hover/selected structural border |
| primary graphite | `#172321` | retain |
| secondary graphite | `#22312E` | retain |
| raised graphite | `#2A3D38` | candidate for secondary dark analytical emphasis |
| signal mint | `#47B89C` | retain |
| strong mint text/focus | `#1F7865` | retain locked role |

VT-103 must still define semantic token names, reconcile success/warning/danger/information, establish the legacy-page compatibility boundary, and decide typography. This report does not approve a global replacement of the current amber system.

## Behavior preserved

No changes are made to:

- Home component/template or store;
- account selection or loading;
- Continue/recommendation computation;
- routes or query parameters;
- responsive composition structure;
- APIs, contracts, schemas, database, jobs, or backend behavior;
- navigation interaction or rail styling;
- global application tokens or typography.

## Branch reconciliation

VT-102 was first claimed while VT-101 was under review. Their runtime scopes did not overlap: VT-101 owned navigation files and VT-102 owns Home-local CSS.

VT-101 and the queue-facing reconciliation work then integrated through PRs #137 and #142–#144. The VT-102 branch was refreshed onto stable queue commit `9b4160e73cad296c3534b3628a8e92e3ac70b26d`; the Home CSS was reapplied unchanged and VT-102 records were rebuilt from that integrated state. No stale draft-navigation or pre-reconciliation queue wording remains in PR #141.

## Automated validation

Pending on the final refreshed draft PR #141 head:

- dependency installation;
- lint;
- full repository build;
- architecture guardrails;
- database migrations;
- complete test suite.

A prior rebased head passed the complete repository workflow in CI #1141. That run does not replace the required check on the final refreshed documentation/focus head.

No focused component test is added because this slice changes CSS only and does not alter DOM, state, routes, or behavior. Existing Home and complete repository tests remain the regression boundary.

## Direct browser validation required

Review `/home` with:

- populated data;
- loading state;
- warnings and error state;
- no urgent recommendations/empty recommendation state;
- desktop expanded rail;
- desktop collapsed rail;
- tablet width;
- mobile width;
- long account label and long content;
- keyboard focus across Refresh, Continue, recommendations, shortcuts, and Progress link;
- normal and reduced motion;
- contrast of muted text, borders, mint text, and dark surfaces.

Confirm specifically:

- the rail and Home read as one product system without making Home dark;
- the canvas is visibly green-grey but not saturated;
- dark emphasis is limited and intentional;
- important white cards remain clear;
- secondary containers do not look like another layer of floating cards;
- the Home-local mint focus outline is visible on links and buttons and does not fall back to the shell amber outline;
- no horizontal overflow or unexpected page-width change occurs.

## Residual risks

- direct browser evidence is not yet recorded;
- the canvas may need a small optical adjustment after viewing it beside both expanded and collapsed rail states;
- the final global token values remain open until VT-103.

## Stop condition

Keep PR #141 in draft until automated validation and direct browser evidence are recorded. Do not merge without explicit approval. Close issue #124 and change issue #125 to `READY` only after approved squash merge into `visual_transformation` and post-merge documentation/issue reconciliation.
