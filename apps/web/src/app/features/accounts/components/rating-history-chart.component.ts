import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { AccountRatingHistoryResponse, RatingRangeKey, RatingSpeed } from '../data-access/accounts.models';
import { RATING_RANGE_OPTIONS } from '../helpers/rating-history-ranges';
import {
  TooltipData,
  computeXDomain,
  computeYDomain,
  findNearestDate,
  formatTooltipRows,
  normalizeVisiblePoints,
  parseRatingDate,
} from './rating-history-chart-data';

interface ChartSeriesPath {
  key: RatingSpeed;
  label: string;
  path: string;
}

@Component({
  selector: 'app-rating-history-chart',
  standalone: true,
  imports: [NgClass],
  templateUrl: './rating-history-chart.component.html',
  styleUrl: './rating-history-chart.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RatingHistoryChartComponent {
  readonly history = input<AccountRatingHistoryResponse | null>(null);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly selectedRange = input<RatingRangeKey>('1Y');
  readonly selectedRangeChange = output<RatingRangeKey>();

  protected readonly rangeOptions = RATING_RANGE_OPTIONS;
  protected readonly width = 920;
  protected readonly height = 380;
  protected readonly margin = { top: 18, right: 22, bottom: 42, left: 54 };
  protected readonly viewBox = `0 0 ${this.width} ${this.height}`;
  protected readonly hoveredDate = signal<string | null>(null);

  protected readonly points = computed(() => normalizeVisiblePoints(this.history()));
  protected readonly xDomain = computed(() => computeXDomain(this.points()));
  protected readonly yDomain = computed(() => computeYDomain(this.history()));
  protected readonly hasPoints = computed(() => this.points().length > 0);
  protected readonly tooltip = computed<TooltipData | null>(() =>
    formatTooltipRows(this.history()?.series ?? [], this.hoveredDate()),
  );
  protected readonly crosshairX = computed(() => {
    const date = this.hoveredDate();
    const xDomain = this.xDomain();
    if (!date || !xDomain) return null;
    return this.xScale(parseRatingDate(date), xDomain);
  });
  protected readonly seriesPaths = computed<ChartSeriesPath[]>(() => {
    const history = this.history();
    const xDomain = this.xDomain();
    const yDomain = this.yDomain();
    if (!history || !xDomain || !yDomain) return [];

    return history.series
      .filter((series) => series.points.length > 0)
      .map((series) => ({
        key: series.key,
        label: series.label,
        path: this.buildPath(series.points, xDomain, yDomain),
      }));
  });
  protected readonly yTicks = computed(() => {
    const domain = this.yDomain();
    if (!domain) return [];
    const step = (domain.max - domain.min) / 4;
    return Array.from({ length: 5 }, (_, index) => Math.round(domain.min + step * index)).reverse();
  });
  protected readonly dateLabels = computed(() => {
    const domain = this.xDomain();
    if (!domain) return null;
    return {
      start: this.formatDate(new Date(domain.min).toISOString().slice(0, 10)),
      end: this.formatDate(new Date(domain.max).toISOString().slice(0, 10)),
    };
  });

  protected selectRange(range: RatingRangeKey): void {
    if (range !== this.selectedRange()) {
      this.hoveredDate.set(null);
      this.selectedRangeChange.emit(range);
    }
  }

  protected onPointerMove(event: PointerEvent): void {
    const xDomain = this.xDomain();
    const points = this.points();
    if (!xDomain || points.length === 0) return;

    const svg = event.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    const pointerX = ((event.clientX - rect.left) / rect.width) * this.width;
    const clampedX = Math.min(this.plotRight, Math.max(this.plotLeft, pointerX));
    const targetTime = xDomain.min + ((clampedX - this.plotLeft) / this.plotWidth) * (xDomain.max - xDomain.min);
    this.hoveredDate.set(findNearestDate(points, targetTime));
  }

  protected clearHover(): void {
    this.hoveredDate.set(null);
  }

  protected speedClass(speed: RatingSpeed): string {
    return `rating-speed-${speed}`;
  }

  protected formatDate(date: string): string {
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(
      new Date(`${date}T00:00:00Z`),
    );
  }

  protected get plotLeft(): number {
    return this.margin.left;
  }

  protected get plotRight(): number {
    return this.width - this.margin.right;
  }

  protected get plotTop(): number {
    return this.margin.top;
  }

  protected get plotBottom(): number {
    return this.height - this.margin.bottom;
  }

  protected get plotWidth(): number {
    return this.plotRight - this.plotLeft;
  }

  protected get plotHeight(): number {
    return this.plotBottom - this.plotTop;
  }

  protected yForTick(tick: number): number | null {
    const domain = this.yDomain();
    return domain ? this.yScale(tick, domain) : null;
  }

  protected tooltipLeft(): number {
    const x = this.crosshairX() ?? this.plotLeft;
    return Math.min(this.width - 210, Math.max(8, x + 12));
  }

  private buildPath(
    points: AccountRatingHistoryResponse['series'][number]['points'],
    xDomain: { min: number; max: number },
    yDomain: { min: number; max: number },
  ): string {
    return points
      .map((point, index) => {
        const x = this.xScale(parseRatingDate(point.date), xDomain);
        const y = this.yScale(point.rating, yDomain);
        return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
  }

  private xScale(value: number, domain: { min: number; max: number }): number {
    return this.plotLeft + ((value - domain.min) / (domain.max - domain.min)) * this.plotWidth;
  }

  private yScale(value: number, domain: { min: number; max: number }): number {
    return this.plotBottom - ((value - domain.min) / (domain.max - domain.min)) * this.plotHeight;
  }
}
