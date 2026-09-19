export const VIEWPORT_BREAKPOINTS = {
  compactMaxPx: 640,
  mobileMaxPx: 760,
  workbenchSingleColumnMaxPx: 980,
  builderCockpitTwoColumnMaxPx: 1420,
} as const;

export const MEDIA_QUERIES = {
  compact: `(max-width: ${VIEWPORT_BREAKPOINTS.compactMaxPx}px)`,
  mobile: `(max-width: ${VIEWPORT_BREAKPOINTS.mobileMaxPx}px)`,
  workbenchSingleColumn: `(max-width: ${VIEWPORT_BREAKPOINTS.workbenchSingleColumnMaxPx}px)`,
  builderCockpitTwoColumn: `(max-width: ${VIEWPORT_BREAKPOINTS.builderCockpitTwoColumnMaxPx}px)`,
} as const;
