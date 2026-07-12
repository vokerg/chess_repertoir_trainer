import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { LinesApiService } from '../data-access/lines-api.service';
import { MarathonNextResponse } from '../data-access/lines.models';
import { TrainingMarathonStore } from './training-marathon.store';

describe('TrainingMarathonStore run recovery', () => {
  it('replaces an expired run once and retries next successfully', async () => {
    const api = jasmine.createSpyObj<LinesApiService>('LinesApiService', ['createMarathonRun', 'startNextMarathonRunLine']);
    api.createMarathonRun.and.returnValues(of({ runId: 'old-run' }), of({ runId: 'replacement-run' }));
    api.startNextMarathonRunLine.and.returnValues(
      of(response(1)),
      throwError(() => ({ status: 404, error: { error: 'expired' } })),
      of(response(2)),
    );
    TestBed.configureTestingModule({ providers: [TrainingMarathonStore, { provide: LinesApiService, useValue: api }] });
    const store = TestBed.inject(TrainingMarathonStore);
    store.scopeType.set('COURSE');
    store.scopeId.set(7);

    await store.startNextLine();
    await store.startNextLine();

    expect(api.createMarathonRun).toHaveBeenCalledTimes(2);
    expect(api.startNextMarathonRunLine.calls.allArgs()).toEqual([['old-run'], ['old-run'], ['replacement-run']]);
    expect(store.sessionId()).toBe(2);
    expect(store.error()).toBeNull();
  });
});

function response(sessionId: number): MarathonNextResponse {
  return {
    scope: { type: 'COURSE', id: 7 }, mode: 'ALL',
    line: { id: 1, name: 'Line', sideToTrain: 'WHITE', startingFen: 'startpos', chapterId: 1, chapterName: 'Chapter', courseId: 7 },
    subline: { hash: `${sessionId}`.padStart(64, '0'), canonicalKeyVersion: 1, moveText: 'e4', leafNodeId: 1, moves: [] },
    session: { sessionId, fen: 'startpos', expectedMove: 'e2e4', completed: false, sublineHash: `${sessionId}`.padStart(64, '0'), sublineMoveText: 'e4' },
  };
}
