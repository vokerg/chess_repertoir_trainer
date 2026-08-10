import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import {
  AccountRatingHistoryResponse,
  RatingRangeKey,
  RatingSpeed,
  RatingSpeedFilter,
} from '../data-access/accounts.models';
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
  areaPath: string;
  latestRating: number;
  delta: number;
  endX: number;
  endY: number;
}

interface HighlightedRatingPoint {
  key: RatingSpeed;
  x: number;
  y: number;
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
  readonly selectedSpeed = input<RatingSpeedFilter>('all');
  readonly selectedRangeChange = output<RatingRangeKey>();
  readonly selectedSpeedChange = output<RatingSpeedFilter>();

  protected readonly rangeOptions = RATING_RANGE_OPTIONS;
  protected readonly speedOptions: readonly { key: RatingSpeedFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'bullet', label: 'Bullet' },
    { key: 'blitz', label: 'Blitz' },
    { key: 'rapid', label: 'Rapid' },
  ];
  protected readonly width = 920;
  protected readonly height = 380;
  protected readonly margin = { top: 18, right: 22, bottom: 42, left: 54 };
  protected readonly viewBox = `0 0 ${this.width} ${this.height}`;
  protected readonly plotBands = [0, 1, 2, 3] as const;
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
      .map((series) => {
        const sortedPoints = [...series.points].sort(
          (left, right) => parseRatingDate(left.date) - parseRatingDate(right.date),
        );
        const firstPoint = sortedPoints[0];
        const latestPoint = sortedPoints[sortedPoints.length - 1];
        const path = this.buildPath(sortedPoints, xDomain, yDomain);
        const endX = this.xScale(parseRatingDate(latestPoint.date), xDomain);
        const endY = this.yScale(latestPoint.rating, yDomain);

        return {
          key: series.key,
          label: series.label,
          path,
          areaPath: `${path} L ${endX.toFixed(2)} ${this.plotBottom} L ${this.xScale(
            parseRatingDate(firstPoint.date),
            xDomain,
          ).toFixed(2)} ${this.plotBottom} Z`,
          latestRating: latestPoint.rating,
          delta: latestPoint.rating - firstPoint.rating,
          endX,
          endY,
        };
      });
  });
  protected readonly highlightedPoints = computed<HighlightedRatingPoint[]>(() => {
    const date = this.hoveredDate();
    const history = this.history();
    const xDomain = this.xDomain();
    const yDomain = this.yDomain();
    if (!date || !history || !xDomain || !yDomain) return [];

    return history.series.flatMap((series) => {
      const point = series.points.find((candidate) => candidate.date === date);
      return point
        ? [
            {
              key: series.key,
              x: this.xScale(parseRatingDate(point.date), xDomain),
              y: this.yScale(point.rating, yDomain),
            },
          ]
        : [];
    });
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
      middle: this.formatDate(new Date((domain.min + domain.max) / 2).toISOString().slice(0, 10)),
      end: this.formatDate(new Date(domain.max).toISOString().slice(0, 10)),
    };
  });

  protected selectRange(range: RatingRangeKey): void {
    if (range !== this.selectedRange()) {
      this.hoveredDate.set(null);
      this.selectedRangeChange.emit(range);
    }
  }

  protected selectSpeed(speed: RatingSpeedFilter): void {
    if (speed !== this.selectedSpeed()) {
      this.hoveredDate.set(null);
      this.selectedSpeedChange.emit(speed);
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
    const targetTime =
      xDomain.min + ((clampedX - this.plotLeft) / this.plotWidth) * (xDomain.max - xDomain.min);
    this.hoveredDate.set(findNearestDate(points, targetTime));
  }

  protected clearHover(): void {
    this.hoveredDate.set(null);
  }

  protected onChartFocus(): void {
    if (this.hoveredDate()) return;
    this.hoveredDate.set(this.availableDates().at(-1) ?? null);
  }

  protected onChartKeydown(event: KeyboardEvent): void {
    const dates = this.availableDates();
    if (dates.length === 0) return;

    const currentIndex = Math.max(0, dates.indexOf(this.hoveredDate() ?? ''));
    let nextIndex: number;
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        nextIndex = Math.max(0, currentIndex - 1);
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        nextIndex = Math.min(dates.length - 1, currentIndex + 1);
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = dates.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    this.hoveredDate.set(dates[nextIndex]);
  }

  protected speedClass(speed: RatingSpeed): string {
    return `rating-speed-${speed}`;
  }

  protected formatDate(date: string): string {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(`${date}T00:00:00Z`));
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

  protected tooltipLeftPercent(): number {
    const x = this.crosshairX() ?? this.plotLeft;
    return Math.min(84, Math.max(16, (x / this.width) * 100));
  }

  protected deltaLabel(delta: number): string {
    if (delta === 0) return 'No change';
    return `${delta > 0 ? '+' : ''}${delta}`;
  }

  protected plotBandY(index: number): number {
    return this.plotTop + (this.plotHeight / this.plotBands.length) * index;
  }

  private availableDates(): string[] {
    return Array.from(new Set(this.points().map((point) => point.date))).sort(
      (left, right) => parseRatingDate(left) - parseRatingDate(right),
    );
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
