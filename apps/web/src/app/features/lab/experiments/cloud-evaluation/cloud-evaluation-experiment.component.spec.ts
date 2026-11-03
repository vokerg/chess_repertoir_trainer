import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { CloudEvaluationResponse } from '@chess-trainer/contracts/lab';
import { CloudEvaluationStore } from './state/cloud-evaluation.store';
import { CloudEvaluationExperimentComponent } from './cloud-evaluation-experiment.component';

describe('CloudEvaluationExperimentComponent', () => {
  let fixture: ComponentFixture<CloudEvaluationExperimentComponent>;
  let store: jasmine.SpyObj<CloudEvaluationStore>;
  const loading = signal(false);
  const fen = signal('startpos');
  const result = signal<CloudEvaluationResponse | null>(null);
  const error = signal<string | null>(null);

  beforeEach(async () => {
    loading.set(false);
    fen.set('startpos');
    result.set(null);
    error.set(null);
    store = jasmine.createSpyObj<CloudEvaluationStore>('CloudEvaluationStore', ['lookup'], {
      fen, result, loading, error,
    });
    store.lookup.and.returnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      imports: [CloudEvaluationExperimentComponent],
    }).overrideComponent(CloudEvaluationExperimentComponent, {
      set: { providers: [{ provide: CloudEvaluationStore, useValue: store }] },
    }).compileComponents();

    fixture = TestBed.createComponent(CloudEvaluationExperimentComponent);
    fixture.detectChanges();
  });

  it('passes FEN input to the store and requests the evaluation', () => {
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = '8/8/8/8/8/8/8/K6k w - - 0 1';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fen()).toBe('8/8/8/8/8/8/8/K6k w - - 0 1');
    (fixture.nativeElement.querySelector('button.lookup-button') as HTMLButtonElement).click();
    expect(store.lookup).toHaveBeenCalledTimes(1);
  });

  it('disables request controls while the lookup is pending', () => {
    loading.set(true);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button.lookup-button') as HTMLButtonElement;
    expect(button.disabled).toBeTrue();
    expect((fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement).disabled).toBeTrue();
  });

  it('renders mapped engine lines and raw cache-compatible response', () => {
    result.set({
      source: 'LICHESS_CLOUD',
      depth: 28,
      knodes: 123,
      positionAnalysis: {
        fen: 'startpos',
        normalizedFen: 'startpos',
        bestMoveUci: 'e2e4',
        bestScoreCpWhite: 36,
        bestMateWhite: null,
        persistenceMode: 'rich',
        lines: [{ multipv: 1, depth: 28, moveUci: 'e2e4', scoreCpWhite: 36, pvUci: ['e2e4', 'e7e5'] }],
      },
    });
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('e2e4');
    expect(root.textContent).toContain('+0.36');
    expect(root.querySelector('pre.json-preview')?.textContent).toContain('"bestScoreCpWhite": 36');
    expect(root.querySelector('pre.json-preview')?.textContent).toContain('"persistenceMode": "rich"');
  });

  it('distinguishes a Lichess cache miss from an error', () => {
    result.set({ source: 'LICHESS_CLOUD', depth: null, knodes: null, positionAnalysis: null });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('no cached evaluation');
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')).toBeNull();
  });
});
