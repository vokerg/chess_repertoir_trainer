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

## Mobile application navigation

Below `mobileMaxPx`, the authenticated shell uses a fixed five-slot mobile-primary navigation for Home, Study, Games, Openings, and More.

Responsive requirements:

- position the navigation above `env(safe-area-inset-bottom)`;
- reserve application-content clearance through `--app-mobile-primary-nav-clearance`;
- keep touch targets at least 54px high in the implemented composition;
- shorten labels through ellipsis rather than allowing the five-column bar to wrap;
- retain visible focus treatment and remove non-essential transitions under reduced motion;
- keep the complete route/account dialog within the dynamic viewport height and include bottom safe-area padding;
- keep secondary routes reachable through More without changing route ownership.

The global imported-game job panel is also fixed. On mobile, the app shell offsets it above the primary navigation instead of allowing the two fixed surfaces to overlap. Content padding with a visible job panel reserves both overlays.

Feature-owned mobile launchers and bottom sheets remain independent overlays. They must be reviewed with the primary navigation at compact and narrow-phone widths, but their workflow and store ownership do not move into the application navigation.

## Library Study Launcher

Desktop `/library` keeps the study planner columns and the right-side training basket. The basket remains the desktop place to choose course, section, or selected-line marathon training.

Mobile `/library` shows the course chooser only. Selecting a course opens a full-screen bottom-sheet launcher. The launcher is presentational: it receives selected course/chapter/line summaries and emits chapter selection, line selection, and start-training intents. The route page wires those intents to `LibraryBrowserStore`.

The mobile launcher supports:

- Course training with All, Weak, and Untrained modes.
- Section training with All, Weak, and Untrained modes after choosing a section.
- Single-line marathon training with All, Weak, and Untrained modes through the selected-lines marathon route.

Weak and Untrained actions are disabled when the selected scope has zero matching active sublines. All is enabled only when the selected scope can start and has active sublines.
