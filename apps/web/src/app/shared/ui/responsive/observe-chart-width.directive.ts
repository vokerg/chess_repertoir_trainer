import { DestroyRef, Directive, ElementRef, NgZone, inject, output } from '@angular/core';

@Directive({
  selector: '[appObserveChartWidth]',
  standalone: true,
})
export class ObserveChartWidthDirective {
  readonly chartWidthChange = output<number>();

  constructor() {
    const element = inject(ElementRef<Element>);
    const zone = inject(NgZone);
    const destroy = inject(DestroyRef);
    if (typeof ResizeObserver === 'undefined') return;

    let previousWidth = 0;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.floor(entry.contentRect.width);
      if (width <= 0 || width === previousWidth) return;
      previousWidth = width;
      zone.run(() => this.chartWidthChange.emit(width));
    });
    observer.observe(element.nativeElement);
    destroy.onDestroy(() => observer.disconnect());
  }
}
