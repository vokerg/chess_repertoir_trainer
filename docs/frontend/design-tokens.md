# Frontend design tokens

Last updated: 2026-08-10

This document is the source of truth for the production visual-token and typography contract used by transformed Angular surfaces.

## Ownership and loading order

Global styling remains intentionally split while compatibility debt exists:

1. `apps/web/src/styles.css` is the legacy compatibility layer. Short names such as `--accent`, `--surface`, `--border`, and `--text` continue to support known legacy-compatible consumers and the shared spacing scale.
2. `apps/web/src/design-system.css` loads immediately after `styles.css` and owns production `--ui-*` tokens plus narrow overrides for the application canvas, typography, controls, page headers, and proven shared primitives.
3. `responsive.css` and `workbench.css` remain later specialized layers. `workbench.css` now uses production `--ui-*` visual-semantic roles while continuing to consume the established shared `--space-*` spacing scale.

Do not repurpose legacy short token names to mean the new system. Migrate a complete consumer boundary deliberately, then remove obsolete roles only when all consumers are known and covered.

## Typography

Production does not download a remote font and does not bundle or distribute font files.

```css
--ui-font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--ui-font-family-mono: ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
```

IBM Plex Sans remains a visual reference used by transformation prototypes, not a runtime dependency. The system stack is the production contract until a separate approved task justifies a font-loading change with licensing, privacy, performance, offline, and fallback evidence.

Use the UI stack for product copy and controls. Use the mono stack only for analytical numerics and notation such as evaluations, ratings, percentages, move counts, coordinates, hashes, PGN, and FEN.

## Production token roles

### Canvas and surfaces

| Token | Value | Role |
| --- | --- | --- |
| `--ui-canvas` | `#E7EEEA` | default transformed signed-in canvas |
| `--ui-canvas-soft` | `#EEF4F1` | restrained canvas tint or gradient start |
| `--ui-surface` | `#FFFFFF` | important cards, controls, and primary panels |
| `--ui-surface-muted` | `#F2F6F4` | secondary containers and grouped controls |
| `--ui-surface-quiet` | `#EAF1ED` | loading, disabled, quiet, or nested tonal areas |
| `--ui-surface-overlay` | `rgba(255, 255, 255, 0.97)` | menus, dialogs, and overlays |

### Graphite and text

| Token | Value | Role |
| --- | --- | --- |
| `--ui-chrome` | `#172321` | primary dark product chrome |
| `--ui-chrome-raised` | `#22312E` | secondary dark surfaces |
| `--ui-chrome-soft` | `#2A3D38` | raised or softer graphite emphasis |
| `--ui-text` | `#172321` | primary light-surface text |
| `--ui-text-muted` | `#63716D` | supporting copy and labels |
| `--ui-text-subtle` | `#73807C` | tertiary metadata |
| `--ui-text-inverse` | `#F4F8F6` | text on graphite chrome |

### Structure and elevation

| Token | Value | Role |
| --- | --- | --- |
| `--ui-border` | `#C4D1CB` | normal structural border |
| `--ui-border-strong` | `#AEBFB7` | hover, selected, or stronger separation |
| `--ui-radius-control` | `10px` | buttons, inputs, compact controls |
| `--ui-radius-panel` | `16px` | panels and page headers |
| `--ui-radius-large` | `20px` | major compositions and overlays |
| `--ui-shadow-soft` | low graphite shadow | normal important surface |
| `--ui-shadow-raised` | medium graphite shadow | hover or raised surface |
| `--ui-shadow-overlay` | strong graphite shadow | menus, dialogs, overlays |

Use tonal separation and borders before elevation. Strong shadows belong primarily to overlays and dominant actions.

### Interaction and focus

| Token | Value | Role |
| --- | --- | --- |
| `--ui-action` | `#47B89C` | primary action and product signal |
| `--ui-action-hover` | `#3CA98E` | primary-action hover |
| `--ui-action-strong` | `#1F7865` | accessible mint text and selected state |
| `--ui-action-soft` | `#DFF3ED` | selected and quiet interactive background |
| `--ui-action-ink` | `#071713` | text on signal mint |
| `--ui-focus-outline` | `#1F7865` | opaque keyboard-focus outline across supported surfaces |
| `--ui-focus-ring` | strong-mint alpha | supplementary focus halo, not a standalone outline colour |

Mint is a product signal and interaction colour. It must not replace success, warning, danger, information, chess evaluation, or chart-series semantics.

