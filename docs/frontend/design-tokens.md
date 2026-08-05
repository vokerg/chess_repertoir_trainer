# Frontend design tokens

Last updated: 2026-08-05

This document is the source of truth for the production visual-token and typography contract used by transformed Angular surfaces.

## Ownership and loading order

Global styling remains intentionally split while compatibility debt exists:

1. `apps/web/src/styles.css` is the legacy compatibility layer. Short names such as `--accent`, `--surface`, `--border`, and `--text` continue to support known shared and legacy-compatible consumers.
2. `apps/web/src/design-system.css` loads immediately after `styles.css` and owns production `--ui-*` tokens plus narrow overrides for the application canvas, typography, controls, page headers, and proven shared primitives.
3. `responsive.css` and `workbench.css` remain later specialized layers.

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
| `--ui-action-strong` | `#1F7865` | accessible mint text, selected state, focus source |
| `--ui-action-soft` | `#DFF3ED` | selected and quiet interactive background |
| `--ui-action-ink` | `#071713` | text on signal mint |
| `--ui-focus-ring` | strong-mint alpha | visible keyboard focus |

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

The shared page header, panel, shell actions, context strip, fact grid, and select menu consume production roles directly.

- `app-context-strip` renders typed, read-only label/value context without deriving feature state.
- `app-fact-grid` renders typed semantic facts; owning features retain status, formatting, eligibility, and command logic.
- `app-select-menu` owns controlled single-choice trigger, overlay, selection, and keyboard presentation; consuming features own option meaning and state transitions.
- Shared primitives remain OnPush, router-free, store-free, HTTP-free, and feature-agnostic.
- Feature-specific semantic data colours and responsive workflow composition remain with the owning feature.

## Route-family completion and compatibility boundary

VT-301 has explicitly dispositioned every current authenticated route family. This does not mean every descendant widget has already abandoned all legacy roles.

Accepted compatibility boundaries:

- Home retains calibrated local `--home-*` aliases whose values match the approved production palette but predate the `--ui-*` namespace.
- `apps/web/src/workbench.css` and a bounded set of analytical consumers still use legacy short roles. Migrate the full consumer set together; do not partially remap global names.
- Some global `.library-*` presentation remains while shared line-training surfaces consume it.
- Feature-local semantic chart, board, and evaluation colours may remain when they do not represent a shared UI role.

These boundaries are recorded debt, not permission for new code to use legacy names and not evidence of an untransformed route family.

## Migration rules

- New transformed UI uses `--ui-*` roles.
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
