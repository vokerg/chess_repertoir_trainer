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

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const element = this.elementRef.nativeElement;
    const browserWindow = element.ownerDocument.defaultView;
    const IntersectionObserverConstructor = browserWindow?.IntersectionObserver;

    if (!browserWindow || typeof IntersectionObserverConstructor !== 'function') return;
    if (browserWindow.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const delayMs = Math.min(Math.max(this.delayMs(), 0), MAX_STAGGER_DELAY_MS);
    this.renderer.setStyle(element, '--landing-reveal-delay', `${delayMs}ms`);
    this.renderer.addClass(element, REVEAL_PENDING_CLASS);

    this.observer = new IntersectionObserverConstructor(
      (entries) => {
        if (entries.some((entry) => entry.target === element && entry.isIntersecting)) {
          this.reveal();
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
    this.observer?.disconnect();
    this.observer = undefined;
  }

  private reveal(): void {
    const element = this.elementRef.nativeElement;
    this.renderer.addClass(element, REVEAL_VISIBLE_CLASS);
    this.observer?.unobserve(element);
    this.observer?.disconnect();
    this.observer = undefined;
  }
}
