# Phase 1C — identity and home prototype (Sol direction 03)

This is a visual prototype for the next identity pass on Chess Repertoire Trainer.
It treats the application as an analytical chess instrument: a new Decision Grid
logo candidate, one consistent icon family, real repertoire data as visual material,
and fewer generic dashboard cards.

Open `index.html` in a browser. The prototype includes three switchable visual
directions plus expanded/collapsed rail, an open Study group, and a compact desktop state.

## Comparison directions

| Direction    | Visual character                                                                    | Best fit                                                               |
| ------------ | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Instrument   | Balanced dark/light composition with one dominant session board                     | The strongest general-purpose product direction and current default    |
| Opening Book | More spacious and editorial, with a light session surface and dark analytical inset | A calmer premium feel that gives copy and repertoire context more room |
| Control Room | Denser rail and page rhythm with a larger data readout                              | Frequent users who value scan speed and visible evidence               |

The palette, native font stack, Decision Grid mark, route structure, icon family,
and interactions are intentionally fixed. This makes the selector a comparison of
density, hierarchy, and surface balance rather than three unrelated brands.

## Design boundary

- Keep the existing route model, active-prefix behavior, and account controls.
- Keep the `Chess Repertoire` / `TRAINER` live-text wordmark while testing a new mark.
- Reopen the Node Branch decision only inside this prototype; production assets stay untouched.
- Use a new Decision Grid mark: a nine-cell board with an asymmetric branching selection.
- Use one purpose-built SVG icon family for parent and child destinations: a 24px optical grid,
  rounded 1.75px strokes, and one signal node per glyph. Every child destination has its own
  metaphor; unexplained route codes and overloaded generic icons are removed.
- Mirror every grouped production destination: Study, Openings, Progress, Tools, and Settings,
  including all thirteen child links and their own icons.
- Let Home lead with one repertoire session containing real moves, branches, and
  mastery evidence rather than decorative dashboard chrome.
- Carry the same tokens into future pages while varying composition: dark session
  board, white attention list, graphite evidence panel, and quiet launcher strip.

## Project styling contract used

- Native UI font stack: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
- Monospace only for moves, evaluations, percentages, and analytical counts.
- Production `--ui-*` values from `docs/frontend/design-tokens.md`.
- Graphite chrome, light analytical workspaces, and mint limited to interaction and signal.
- Restrained elevation; borders and tonal surfaces provide most structure.
