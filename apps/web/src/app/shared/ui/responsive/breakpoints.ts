export const VIEWPORT_BREAKPOINTS = {
  compactMaxPx: 640,
  mobileMaxPx: 760,
  workbenchSingleColumnMaxPx: 980,
} as const;

export const MEDIA_QUERIES = {
  compact: `(max-width: ${VIEWPORT_BREAKPOINTS.compactMaxPx}px)`,
  mobile: `(max-width: ${VIEWPORT_BREAKPOINTS.mobileMaxPx}px)`,
  workbenchSingleColumn: `(max-width: ${VIEWPORT_BREAKPOINTS.workbenchSingleColumnMaxPx}px)`,
} as const;
