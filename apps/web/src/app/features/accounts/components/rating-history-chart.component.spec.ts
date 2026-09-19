import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { AccountRatingHistoryResponse } from '../data-access/accounts.models';
import { RatingHistoryChartComponent } from './rating-history-chart.component';

describe('RatingHistoryChartComponent', () => {
  let fixture: ComponentFixture<RatingHistoryChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RatingHistoryChartComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RatingHistoryChartComponent);
    fixture.componentRef.setInput('history', ratingHistory());
    fixture.detectChanges();
  });

  it('summarizes the latest rating and change for each visible series', () => {
    const legendItems = Array.from(
      fixture.nativeElement.querySelectorAll('.legend-item'),
    ) as HTMLElement[];

    expect(legendItems[0].textContent).toContain('Blitz');
    expect(legendItems[0].textContent).toContain('1540');
    expect(legendItems[0].textContent).toContain('+40');
    expect(legendItems[1].textContent).toContain('Rapid');
    expect(legendItems[1].textContent).toContain('1672');
    expect(legendItems[1].textContent).toContain('-8');
  });

  it('supports keyboard inspection without placing every data point in the tab order', () => {
    const graph = fixture.nativeElement.querySelector('svg.rating-svg') as SVGElement;
    graph.dispatchEvent(new FocusEvent('focus'));
    fixture.detectChanges();

    expect(graph.getAttribute('tabindex')).toBe('0');
    expect(fixture.nativeElement.querySelector('.tooltip')?.textContent).toContain('1540');

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowLeft',
      bubbles: true,
      cancelable: true,
    });
    graph.dispatchEvent(event);
    fixture.detectChanges();

    expect(event.defaultPrevented).toBeTrue();
    expect(fixture.nativeElement.querySelector('.tooltip')?.textContent).toContain('1520');
  });
});

function ratingHistory(): AccountRatingHistoryResponse {
  return {
    account: { id: 7, provider: 'LICHESS', username: 'local-user', displayName: null },
    bucket: 'day',
    aggregation: 'max',
    ratingSource: 'gameRecordedRating',
    series: [
      {
        key: 'blitz',
        label: 'Blitz',
        points: [
          { date: '2026-08-01', rating: 1500, gameCount: 2, ratingAt: '2026-08-01T12:00:00Z' },
          { date: '2026-08-02', rating: 1520, gameCount: 1, ratingAt: '2026-08-02T12:00:00Z' },
          { date: '2026-08-03', rating: 1540, gameCount: 3, ratingAt: '2026-08-03T12:00:00Z' },
        ],
      },
      {
        key: 'rapid',
        label: 'Rapid',
        points: [
          { date: '2026-08-01', rating: 1680, gameCount: 1, ratingAt: '2026-08-01T14:00:00Z' },
          { date: '2026-08-02', rating: 1672, gameCount: 2, ratingAt: '2026-08-02T14:00:00Z' },
        ],
      },
    ],
    yDomain: { min: 1480, max: 1700 },
  };
}
