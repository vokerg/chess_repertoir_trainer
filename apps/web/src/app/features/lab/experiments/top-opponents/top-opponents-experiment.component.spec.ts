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
    store.load.and.returnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      imports: [TopOpponentsExperimentComponent],
    })
      .overrideComponent(TopOpponentsExperimentComponent, {
        set: {
          providers: [{ provide: TopOpponentsStore, useValue: store }],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(TopOpponentsExperimentComponent);
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
