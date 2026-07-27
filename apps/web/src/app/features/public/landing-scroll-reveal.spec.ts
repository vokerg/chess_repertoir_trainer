import { setupLandingScrollReveal } from './landing-scroll-reveal';

describe('setupLandingScrollReveal', () => {
  let observerCallback!: IntersectionObserverCallback;
  let observerInstance!: IntersectionObserver;
  let observerOptions: IntersectionObserverInit | undefined;
  let reducedMotionListener: ((event: MediaQueryListEvent) => void) | undefined;
  let observe: jasmine.Spy;
  let unobserve: jasmine.Spy;
  let disconnect: jasmine.Spy;
  let removeReducedMotionListener: jasmine.Spy;

  beforeEach(() => {
    observe = jasmine.createSpy('observe');
    unobserve = jasmine.createSpy('unobserve');
    disconnect = jasmine.createSpy('disconnect');
    removeReducedMotionListener = jasmine.createSpy('removeEventListener');
    reducedMotionListener = undefined;
    observerOptions = undefined;
  });

  it('reveals an observed element once it enters the viewport', () => {
    const { root, element } = createRevealRoot('80');
    const cleanup = setupLandingScrollReveal(root, createEnvironment(false));

    expect(element.style.opacity).toBe('0');
    expect(element.style.transform).toBe('translate3d(0, 18px, 0)');
    expect(element.style.transition).toContain('80ms');
    expect(observerOptions).toEqual({ rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    expect(observe).toHaveBeenCalledOnceWith(element);

    observerCallback(
      [{ target: element, isIntersecting: true } as IntersectionObserverEntry],
      observerInstance,
    );

    expect(element.style.opacity).toBe('1');
    expect(element.style.transform).toBe('translate3d(0, 0, 0)');
    expect(unobserve).toHaveBeenCalledOnceWith(element);
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(removeReducedMotionListener).toHaveBeenCalled();

    cleanup();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('keeps content visible when IntersectionObserver is unavailable', () => {
    const { root, element } = createRevealRoot();
    setupLandingScrollReveal(root, { matchMedia: () => createMediaQueryList(false) });
    expectContentToRemainVisible(element);
  });

  it('keeps content visible when matchMedia is unavailable', () => {
    const { root, element } = createRevealRoot();
    setupLandingScrollReveal(root, { IntersectionObserver: createObserverConstructor() });
    expectContentToRemainVisible(element);
    expect(observe).not.toHaveBeenCalled();
  });

  it('keeps content visible and skips observation for reduced motion', () => {
    const { root, element } = createRevealRoot();
    setupLandingScrollReveal(root, createEnvironment(true));
    expectContentToRemainVisible(element);
    expect(observe).not.toHaveBeenCalled();
  });

  it('removes pending motion when reduced motion becomes active', () => {
    const { root, element } = createRevealRoot();
    setupLandingScrollReveal(root, createEnvironment(false));

    reducedMotionListener?.({ matches: true } as MediaQueryListEvent);

    expect(element.style.transition).toBe('none');
    expect(element.style.opacity).toBe('1');
    expect(element.style.transform).toBe('translate3d(0, 0, 0)');
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  function createEnvironment(reducedMotion: boolean): {
    IntersectionObserver: typeof IntersectionObserver;
    matchMedia: (query: string) => MediaQueryList;
  } {
    return {
      IntersectionObserver: createObserverConstructor(),
      matchMedia: () => createMediaQueryList(reducedMotion),
    };
  }

  function createObserverConstructor(): typeof IntersectionObserver {
    return class MockIntersectionObserver {
      readonly root = null;
      readonly rootMargin = '0px 0px -8% 0px';
      readonly thresholds = [0.12];
      readonly observe = observe;
      readonly unobserve = unobserve;
      readonly disconnect = disconnect;
      readonly takeRecords = (): IntersectionObserverEntry[] => [];

      constructor(callback: IntersectionObserverCallback, init?: IntersectionObserverInit) {
        observerCallback = callback;
        observerOptions = init;
        observerInstance = this as unknown as IntersectionObserver;
      }
    } as unknown as typeof IntersectionObserver;
  }

  function createMediaQueryList(matches: boolean): MediaQueryList {
    return {
      matches,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => {
        if (type === 'change' && typeof listener === 'function') {
          reducedMotionListener = (event) => listener(event);
        }
      },
      removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) => {
        removeReducedMotionListener(type, listener);
      },
      dispatchEvent: () => true,
    } as unknown as MediaQueryList;
  }

  function createRevealRoot(delay?: string): { root: HTMLDivElement; element: HTMLDivElement } {
    const root = document.createElement('div');
    const element = document.createElement('div');
    element.dataset['scrollReveal'] = '';
    if (delay) element.dataset['revealDelay'] = delay;
    root.append(element);
    return { root, element };
  }

  function expectContentToRemainVisible(element: HTMLElement): void {
    expect(element.style.opacity).toBe('');
    expect(element.style.transform).toBe('');
  }
});
