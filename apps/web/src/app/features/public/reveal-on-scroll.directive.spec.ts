import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RevealOnScrollDirective } from './reveal-on-scroll.directive';

@Component({
  standalone: true,
  imports: [RevealOnScrollDirective],
  template: '<div [appRevealOnScroll]="80">Reveal content</div>',
})
class RevealHostComponent {}

describe('RevealOnScrollDirective', () => {
  let fixture: ComponentFixture<RevealHostComponent>;
  let observerCallback: IntersectionObserverCallback;
  let observerInstance: IntersectionObserver;
  let observe: jasmine.Spy;
  let unobserve: jasmine.Spy;
  let disconnect: jasmine.Spy;
  let observerConstructor: jasmine.Spy;
  let originalIntersectionObserver: PropertyDescriptor | undefined;
  let originalMatchMedia: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalIntersectionObserver = Object.getOwnPropertyDescriptor(window, 'IntersectionObserver');
    originalMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');
    observe = jasmine.createSpy('observe');
    unobserve = jasmine.createSpy('unobserve');
    disconnect = jasmine.createSpy('disconnect');
  });

  afterEach(() => {
    fixture?.destroy();
    TestBed.resetTestingModule();
    restoreWindowProperty('IntersectionObserver', originalIntersectionObserver);
    restoreWindowProperty('matchMedia', originalMatchMedia);
  });

  it('reveals an observed element once it enters the viewport', async () => {
    await renderDirective({ intersectionObserverSupported: true, reducedMotion: false });
    const element = fixture.nativeElement.querySelector('div') as HTMLElement;

    expect(element.classList).toContain('landing-reveal-pending');
    expect(element.classList).not.toContain('landing-reveal-visible');
    expect(element.style.getPropertyValue('--landing-reveal-delay')).toBe('80ms');
    expect(observe).toHaveBeenCalledOnceWith(element);

    observerCallback(
      [{ target: element, isIntersecting: true } as IntersectionObserverEntry],
      observerInstance,
    );
    fixture.detectChanges();

    expect(element.classList).toContain('landing-reveal-visible');
    expect(unobserve).toHaveBeenCalledOnceWith(element);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('keeps content visible when IntersectionObserver is unavailable', async () => {
    await renderDirective({ intersectionObserverSupported: false, reducedMotion: false });
    const element = fixture.nativeElement.querySelector('div') as HTMLElement;

    expect(element.classList).not.toContain('landing-reveal-pending');
    expect(element.classList).not.toContain('landing-reveal-visible');
    expect(element.style.getPropertyValue('--landing-reveal-delay')).toBe('');
  });

  it('keeps content visible and skips observation for reduced motion', async () => {
    await renderDirective({ intersectionObserverSupported: true, reducedMotion: true });
    const element = fixture.nativeElement.querySelector('div') as HTMLElement;

    expect(element.classList).not.toContain('landing-reveal-pending');
    expect(observerConstructor).not.toHaveBeenCalled();
  });

  async function renderDirective(options: {
    intersectionObserverSupported: boolean;
    reducedMotion: boolean;
  }): Promise<void> {
    observerConstructor = jasmine
      .createSpy('IntersectionObserver')
      .and.callFake((callback: IntersectionObserverCallback) => {
        observerCallback = callback;
        observerInstance = {
          root: null,
          rootMargin: '0px 0px -8% 0px',
          thresholds: [0.12],
          observe,
          unobserve,
          disconnect,
          takeRecords: () => [],
        };
        return observerInstance;
      });

    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      writable: true,
      value: options.intersectionObserverSupported ? observerConstructor : undefined,
    });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: jasmine.createSpy('matchMedia').and.returnValue(createMediaQueryList(options.reducedMotion)),
    });

    await TestBed.configureTestingModule({ imports: [RevealHostComponent] }).compileComponents();
    fixture = TestBed.createComponent(RevealHostComponent);
    fixture.detectChanges();
  }

  function createMediaQueryList(matches: boolean): MediaQueryList {
    return {
      matches,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => true,
    };
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
