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

  beforeEach(async () => {
    loading.set(false);
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
        loaded: signal(false),
        error: signal<string | null>(null),
        filteredItems: signal<readonly PerformanceByRatingRow[]>([]),
        visibleColumnCount: signal(10),
        selectedPreset: signal<PerformanceColumnPreset>('core'),
        normalizationProfile: signal<RatingNormalizationProfile | null>(null),
        normalizationLoading: signal(false),
        normalizationError: signal<string | null>(null),
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

  it('disables and relabels the rendered refresh action while loading', () => {
    loading.set(true);
    fixture.detectChanges();

    const refresh = findButton('Loading…');
    expect(refresh.disabled).toBeTrue();
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

  it('delegates a rendered report-type toggle', () => {
    findButton('Lichess Bullet').click();

    expect(store.toggleType).toHaveBeenCalledOnceWith('LICHESS_BULLET');
  });

  it('delegates rendered column presets and individual column toggles', () => {
    findButton('Stories').click();

    const firstColumn = fixture.nativeElement.querySelector(
      '.column-picker input[type="checkbox"]',
    ) as HTMLInputElement;
    firstColumn.click();

    expect(store.setPreset).toHaveBeenCalledOnceWith('stories');
    expect(store.toggleColumn).toHaveBeenCalledOnceWith('games');
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
});
