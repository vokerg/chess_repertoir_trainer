export const LIBRARY_BREAKPOINTS = {
  studyLineActionsMaxPx: 700,
  studyBasketWrapMaxPx: 1100,
} as const;

export const LIBRARY_MEDIA_QUERIES = {
  studyLineActions: `(max-width: ${LIBRARY_BREAKPOINTS.studyLineActionsMaxPx}px)`,
  studyBasketWrap: `(max-width: ${LIBRARY_BREAKPOINTS.studyBasketWrapMaxPx}px)`,
} as const;
