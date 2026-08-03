import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { PerformanceByRatingRow } from '@chess-trainer/contracts/lab';
import type { RatingNormalizationProfile } from '@chess-trainer/contracts/rating-normalization';
import { PerformanceByRatingExperimentComponent } from './performance-by-rating-experiment.component';
import {
  PerformanceByRatingStore,
  type PerformanceColumnPreset,
} from './state/performance-by-rating.store';

describe('PerformanceByRatingExperimentComponent', () => {
  let fixture: ComponentFixture<PerformanceByRatingExperimentComponent>;
  let store: jasmine.SpyObj<PerformanceByRatingStore>;
  const loading = signal(false);
  const loaded = signal(false);
  const error = signal<string | null>(null);
  const filteredItems = signal<PerformanceByRatingRow[]>([]);
  const normalizationProfile = signal<RatingNormalizationProfile | null>(null);
  const normalizationLoading = signal(false);
  const normalizationError = signal<string | null>(null);

  const sampleRow: PerformanceByRatingRow = {
    provider: 'LICHESS',
    speed: 'blitz',
    type: 'LICHESS_BLITZ',
    ratingFrom: 1200,
    ratingTo: 1299,
    games: 4,
    analysedGames: 2,
    accuracyGames: 2,
    wdl: { wins: 2, draws: 1, losses: 1 },
    whiteWdl: { wins: 1, draws: 1, losses: 0 },
    blackWdl: { wins: 1, draws: 0, losses: 1 },
    scorePercent: 62.5,
    openingSuccess: 1,
    openingTrouble: 1,
    wasWinningAndLost: 1,
    wasLosingAndWon: 0,
    flaggedInWinningPosition: 0,
    opponentFlaggedInWinningPosition: 1,
    slowBleedLosses: 1,
    slowBleedWins: 0,
    averageAccuracy: 87.25,
  };

  const sampleNormalizationProfile: RatingNormalizationProfile = {
    id: 'rating-reference',
    version: '2026-08',
    description: 'Test rating normalization reference.',
    baseline: 'LICHESS_BLITZ',
    pools: {
      CHESS_COM_BLITZ: poolMetadata('Chess.com Blitz'),
      CHESS_COM_BULLET: poolMetadata('Chess.com Bullet'),
      CHESS_COM_RAPID: poolMetadata('Chess.com Rapid'),
      LICHESS_BLITZ: poolMetadata('Lichess Blitz'),
      LICHESS_BULLET: poolMetadata('Lichess Bullet'),
      LICHESS_RAPID: poolMetadata('Lichess Rapid'),
      FIDE_STANDARD: poolMetadata('FIDE Standard', true),
    },
    sources: [{ id: 'test-source', label: 'Test source', role: 'EMPIRICAL' }],
    grades: [
      {
        id: 'all',
        label: 'All ratings',
        order: 0,
        ranges: {
          CHESS_COM_BLITZ: openRange(),
          CHESS_COM_BULLET: openRange(),
          CHESS_COM_RAPID: openRange(),
          LICHESS_BLITZ: openRange(),
          LICHESS_BULLET: openRange(),
          LICHESS_RAPID: openRange(),
          FIDE_STANDARD: openRange(),
        },
      },
    ],
  };

  beforeEach(async () => {
    loading.set(false);
    loaded.set(false);
    error.set(null);
    filteredItems.set([]);
    normalizationProfile.set(null);
    normalizationLoading.set(false);
    normalizationError.set(null);
    store = jasmine.createSpyObj<PerformanceByRatingStore>(
      'PerformanceByRatingStore',
      [
        'initialize',
        'load',
        'setFrom',
        'setTo',
        'setMinRating',
        'isTypeEnabled',
        'toggleType',
        'isColumnVisible',
        'toggleColumn',
        'setPreset',
      ],
      {
        from: signal('2026-05-03'),
        to: signal('2026-08-03'),
        minRating: signal(600),
        loading,
        loaded,
        error,
        filteredItems,
        visibleColumnCount: signal(15),
        selectedPreset: signal<PerformanceColumnPreset>('all'),
        normalizationProfile,
        normalizationLoading,
        normalizationError,
      },
    );
    store.initialize.and.returnValue(Promise.resolve());
    store.load.and.returnValue(Promise.resolve());
    store.isTypeEnabled.and.callFake(
      (type) => type !== 'LICHESS_BULLET' && type !== 'CHESS_COM_BULLET',
    );
    store.isColumnVisible.and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [PerformanceByRatingExperimentComponent],
    })
      .overrideComponent(PerformanceByRatingExperimentComponent, {
        set: {
          providers: [{ provide: PerformanceByRatingStore, useValue: store }],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(PerformanceByRatingExperimentComponent);
    fixture.detectChanges();
  });

  it('initializes and refreshes through the rendered panel action', () => {
    expect(store.initialize).toHaveBeenCalledTimes(1);
    store.load.calls.reset();

    findButton('Refresh').click();

    expect(store.load).toHaveBeenCalledTimes(1);
  });

  it('disables and relabels rendered query actions while loading', () => {
    loading.set(true);
    fixture.detectChanges();

    const refresh = findButton('Loading…');
    const apply = findButton('Apply filters');
    expect(refresh.disabled).toBeTrue();
    expect(apply.disabled).toBeTrue();
  });

  it('delegates rendered filter changes and applies the report query', () => {
    setInputValue('#performance-from', '2026-01-01');
    setInputValue('#performance-to', '2026-07-31');
    setInputValue('#performance-min-rating', '900');
    findButton('Apply filters').click();

    expect(store.setFrom).toHaveBeenCalledOnceWith('2026-01-01');
    expect(store.setTo).toHaveBeenCalledOnceWith('2026-07-31');
    expect(store.setMinRating).toHaveBeenCalledOnceWith('900');
    expect(store.load).toHaveBeenCalledTimes(1);
  });

  it('delegates a rendered report-type toggle with pressed-state semantics', () => {
    const bulletToggle = findButton('Lichess Bullet');
    const blitzToggle = findButton('Lichess Blitz');
    expect(bulletToggle.getAttribute('aria-pressed')).toBe('false');
    expect(blitzToggle.getAttribute('aria-pressed')).toBe('true');

    bulletToggle.click();

    expect(store.toggleType).toHaveBeenCalledOnceWith('LICHESS_BULLET');
  });

  it('opens the column disclosure before delegating presets and individual toggles', () => {
    const columnPicker = fixture.nativeElement.querySelector('.column-picker') as HTMLDetailsElement;
    expect(columnPicker.open).toBeFalse();

    (columnPicker.querySelector('summary') as HTMLElement).click();
    fixture.detectChanges();
    expect(columnPicker.open).toBeTrue();

    const allPreset = findButton('All');
    const storiesPreset = findButton('Stories');
    expect(allPreset.getAttribute('aria-pressed')).toBe('true');
    expect(storiesPreset.getAttribute('aria-pressed')).toBe('false');

    storiesPreset.click();

    const firstColumn = columnPicker.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement;
    expect(firstColumn.getAttribute('aria-label')).toContain(
      'Scored games in this provider, speed and opponent-rating band.',
    );
    firstColumn.click();

    expect(store.setPreset).toHaveBeenCalledOnceWith('stories');
    expect(store.toggleColumn).toHaveBeenCalledOnceWith('games');
  });

  it('renders populated analytical data with table and scroll-region semantics', () => {
    loaded.set(true);
    filteredItems.set([sampleRow]);
    fixture.detectChanges();

    const region = fixture.nativeElement.querySelector(
      '.performance-table-wrap',
    ) as HTMLElement;
    const table = region.querySelector('table') as HTMLTableElement;
    const row = table.querySelector('tbody tr') as HTMLTableRowElement;
    const openingSuccessHeader = table.querySelector(
      'thead th[aria-label="Opening success"]',
    ) as HTMLTableCellElement;
    const rowHeaders = row.querySelectorAll('th[scope="row"]');
    const sampleWarning = row.querySelector('.sample-warning') as HTMLElement;

    expect(region.getAttribute('role')).toBe('region');
    expect(region.tabIndex).toBe(0);
    expect(table.getAttribute('aria-label')).toBe('Performance by opponent rating');
    expect(table.querySelectorAll('thead th[scope="colgroup"]').length).toBe(6);
    expect(table.querySelectorAll('thead th[scope="col"]').length).toBe(17);
    expect(rowHeaders.length).toBe(2);
    expect(rowHeaders[0].textContent?.trim()).toBe('Lichess Blitz');
    expect(rowHeaders[1].textContent).toContain('1200–1299');
    expect(openingSuccessHeader.textContent?.trim()).toBe('Opening +');
    expect(row.textContent).toContain('2–1–1');
    expect(row.textContent).toContain('62.5%');
    expect(sampleWarning.textContent?.trim()).toBe('Low n');
    expect(sampleWarning.getAttribute('aria-label')).toBe('Low sample: fewer than five games');
  });

  it('keeps the sticky metric headers below the sticky group headers', async () => {
    loaded.set(true);
    filteredItems.set(
      Array.from({ length: 20 }, (_, index) => ({
        ...sampleRow,
        ratingFrom: 600 + index * 100,
        ratingTo: 699 + index * 100,
      })),
    );
    fixture.detectChanges();

    const region = fixture.nativeElement.querySelector(
      '.performance-table-wrap',
    ) as HTMLElement;
    const groupHeader = region.querySelector(
      '.group-row th[scope="colgroup"]',
    ) as HTMLTableCellElement;
    const metricHeader = region.querySelector(
      '.metric-row th[scope="col"]',
    ) as HTMLTableCellElement;

    expect(region.scrollHeight).toBeGreaterThan(region.clientHeight);
    region.scrollTop = 120;
    await nextAnimationFrame();

    expect(metricHeader.getBoundingClientRect().top).toBeGreaterThanOrEqual(
      groupHeader.getBoundingClientRect().bottom - 0.5,
    );
  });

  it('renders normalization loading, error, and populated table states', () => {
    const reference = fixture.nativeElement.querySelector(
      '.normalization-reference',
    ) as HTMLDetailsElement;
    (reference.querySelector('summary') as HTMLElement).click();

    normalizationLoading.set(true);
    fixture.detectChanges();
    expect(reference.querySelector('.reference-state')?.textContent).toContain('Loading');

    normalizationLoading.set(false);
    normalizationError.set('Could not load the rating grade reference.');
    fixture.detectChanges();
    expect(reference.querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'Could not load the rating grade reference.',
    );

    normalizationError.set(null);
    normalizationProfile.set(sampleNormalizationProfile);
    fixture.detectChanges();

    const region = reference.querySelector('.normalization-table-wrap') as HTMLElement;
    const table = region.querySelector('table') as HTMLTableElement;
    expect(region.getAttribute('role')).toBe('region');
    expect(region.tabIndex).toBe(0);
    expect(table.querySelectorAll('thead th[scope="col"]').length).toBe(8);
    expect(table.querySelector('tbody th[scope="row"]')?.textContent?.trim()).toBe('All ratings');
    expect(table.textContent).toContain('Reference');
  });

  it('announces report errors and renders the empty state after recovery', () => {
    error.set('Could not load performance by rating.');
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector(
      '.lab-state--error[role="alert"]',
    ) as HTMLElement;
    expect(alert.textContent?.trim()).toBe('Could not load performance by rating.');

    error.set(null);
    loaded.set(true);
    fixture.detectChanges();

    const empty = fixture.nativeElement.querySelector('.lab-empty') as HTMLElement;
    expect(empty.textContent).toContain('No scored games with opponent ratings');
  });

  function setInputValue(selector: string, value: string): void {
    const input = fixture.nativeElement.querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  function findButton(label: string): HTMLButtonElement {
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    const button = buttons.find((candidate) => candidate.textContent?.trim() === label);
    expect(button).withContext(`Expected rendered button "${label}"`).toBeDefined();
    return button as HTMLButtonElement;
  }

  function poolMetadata(label: string, referenceOnly = false) {
    return { label, referenceOnly, confidence: 'HIGH' as const, softPadding: 0 };
  }

  function openRange() {
    return { minInclusive: 0, maxExclusive: null };
  }

  function nextAnimationFrame(): Promise<void> {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }
});
