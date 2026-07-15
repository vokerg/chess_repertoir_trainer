import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
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

  protected keepMouseTooltipTransient(event: PointerEvent): void {
    if (event.pointerType === 'mouse') event.preventDefault();
  }
}
