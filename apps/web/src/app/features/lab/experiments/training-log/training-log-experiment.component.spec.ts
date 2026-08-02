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

    await TestBed.configureTestingModule({
      imports: [TrainingLogExperimentComponent],
    })
      .overrideComponent(TrainingLogExperimentComponent, {
        set: {
          template: '',
          providers: [{ provide: TrainingLogStore, useValue: store }],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(TrainingLogExperimentComponent);
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
