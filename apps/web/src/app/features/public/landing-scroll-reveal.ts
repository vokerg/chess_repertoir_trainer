const REVEAL_SELECTOR = '[data-scroll-reveal]';
const MAX_STAGGER_DELAY_MS = 240;
const REVEAL_DURATION_MS = 420;
const REVEAL_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

interface LandingRevealEnvironment {
  IntersectionObserver?: typeof IntersectionObserver;
  matchMedia?: (query: string) => MediaQueryList;
}

export function setupLandingScrollReveal(
  root: ParentNode,
  environment: LandingRevealEnvironment,
): () => void {
  const IntersectionObserverConstructor = environment.IntersectionObserver;
  const matchMedia = environment.matchMedia;

  if (typeof IntersectionObserverConstructor !== 'function' || typeof matchMedia !== 'function') {
    return () => undefined;
  }

  const reducedMotionQuery = matchMedia(REDUCED_MOTION_QUERY);
  if (reducedMotionQuery.matches) return () => undefined;

  const pendingElements = new Set(
    Array.from(root.querySelectorAll<HTMLElement>(REVEAL_SELECTOR)),
  );
  if (pendingElements.size === 0) return () => undefined;

  let observer: IntersectionObserver | undefined;
  let cleanedUp = false;

  const removePendingStyles = (element: HTMLElement, skipTransition: boolean): void => {
    if (skipTransition) element.style.transition = 'none';
    element.style.opacity = '1';
    element.style.transform = 'translate3d(0, 0, 0)';
    observer?.unobserve(element);
    pendingElements.delete(element);
  };

  const cleanup = (): void => {
    if (cleanedUp) return;
    cleanedUp = true;
    observer?.disconnect();
    observer = undefined;
    reducedMotionQuery.removeEventListener('change', handleReducedMotionChange);
  };

  const revealElement = (element: HTMLElement, skipTransition: boolean): void => {
    removePendingStyles(element, skipTransition);
    if (pendingElements.size === 0) cleanup();
  };

  const handleReducedMotionChange = (event: MediaQueryListEvent): void => {
    if (!event.matches) return;
    for (const element of Array.from(pendingElements)) {
      removePendingStyles(element, true);
    }
    cleanup();
  };

  for (const element of pendingElements) {
    const requestedDelay = Number(element.dataset['revealDelay'] ?? 0);
    const delayMs = Number.isFinite(requestedDelay)
      ? Math.min(Math.max(requestedDelay, 0), MAX_STAGGER_DELAY_MS)
      : 0;

    element.style.opacity = '0';
    element.style.transform = 'translate3d(0, 18px, 0)';
    element.style.transition = [
      `opacity ${REVEAL_DURATION_MS}ms ${REVEAL_EASING} ${delayMs}ms`,
      `transform ${REVEAL_DURATION_MS}ms ${REVEAL_EASING} ${delayMs}ms`,
    ].join(', ');
  }

  observer = new IntersectionObserverConstructor(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.target instanceof HTMLElement) {
          revealElement(entry.target, false);
        }
      }
    },
    {
      rootMargin: '0px 0px -8% 0px',
      threshold: 0.12,
    },
  );

  for (const element of pendingElements) observer.observe(element);
  reducedMotionQuery.addEventListener('change', handleReducedMotionChange);

  return cleanup;
}
