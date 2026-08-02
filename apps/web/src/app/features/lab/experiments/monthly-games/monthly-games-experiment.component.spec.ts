import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MonthlyGamesStore } from './state/monthly-games.store';
import { MonthlyGamesExperimentComponent } from './monthly-games-experiment.component';

describe('MonthlyGamesExperimentComponent', () => {
  let fixture: ComponentFixture<MonthlyGamesExperimentComponent>;
  let store: jasmine.SpyObj<MonthlyGamesStore>;
  const loading = signal(false);

  beforeEach(async () => {
    loading.set(false);
    store = jasmine.createSpyObj<MonthlyGamesStore>(
      'MonthlyGamesStore',
      ['load', 'setExcludeBullet'],
      {
        items: signal([]),
        excludeBullet: signal(false),
        loading,
        loaded: signal(false),
        error: signal<string | null>(null),
      },
    );

    await TestBed.configureTestingModule({
      imports: [MonthlyGamesExperimentComponent],
    })
      .overrideComponent(MonthlyGamesExperimentComponent, {
        set: {
          template: '',
          providers: [{ provide: MonthlyGamesStore, useValue: store }],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(MonthlyGamesExperimentComponent);
  });

  it('runs refresh through the existing store workflow', () => {
    component().actions()[0].run?.();

    expect(store.load).toHaveBeenCalledTimes(1);
  });

  it('disables and relabels refresh while loading', () => {
    loading.set(true);

    expect(component().actions()[0]).toEqual(
      jasmine.objectContaining({ label: 'Loading…', disabled: true }),
    );
  });

  function component(): { actions(): readonly { label: string; disabled?: boolean; run?: () => void }[] } {
    return fixture.componentInstance as unknown as {
      actions(): readonly { label: string; disabled?: boolean; run?: () => void }[];
    };
  }
});
