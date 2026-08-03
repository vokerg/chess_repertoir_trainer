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
    store.load.and.returnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      imports: [MonthlyGamesExperimentComponent],
    })
      .overrideComponent(MonthlyGamesExperimentComponent, {
        set: {
          providers: [{ provide: MonthlyGamesStore, useValue: store }],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(MonthlyGamesExperimentComponent);
    fixture.detectChanges();
  });

  it('loads on init and refreshes through the rendered panel action', () => {
    expect(store.load).toHaveBeenCalledTimes(1);
    store.load.calls.reset();

    refreshButton().click();

    expect(store.load).toHaveBeenCalledTimes(1);
  });

  it('disables and relabels the rendered refresh action while loading', () => {
    loading.set(true);
    fixture.detectChanges();

    const button = refreshButton();
    expect(button.disabled).toBeTrue();
    expect(button.textContent?.trim()).toBe('Loading…');
  });

  it('keeps the bullet exclusion control wired to the store', () => {
    const checkbox = fixture.nativeElement.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement;

    checkbox.click();

    expect(store.setExcludeBullet).toHaveBeenCalledOnceWith(true);
  });

  function refreshButton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button.ui-shell-action') as HTMLButtonElement;
  }
});
