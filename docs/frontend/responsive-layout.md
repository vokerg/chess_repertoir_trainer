# Responsive layout

Shared viewport names are defined in `apps/web/src/app/shared/ui/responsive/breakpoints.ts`.

```text
compactMaxPx: 640
mobileMaxPx: 760
workbenchSingleColumnMaxPx: 980
```

Feature-specific breakpoints stay inside their owning feature. For example, `/library` owns `studyLineActionsMaxPx` and `studyBasketWrapMaxPx` in `apps/web/src/app/features/library/library-breakpoints.ts`.

CSS media query thresholds must use numeric values because plain CSS cannot use custom properties in media query declarations. Add a nearby comment such as `Keep in sync with VIEWPORT_BREAKPOINTS.mobileMaxPx` or `Keep in sync with LIBRARY_BREAKPOINTS.studyBasketWrapMaxPx` when a stylesheet uses one of these thresholds.

`apps/web/src/responsive.css` provides shared `.mobile-only`, `.desktop-only`, and compact alignment utilities. Prefer these for simple mobile/desktop visibility instead of repeating feature-local show/hide rules. Feature-specific layout changes still belong with the owning component stylesheet.

## Library Study Launcher

Desktop `/library` keeps the study planner columns and the right-side training basket. The basket remains the desktop place to choose course, section, or selected-line marathon training.

Mobile `/library` shows the course chooser only. Selecting a course opens a full-screen bottom-sheet launcher. The launcher is presentational: it receives selected course/chapter/line summaries and emits chapter selection, line selection, and start-training intents. The route page wires those intents to `LibraryBrowserStore`.

The mobile launcher supports:

- Course training with All, Weak, and Untrained modes.
- Section training with All, Weak, and Untrained modes after choosing a section.
- Single-line marathon training with All, Weak, and Untrained modes through the selected-lines marathon route.

Weak and Untrained actions are disabled when the selected scope has zero matching active sublines. All is enabled only when the selected scope can start and has active sublines.
