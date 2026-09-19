# VT-102 Home Palette Calibration

Date: 2026-07-28

Issue: #124

Branch: `visual-transformation/vt-102-home-palette-calibration`

Pull request: #141

Target: `visual_transformation`

Disposition: approved and squash-merged

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

The Home host owns a route-local green-grey workspace:

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

VT-103 should treat these as accepted Home evidence, not automatically copy every literal value:

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

VT-101 and the queue-facing reconciliation work integrated through PRs #137 and #142–#144. The VT-102 branch was refreshed onto that stable integrated state before final review. No stale draft-navigation or pre-reconciliation queue wording remained in PR #141.

## Automated validation

Implementation-head CI #1145 and documentation-head CI #1152 passed:

- dependency installation;
- lint;
- the full repository build;
- architecture guardrails;
- database migrations;
- the complete test suite.

No focused component test was added because this slice changes CSS only and does not alter DOM, state, routes, or behavior. Existing Home and complete repository tests remain the regression boundary.

## Browser review and approval

The user reviewed the Home result after being asked to check overall palette cohesion, canvas tone, surface hierarchy, expanded/collapsed desktop rail, responsive layouts, content states, contrast, keyboard focus, reduced motion, long labels, and overflow.

Review outcome:

- the user reported that the result “feels good”;
- the user explicitly approved the change for squash merge;
- the VT-102 visual direction and merge boundary are accepted.

This approval does not claim that every Phase 0–1 browser permutation has been exhaustively reproduced. Issue #126 remains responsible for the comprehensive residual matrix across public, authentication, Home, brand, navigation, Clerk/dev-auth, long-content, responsive, and reduced-motion conditions.

## Residual risks

- comprehensive cross-state and cross-width browser evidence remains owned by issue #126;
- the final global token names, semantic status colours, compatibility boundary, and typography remain open until VT-103;
- Home-local values must not be copied globally without the explicit VT-103 migration contract.

## Completion

VT-102 is complete through approved squash merge of PR #141 into `visual_transformation`. Issue #124 is closed. Issues #125 and #126 are `READY`; #125 is the deterministic next task because it has the lower P1 order.