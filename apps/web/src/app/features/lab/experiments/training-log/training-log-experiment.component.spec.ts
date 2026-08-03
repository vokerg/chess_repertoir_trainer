import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TrainingLogStore } from './state/training-log.store';
import { TrainingLogExperimentComponent } from './training-log-experiment.component';

describe('TrainingLogExperimentComponent', () => {
  let fixture: ComponentFixture<TrainingLogExperimentComponent>;
  let store: jasmine.SpyObj<TrainingLogStore>;
  const loading = signal(false);

  beforeEach(async () => {
    loading.set(false);
    store = jasmine.createSpyObj<TrainingLogStore>('TrainingLogStore', ['load'], {
      items: signal([]),
      loading,
      loaded: signal(false),
      error: signal<string | null>(null),
    });
    store.load.and.returnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      imports: [TrainingLogExperimentComponent],
    })
      .overrideComponent(TrainingLogExperimentComponent, {
        set: {
          providers: [{ provide: TrainingLogStore, useValue: store }],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(TrainingLogExperimentComponent);
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

  function refreshButton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button.ui-shell-action') as HTMLButtonElement;
  }
});
