import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PositionAnalysisCacheService } from '../../../shared/chess/engine/position-analysis-cache.service';
import { PositionGameMovesApiService } from '../../../shared/games/position-moves/position-game-moves-api.service';
import { LinesApiService } from '../data-access/lines-api.service';
import type { LineTree } from '../data-access/lines.models';
import { LineEditorStore } from './line-editor.store';

describe('LineEditorStore repertoire navigation', () => {
  let store: LineEditorStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        LineEditorStore,
        { provide: LinesApiService, useValue: {} },
        {
          provide: PositionGameMovesApiService,
          useValue: { getAnalysis: jasmine.createSpy('getAnalysis').and.returnValue(of({})) },
        },
        {
          provide: PositionAnalysisCacheService,
          useValue: {
            state$: of({ fen: '', running: false, ready: false, error: null, bestMove: null, lines: [] }),
            stop: jasmine.createSpy('stop'),
          },
        },
      ],
    });
    store = TestBed.inject(LineEditorStore);
    store.tree.set({ root: {
      node: { id: 0, fenAfter: 'startpos' },
      children: [{
        node: { id: 1, fenAfter: 'after-d4' },
        children: [
          { node: { id: 2, fenAfter: 'after-d5' }, children: [] },
          { node: { id: 3, fenAfter: 'after-Nf6' }, children: [
            { node: { id: 4, fenAfter: 'after-c4' }, children: [] },
          ] },
        ],
      }],
    } } as unknown as LineTree);
  });

  afterEach(() => store.ngOnDestroy());

  it('keeps the chosen subline when stepping back, forward, and to its end', () => {
    store.selectNode(3);
    expect(store.preferredContinuations().get(1)).toBe(3);

    store.goToPrevious();
    expect(store.selectedNodeId()).toBe(1);
    store.goToNext();
    expect(store.selectedNodeId()).toBe(3);

    store.goToStart();
    store.goToEnd();
    expect(store.selectedNodeId()).toBe(4);
  });
});
