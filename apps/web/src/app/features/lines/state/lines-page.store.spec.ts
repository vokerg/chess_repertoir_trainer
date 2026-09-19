import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { LinesApiService } from '../data-access/lines-api.service';
import { LineResource, LineSummary } from '../data-access/lines.models';
import { LinesPageStore } from './lines-page.store';

describe('LinesPageStore line mutations', () => {
  let api: jasmine.SpyObj<LinesApiService>;
  let store: LinesPageStore;
  let loadPage: jasmine.Spy;

  beforeEach(() => {
    api = jasmine.createSpyObj<LinesApiService>('LinesApiService', [
      'createLine',
      'importLinePgn',
      'copyLine',
    ]);
    TestBed.configureTestingModule({
      providers: [
        LinesPageStore,
        { provide: LinesApiService, useValue: api },
        { provide: Router, useValue: jasmine.createSpyObj<Router>('Router', ['navigate']) },
      ],
    });
    store = TestBed.inject(LinesPageStore);
    loadPage = spyOn(store, 'loadPage').and.resolveTo();
    store.initialize(11);
    loadPage.calls.reset();
  });

  it('reloads line summaries after creating a line instead of appending the plain resource', async () => {
    api.createLine.and.returnValue(of(lineResource(101, 'Created line')));

    await store.createLine();

    expect(api.createLine).toHaveBeenCalledTimes(1);
    expect(loadPage).toHaveBeenCalledTimes(1);
  });

  it('reloads line summaries after importing PGN instead of appending the plain resource', async () => {
    api.importLinePgn.and.returnValue(of(lineResource(102, 'Imported line')));
    store.setImportPgnText('1. e4 e5 *');

    await store.importPgn();

    expect(api.importLinePgn).toHaveBeenCalledTimes(1);
    expect(loadPage).toHaveBeenCalledTimes(1);
  });

  it('reloads line summaries after a same-chapter copy', async () => {
    const source = lineSummary(103, 'Source line');
    api.copyLine.and.returnValue(of(lineResource(104, 'Source line copy')));

    await store.copyLine(source, 11);

    expect(api.copyLine).toHaveBeenCalledTimes(1);
    expect(loadPage).toHaveBeenCalledTimes(1);
  });
});

function lineResource(id: number, name: string): LineResource {
  return {
    id,
    chapterId: 11,
    name,
    sideToTrain: 'WHITE',
    startingFen: 'startpos',
    tags: null,
    notes: null,
    createdAt: '2026-08-25T07:00:00.000Z',
    updatedAt: '2026-08-25T07:00:00.000Z',
  };
}

function lineSummary(id: number, name: string): LineSummary {
  return {
    id,
    chapterId: 11,
    name,
    sideToTrain: 'WHITE',
    startingFen: 'startpos',
    trainingStats: {
      totalAttempts: 0,
      passedCount: 0,
      failedCount: 0,
      passRate: 0,
      activeSublineCount: 1,
      trainedSublineCount: 0,
      untrainedSublineCount: 1,
      weakSublineCount: 0,
      status: 'NEW',
    },
  };
}
