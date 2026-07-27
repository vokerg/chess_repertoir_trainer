import { isPlatformBrowser } from '@angular/common';
import {
  Directive,
  ElementRef,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  Renderer2,
  inject,
  input,
  numberAttribute,
} from '@angular/core';

const REVEAL_PENDING_CLASS = 'landing-reveal-pending';
const REVEAL_VISIBLE_CLASS = 'landing-reveal-visible';
const MAX_STAGGER_DELAY_MS = 240;
const REVEAL_DURATION_MS = 420;
const REVEAL_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

@Directive({
  selector: '[appRevealOnScroll]',
  standalone: true,
})
export class RevealOnScrollDirective implements OnInit, OnDestroy {
  readonly delayMs = input(0, {
    alias: 'appRevealOnScroll',
    transform: numberAttribute,
  });

  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);
  private readonly platformId = inject(PLATFORM_ID);
  private observer?: IntersectionObserver;
  private reducedMotionQuery?: MediaQueryList;

  private readonly handleReducedMotionChange = (event: MediaQueryListEvent): void => {
    if (event.matches) this.reveal(true);
  };

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const element = this.elementRef.nativeElement;
    const browserWindow = element.ownerDocument.defaultView;
    const IntersectionObserverConstructor = browserWindow?.IntersectionObserver;

    if (!browserWindow || typeof IntersectionObserverConstructor !== 'function') return;
    if (typeof browserWindow.matchMedia !== 'function') return;

    this.reducedMotionQuery = browserWindow.matchMedia(REDUCED_MOTION_QUERY);
    if (this.reducedMotionQuery.matches) {
      this.reducedMotionQuery = undefined;
      return;
    }

    const delayMs = Math.min(Math.max(this.delayMs(), 0), MAX_STAGGER_DELAY_MS);
    const transition = [
      `opacity ${REVEAL_DURATION_MS}ms ${REVEAL_EASING} ${delayMs}ms`,
      `transform ${REVEAL_DURATION_MS}ms ${REVEAL_EASING} ${delayMs}ms`,
    ].join(', ');

    this.renderer.setStyle(element, 'opacity', '0');
    this.renderer.setStyle(element, 'transform', 'translate3d(0, 18px, 0)');
    this.renderer.setStyle(element, 'transition', transition);
    this.renderer.addClass(element, REVEAL_PENDING_CLASS);
    this.reducedMotionQuery.addEventListener('change', this.handleReducedMotionChange);

    this.observer = new IntersectionObserverConstructor(
      (entries) => {
        if (entries.some((entry) => entry.target === element && entry.isIntersecting)) {
          this.reveal(false);
        }
      },
      {
        rootMargin: '0px 0px -8% 0px',
        threshold: 0.12,
      },
    );
    this.observer.observe(element);
  }

  ngOnDestroy(): void {
    this.disconnectObserver();
    this.removeReducedMotionListener();
  }

  private reveal(skipTransition: boolean): void {
    const element = this.elementRef.nativeElement;

    if (skipTransition) {
      this.renderer.setStyle(element, 'transition', 'none');
    }

    this.renderer.addClass(element, REVEAL_VISIBLE_CLASS);
    this.renderer.setStyle(element, 'opacity', '1');
    this.renderer.setStyle(element, 'transform', 'translate3d(0, 0, 0)');
    this.disconnectObserver(element);
    this.removeReducedMotionListener();
  }

  private disconnectObserver(element?: HTMLElement): void {
    if (element) this.observer?.unobserve(element);
    this.observer?.disconnect();
    this.observer = undefined;
  }

  private removeReducedMotionListener(): void {
    this.reducedMotionQuery?.removeEventListener('change', this.handleReducedMotionChange);
    this.reducedMotionQuery = undefined;
  }
}
