import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  viewChild,
} from '@angular/core';
import { OpeningStruggleItem } from '../data-access/opening-struggles.models';
import {
  courseCoverageLabel,
  courseCoverageStatusLabel,
} from '../helpers/opening-struggles-labels';

@Component({
  selector: 'app-opening-struggle-coverage',
  standalone: true,
  templateUrl: './opening-struggle-coverage.component.html',
  styleUrl: './opening-struggle-coverage.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpeningStruggleCoverageComponent {
  readonly item = input.required<OpeningStruggleItem>();
  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  private readonly popover = viewChild<ElementRef<HTMLElement>>('popover');

  protected readonly explanation = computed(() => courseCoverageLabel(this.item()));
  protected readonly statusLabel = computed(() => courseCoverageStatusLabel(this.item()));
  protected readonly ariaLabel = computed(() => `Course coverage: ${this.statusLabel()}. ${this.explanation()}`);
  protected readonly tooltipId = computed(() =>
    `course-coverage-${this.item().key.replace(/[^a-zA-Z0-9_-]/g, '-')}`,
  );
  protected readonly icon = computed(() => {
    const icons = {
      COVERED: '✓',
      MY_DEVIATION: '↗',
      OPPONENT_UNCOVERED: '?',
      REPERTOIRE_ENDED: '■',
      NOT_COVERED: '○',
    } as const;
    return icons[this.item().courseCoverage.status];
  });

  protected showMousePopover(event: PointerEvent): void {
    if (event.pointerType !== 'mouse') return;
    const popover = this.popover()?.nativeElement;
    if (!popover || typeof popover.showPopover !== 'function') return;
    if (!popover.matches(':popover-open')) popover.showPopover();
    queueMicrotask(() => this.positionPopover());
  }

  protected hideMousePopover(event: PointerEvent): void {
    if (event.pointerType !== 'mouse') return;
    const trigger = this.trigger()?.nativeElement;
    const popover = this.popover()?.nativeElement;
    if (!popover || typeof popover.hidePopover !== 'function') return;
    if (document.activeElement !== trigger && popover.matches(':popover-open')) {
      popover.hidePopover();
    }
  }

  protected positionPopover(): void {
    const trigger = this.trigger()?.nativeElement;
    const popover = this.popover()?.nativeElement;
    if (!trigger || !popover || !popover.matches(':popover-open')) return;

    const viewportPadding = 12;
    const gap = 8;
    const triggerRect = trigger.getBoundingClientRect();
    const width = Math.min(304, window.innerWidth - viewportPadding * 2);
    popover.style.width = `${width}px`;

    const height = popover.offsetHeight;
    const left = Math.min(
      Math.max(viewportPadding, triggerRect.left),
      Math.max(viewportPadding, window.innerWidth - width - viewportPadding),
    );
    const below = triggerRect.bottom + gap;
    const top = below + height <= window.innerHeight - viewportPadding
      ? below
      : Math.max(viewportPadding, triggerRect.top - height - gap);

    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
  }
}
