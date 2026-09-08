import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { LinesApiService } from '../data-access/lines-api.service';
import { MarathonNextResponse } from '../data-access/lines.models';
import { TrainingMarathonStore } from './training-marathon.store';

describe('TrainingMarathonStore run recovery', () => {
  it('replaces an expired run once and retries next successfully', async () => {
    const api = jasmine.createSpyObj<LinesApiService>('LinesApiService', [
      'createMarathonRun',
      'startNextMarathonRunLine',
    ]);
    api.createMarathonRun.and.returnValues(
      of({ runId: 'old-run' }),
      of({ runId: 'replacement-run' }),
    );
    api.startNextMarathonRunLine.and.returnValues(
      of(response(1)),
      throwError(() => ({ status: 404, error: { error: 'expired' } })),
      of(response(2)),
    );
    TestBed.configureTestingModule({
      providers: [TrainingMarathonStore, { provide: LinesApiService, useValue: api }],
    });
    const store = TestBed.inject(TrainingMarathonStore);
    store.scopeType.set('COURSE');
    store.scopeId.set(7);

    await store.startNextLine();
    await store.startNextLine();

    expect(api.createMarathonRun).toHaveBeenCalledTimes(2);
    expect(api.startNextMarathonRunLine.calls.allArgs()).toEqual([
      ['old-run'],
      ['old-run'],
      ['replacement-run'],
    ]);
    expect(store.sessionId()).toBe(2);
    expect(store.error()).toBeNull();
  });

  it('initializes Daily Review and exposes a legitimate completed run', async () => {
    const api = jasmine.createSpyObj<LinesApiService>('LinesApiService', [
      'createMarathonRun',
      'startNextMarathonRunLine',
    ]);
    api.createMarathonRun.and.returnValue(of({ runId: 'daily-run' }));
    api.startNextMarathonRunLine.and.returnValue(
      of({
        state: 'COMPLETED',
        mode: 'DAILY_REVIEW',
        scope: { type: 'COURSE', id: 7 },
        completedCount: 3,
      }),
    );
    TestBed.configureTestingModule({
      providers: [TrainingMarathonStore, { provide: LinesApiService, useValue: api }],
    });
    const store = TestBed.inject(TrainingMarathonStore);

    store.initialize({ scope: { type: 'COURSE', id: 7 }, mode: 'DAILY_REVIEW' });
    await settle();

    expect(api.createMarathonRun).toHaveBeenCalledWith(
      jasmine.objectContaining({ mode: 'DAILY_REVIEW' }),
    );
    expect(store.dailyReviewCompleted()).toBeTrue();
    expect(store.completedThisRun()).toBe(3);
    expect(store.error()).toBeNull();
  });

  it('continues a completed Daily Review as a normal ALL run in the same scope', async () => {
    const api = jasmine.createSpyObj<LinesApiService>('LinesApiService', [
      'createMarathonRun',
      'startNextMarathonRunLine',
    ]);
    api.createMarathonRun.and.returnValues(of({ runId: 'daily-run' }), of({ runId: 'all-run' }));
    api.startNextMarathonRunLine.and.returnValues(
      of({
        state: 'COMPLETED',
        mode: 'DAILY_REVIEW',
        scope: { type: 'COURSE', id: 7 },
        completedCount: 1,
      }),
      of(response(9)),
    );
    TestBed.configureTestingModule({
      providers: [TrainingMarathonStore, { provide: LinesApiService, useValue: api }],
    });
    const store = TestBed.inject(TrainingMarathonStore);
    store.scopeType.set('COURSE');
    store.scopeId.set(7);
    store.mode.set('DAILY_REVIEW');
    await store.startNextLine();

    store.switchMode('ALL');
    await settle();

    expect(api.createMarathonRun.calls.mostRecent().args[0]).toEqual(
      jasmine.objectContaining({
        scope: { type: 'COURSE', id: 7 },
        mode: 'ALL',
      }),
    );
    expect(store.dailyReviewCompleted()).toBeFalse();
    expect(store.mode()).toBe('ALL');
    expect(store.sessionId()).toBe(9);
  });

  it('surfaces reinforcement retries without changing existing mode support', async () => {
    const api = jasmine.createSpyObj<LinesApiService>('LinesApiService', [
      'createMarathonRun',
      'startNextMarathonRunLine',
    ]);
    api.createMarathonRun.and.returnValue(of({ runId: 'retry-run' }));
    api.startNextMarathonRunLine.and.returnValue(
      of({ ...response(4), mode: 'DAILY_REVIEW', itemKind: 'REINFORCEMENT_RETRY' }),
    );
    TestBed.configureTestingModule({
      providers: [TrainingMarathonStore, { provide: LinesApiService, useValue: api }],
    });
    const store = TestBed.inject(TrainingMarathonStore);
    store.scopeType.set('COURSE');
    store.scopeId.set(7);
    store.mode.set('DAILY_REVIEW');

    await store.startNextLine();
    expect(store.itemKind()).toBe('REINFORCEMENT_RETRY');

    store.switchMode('WEAK_SUBLINES');
    await settle();
    expect(store.mode()).toBe('WEAK_SUBLINES');
  });
});

function response(sessionId: number): MarathonNextResponse {
  return {
    state: 'ITEM',
    itemKind: 'STANDARD',
    scope: { type: 'COURSE', id: 7 },
    mode: 'ALL',
    line: {
      id: 1,
      name: 'Line',
      sideToTrain: 'WHITE',
      startingFen: 'startpos',
      chapterId: 1,
      chapterName: 'Chapter',
      courseId: 7,
    },
    subline: {
      hash: `${sessionId}`.padStart(64, '0'),
      canonicalKeyVersion: 1,
      moveText: 'e4',
      leafNodeId: 1,
      moves: [],
    },
    session: {
      sessionId,
      fen: 'startpos',
      expectedMove: 'e2e4',
      completed: false,
      sublineHash: `${sessionId}`.padStart(64, '0'),
      sublineMoveText: 'e4',
    },
  };
}

function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
