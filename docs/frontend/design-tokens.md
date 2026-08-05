# Frontend design tokens

Last updated: 2026-07-29

This document is the source of truth for the production visual-token and typography contract used by transformed Angular surfaces.

## Ownership and loading order

Global styling is intentionally split during migration:

1. `apps/web/src/styles.css` remains the legacy compatibility layer. Existing short names such as `--accent`, `--surface`, `--border`, and `--text` continue to support pages that have not yet been migrated.
2. `apps/web/src/design-system.css` is loaded immediately after `styles.css` and owns the production `--ui-*` tokens plus narrow overrides for the application canvas, typography, controls, page headers, and proven shared primitives.
3. `responsive.css` and `workbench.css` remain later specialized layers.

Do not repurpose the legacy short token names to mean the new system. Migrate a feature deliberately to `--ui-*` tokens in its owning transformation task, then remove obsolete legacy usage only when all consumers are known.

## Typography

Production does not download a remote font and does not bundle or distribute font files.

```css
--ui-font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--ui-font-family-mono: ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
```

IBM Plex Sans remains the visual reference used by the transformation prototypes, but it is not a runtime dependency. The system stack is the production contract until a separate approved task justifies a self-hosted or externally loaded font with licensing, privacy, performance, offline, and fallback evidence.

Use the UI stack for product copy and controls. Use the mono stack only for analytical numerics such as evaluations, ratings, percentages, move counts, coordinates, hashes, and PGN/FEN output.

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

Use tonal separation and borders before adding elevation. Strong shadows belong primarily to overlays and dominant actions.

### Interaction and focus

| Token | Value | Role |
| --- | --- | --- |
| `--ui-action` | `#47B89C` | primary action and signal colour |
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

- `app-context-strip` uses `--ui-surface`, `--ui-border`, `--ui-radius-control`, `--ui-radius-panel`, text roles, mint marker roles, and `--ui-shadow-soft` for its segmented presentation.
- `app-fact-grid` uses muted or translucent surface roles, subtle labels, primary values, and the mono stack only when the owning feature marks a value as analytical.
- `app-select-menu` uses production control, overlay, focus, text, marker, action-soft, and semantic-status roles for compact single-choice filters without defining feature meaning.
- Shared primitives must not introduce feature colours or remap legacy short token names. Feature-specific semantic data colours remain with the owning component.
- Layout presentation inputs may alter columns or segmentation, but a token role retains the same meaning across consumers.

## Migration rules

- New transformed UI uses `--ui-*` tokens.
- Existing feature-local amber usage may remain until that feature's recorded migration issue.
- Global controls, shared `app-page-header`, `app-panel`, `app-context-strip`, `app-fact-grid`, `app-select-menu`, and shared shell actions use production tokens now.
- Games, Study, and Opening Analysis have completed their representative migrations; remaining routes and Labs migrate in their owning VT issues rather than through broad search-and-replace.
- Do not add isolated hard-coded brand colours when an existing production token expresses the role.
- Feature-specific semantic data colours may remain local when they do not represent a shared UI role.
- A token change is a cross-application contract change and requires transformation documentation, representative browser evidence, and normal frontend validation.

## Accessibility baseline

- Keyboard focus must remain visible with at least a three-pixel outline or an equivalent clearly visible treatment.
- Normal text and control states must retain readable contrast on their assigned surface.
- Hover must not be the only indicator of interactivity.
- Reduced-motion users must not depend on elevation or translation animation to perceive state.
- Status and evaluation meanings require non-colour cues.