### Semantic status colours

| Token | Value | Soft token | Role |
| --- | --- | --- | --- |
| `--ui-success` | `#256B45` | `--ui-success-soft` | completed, healthy, positive status |
| `--ui-warning` | `#8A4B0F` | `--ui-warning-soft` | attention, incomplete, or risky status |
| `--ui-danger` | `#A7352A` | `--ui-danger-soft` | destructive action or error |
| `--ui-info` | `#2B6480` | `--ui-info-soft` | neutral information or processing state |

Do not infer status from colour alone. Preserve text, icons, labels, and accessible state semantics.

## Proven shared primitive roles

The shared page header, panel, shell actions, context strip, fact grid, select menu, and state message consume production roles directly.

- `app-context-strip` renders typed, read-only label/value context without deriving feature state.
- `app-fact-grid` renders typed semantic facts; owning features retain status, formatting, eligibility, and command logic.
- `app-select-menu` owns controlled single-choice trigger, overlay, selection, and keyboard presentation; consuming features own option meaning and state transitions.
- `app-state-message` owns the generic loading/empty/error presentation contract; loading uses polite status semantics, errors use assertive alert semantics, and feature/domain notices remain feature-owned.
- Shared primitives remain OnPush, router-free, store-free, HTTP-free, and feature-agnostic.
- Feature-specific semantic data colours and responsive workflow composition remain with the owning feature.

## Route-family completion and compatibility boundary

VT-301 dispositioned every authenticated route family that existed at its completion checkpoint. Later protected routes are reviewed against the same production contract rather than retroactively rewriting the historical VT-301 inventory.

VT-302 has resolved the previously recorded visual-semantic compatibility boundary in `apps/web/src/workbench.css` and the remaining Repertoire Builder workbench/setup/explanation surfaces. Those files now use production `--ui-*` visual roles, and architecture guardrails prevent reintroduction of the bounded legacy semantic names.

VT-302 first removed the non-Study `.library-*` consumers from Lines, then completed the consumer proof for the remaining global `.library-*` block. Current Study presentation is feature-local under `study-*`; runtime searches found no remaining `.library-*` presentation consumer, so the obsolete global block was removed. Architecture guardrails now reject the retired `.library-*` namespace in global styles and Angular HTML/CSS rather than preserving a special Library compatibility exception.

VT-302 also resolves the bounded Home-local visual-token namespace. `home-page.component.css` and the Today Activity child stylesheet consume the existing production `--ui-*` canvas, surface, graphite, text, border, action, focus and elevation roles directly, and architecture guardrails reject `--home-*` in Home HTML/CSS. The colour, surface and border aliases map exactly to the production values. The former Home soft/raised shadow aliases were slightly lighter (`0.045`/`0.085` alpha) than `--ui-shadow-soft`/`--ui-shadow-raised` (`0.055`/`0.09`); using the production roles is a deliberate restrained elevation normalization rather than an exact pixel-value preservation claim. Direct authenticated browser evidence for that small visual delta remains unobserved unless separately recorded.

Accepted compatibility boundaries that remain:

- `styles.css` still owns legacy short visual roles required by other known compatibility consumers and the established `--space-*` scale; resolving workbench, training, Home, and Library presentation debt does not authorize global deletion or redefinition of that layer.
- Feature-local semantic chart, board, and evaluation colours may remain when they do not represent a shared UI role.

These boundaries are recorded debt, not permission for new code to use legacy visual names and not evidence of an untransformed route family.

## Migration rules

- New transformed UI uses `--ui-*` visual roles.
- Do not add isolated hard-coded brand colours when a production role expresses the meaning.
- Do not globally search-and-replace legacy names or redefine their values.
- Migrate a shared compatibility layer only after its complete consumer set is inspected and regression-covered.
- A token contract change is cross-application architecture work and requires transformation documentation, representative browser evidence, and normal frontend validation.
- VT-302 may clean up accepted compatibility debt only where its complete consumer boundary is proven; it must not reopen completed page-family rollout by default.

## Accessibility baseline

- Keyboard focus remains visible with at least a three-pixel outline or equivalent clearly visible treatment.
- Normal text and control states retain readable contrast on their assigned surface.
- Hover is not the only indicator of interactivity.
- Reduced-motion users do not depend on elevation or translation animation to perceive state.
- Status and evaluation meanings use non-colour cues.
