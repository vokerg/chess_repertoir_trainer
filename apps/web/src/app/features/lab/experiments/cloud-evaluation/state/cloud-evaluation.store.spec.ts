import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import type { CloudEvaluationResponse } from '@chess-trainer/contracts/lab';
import { firstValueFrom, of, throwError } from 'rxjs';
import { CloudEvaluationApiService } from '../data-access/cloud-evaluation-api.service';
import { CloudEvaluationStore } from './cloud-evaluation.store';

describe('CloudEvaluationStore', () => {
  let store: CloudEvaluationStore;
  let api: jasmine.SpyObj<CloudEvaluationApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<CloudEvaluationApiService>('CloudEvaluationApiService', ['lookup']);
    TestBed.configureTestingModule({
      providers: [
        CloudEvaluationStore,
        { provide: CloudEvaluationApiService, useValue: api },
      ],
    });
    store = TestBed.inject(CloudEvaluationStore);
  });

  it('queries only on demand and preserves the mapped result', async () => {
    const mapped: CloudEvaluationResponse = {
      source: 'LICHESS_CLOUD',
      depth: 22,
      knodes: 100,
      positionAnalysis: {
        fen: 'startpos',
        normalizedFen: 'startpos',
        bestMoveUci: 'e2e4',
        bestScoreCpWhite: 24,
        bestMateWhite: null,
        lines: [{ multipv: 1, depth: 22, moveUci: 'e2e4', scoreCpWhite: 24, pvUci: ['e2e4'] }],
        persistenceMode: 'rich',
      },
    };
    api.lookup.and.returnValue(of(mapped));
    expect(api.lookup).not.toHaveBeenCalled();
    store.fen.set(' startpos ');
    await store.lookup();
    expect(api.lookup).toHaveBeenCalledOnceWith('startpos');
    expect(store.result()).toEqual(mapped);
    expect(store.error()).toBeNull();
    expect(store.loading()).toBeFalse();
  });

  it('surfaces the API validation error without retaining an obsolete result', async () => {
    api.lookup.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 400, error: { error: 'The supplied FEN is invalid.' },
    })));
    await store.lookup();
    expect(store.error()).toBe('The supplied FEN is invalid.');
    expect(store.result()).toBeNull();
    expect(store.loading()).toBeFalse();
  });

  it('does not request a blank FEN', async () => {
    store.fen.set('  ');
    await store.lookup();
    expect(api.lookup).not.toHaveBeenCalled();
    expect(store.error()).toBe('Enter a FEN to look up.');
  });
});
