import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RevealOnScrollDirective } from './reveal-on-scroll.directive';

@Component({
  standalone: true,
  imports: [RevealOnScrollDirective],
  template: '<div appRevealOnScroll data-reveal-delay="80">Reveal content</div>',
})
class RevealHostComponent {}

describe('RevealOnScrollDirective', () => {
  let fixture: ComponentFixture<RevealHostComponent>;
  let observerCallback!: IntersectionObserverCallback;
  let observerInstance!: IntersectionObserver;
  let observerOptions: IntersectionObserverInit | undefined;
  let reducedMotionListener: ((event: MediaQueryListEvent) => void) | undefined;
  let observe: jasmine.Spy;
  let unobserve: jasmine.Spy;
  let disconnect: jasmine.Spy;
  let observerConstructor: jasmine.Spy;
  let removeReducedMotionListener: jasmine.Spy;
  let originalIntersectionObserver: PropertyDescriptor | undefined;
  let originalMatchMedia: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalIntersectionObserver = Object.getOwnPropertyDescriptor(window, 'IntersectionObserver');
    originalMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');
    observe = jasmine.createSpy('observe');
    unobserve = jasmine.createSpy('unobserve');
    disconnect = jasmine.createSpy('disconnect');
    observerConstructor = jasmine.createSpy('IntersectionObserver');
    removeReducedMotionListener = jasmine.createSpy('removeEventListener');
    reducedMotionListener = undefined;
    observerOptions = undefined;
  });

  afterEach(() => {
    fixture?.destroy();
    TestBed.resetTestingModule();
    restoreWindowProperty('IntersectionObserver', originalIntersectionObserver);
    restoreWindowProperty('matchMedia', originalMatchMedia);
  });

  it('reveals an observed element once it enters the viewport', async () => {
    await renderDirective({ intersectionObserverSupported: true, matchMediaSupported: true, reducedMotion: false });
    const element = fixture.nativeElement.querySelector('div') as HTMLElement;

    expect(element.classList).toContain('landing-reveal-pending');
    expect(element.classList).not.toContain('landing-reveal-visible');
    expect(element.style.opacity).toBe('0');
    expect(element.style.transform).toBe('translate3d(0, 18px, 0)');
    expect(element.style.transition).toContain('80ms');
    expect(observerOptions).toEqual({ rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    expect(observe).toHaveBeenCalledOnceWith(element);

    observerCallback(
      [{ target: element, isIntersecting: true } as IntersectionObserverEntry],
      observerInstance,
    );
    fixture.detectChanges();

    expect(element.classList).toContain('landing-reveal-visible');
    expect(element.style.opacity).toBe('1');
    expect(element.style.transform).toBe('translate3d(0, 0, 0)');
    expect(unobserve).toHaveBeenCalledOnceWith(element);
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(removeReducedMotionListener).toHaveBeenCalled();
  });

  it('keeps content visible when IntersectionObserver is unavailable', async () => {
    await renderDirective({ intersectionObserverSupported: false, matchMediaSupported: true, reducedMotion: false });
    expectContentToRemainVisible();
  });

  it('keeps content visible when matchMedia is unavailable', async () => {
    await renderDirective({ intersectionObserverSupported: true, matchMediaSupported: false, reducedMotion: false });
    expectContentToRemainVisible();
    expect(observerConstructor).not.toHaveBeenCalled();
  });

  it('keeps content visible and skips observation for reduced motion', async () => {
    await renderDirective({ intersectionObserverSupported: true, matchMediaSupported: true, reducedMotion: true });
    expectContentToRemainVisible();
    expect(observerConstructor).not.toHaveBeenCalled();
  });

  it('removes pending motion when reduced motion becomes active', async () => {
    await renderDirective({ intersectionObserverSupported: true, matchMediaSupported: true, reducedMotion: false });
    const element = fixture.nativeElement.querySelector('div') as HTMLElement;

    reducedMotionListener?.({ matches: true } as MediaQueryListEvent);
    fixture.detectChanges();

    expect(element.classList).toContain('landing-reveal-visible');
    expect(element.style.transition).toBe('none');
    expect(element.style.opacity).toBe('1');
    expect(element.style.transform).toBe('translate3d(0, 0, 0)');
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  async function renderDirective(options: {
    intersectionObserverSupported: boolean;
    matchMediaSupported: boolean;
    reducedMotion: boolean;
  }): Promise<void> {
    class MockIntersectionObserver {
      readonly root = null;
      readonly rootMargin = '0px 0px -8% 0px';
      readonly thresholds = [0.12];
      readonly observe = observe;
      readonly unobserve = unobserve;
      readonly disconnect = disconnect;
      readonly takeRecords = (): IntersectionObserverEntry[] => [];

      constructor(callback: IntersectionObserverCallback, init?: IntersectionObserverInit) {
        observerConstructor(callback, init);
        observerCallback = callback;
        observerOptions = init;
        observerInstance = this as unknown as IntersectionObserver;
      }
    }

    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      writable: true,
      value: options.intersectionObserverSupported ? MockIntersectionObserver : undefined,
    });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: options.matchMediaSupported
        ? jasmine.createSpy('matchMedia').and.returnValue(createMediaQueryList(options.reducedMotion))
        : undefined,
    });

    await TestBed.configureTestingModule({ imports: [RevealHostComponent] }).compileComponents();
    fixture = TestBed.createComponent(RevealHostComponent);
    fixture.detectChanges();
  }

  function expectContentToRemainVisible(): void {
    const element = fixture.nativeElement.querySelector('div') as HTMLElement;
    expect(element.classList).not.toContain('landing-reveal-pending');
    expect(element.classList).not.toContain('landing-reveal-visible');
    expect(element.style.opacity).toBe('');
    expect(element.style.transform).toBe('');
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

  function restoreWindowProperty(
    property: 'IntersectionObserver' | 'matchMedia',
    descriptor: PropertyDescriptor | undefined,
  ): void {
    if (descriptor) {
      Object.defineProperty(window, property, descriptor);
    } else {
      delete (window as unknown as Record<string, unknown>)[property];
    }
  }
});
