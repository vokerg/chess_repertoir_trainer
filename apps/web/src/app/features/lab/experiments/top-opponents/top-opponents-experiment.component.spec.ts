import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TopOpponentsStore } from './state/top-opponents.store';
import { TopOpponentsExperimentComponent } from './top-opponents-experiment.component';

describe('TopOpponentsExperimentComponent', () => {
  let fixture: ComponentFixture<TopOpponentsExperimentComponent>;
  let store: jasmine.SpyObj<TopOpponentsStore>;
  const loading = signal(false);

  beforeEach(async () => {
    loading.set(false);
    store = jasmine.createSpyObj<TopOpponentsStore>('TopOpponentsStore', ['load'], {
      items: signal([]),
      loading,
      loaded: signal(false),
      error: signal<string | null>(null),
    });

    await TestBed.configureTestingModule({
      imports: [TopOpponentsExperimentComponent],
    })
      .overrideComponent(TopOpponentsExperimentComponent, {
        set: {
          template: '',
          providers: [{ provide: TopOpponentsStore, useValue: store }],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(TopOpponentsExperimentComponent);
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
