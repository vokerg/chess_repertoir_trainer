import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import type {
  LichessPuzzleRound,
  SubmitLichessPuzzleMoveResponse,
} from '@chess-trainer/contracts/lichess-puzzles';
import { LichessPuzzlesApiService } from '../data-access/lichess-puzzles-api.service';
import { LichessPuzzlesStore } from './lichess-puzzles.store';

describe('LichessPuzzlesStore', () => {
  let api: jasmine.SpyObj<LichessPuzzlesApiService>;
  let store: LichessPuzzlesStore;

  beforeEach(() => {
    api = jasmine.createSpyObj<LichessPuzzlesApiService>('LichessPuzzlesApiService', [
      'createRound',
      'getRound',
      'submitMove',
      'abandonRound',
      'retrySync',
    ]);

    TestBed.configureTestingModule({
      providers: [
        LichessPuzzlesStore,
        { provide: LichessPuzzlesApiService, useValue: api },
      ],
    });

    store = TestBed.inject(LichessPuzzlesStore);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('starts a normal rated puzzle without exposing solution moves', async () => {
    const round = createRound();
    api.createRound.and.returnValue(of(round));

    await store.startRound();

    expect(api.createRound).toHaveBeenCalledOnceWith({
      source: 'FRESH',
      angle: 'mix',
      difficulty: 'normal',
      rated: true,
    });
    expect(store.round()).toEqual(round);
    expect(store.lastMove()).toEqual({ from: 'e7', to: 'e5' });
    expect(store.notice()).toContain('Rated Lichess puzzle started');
    expect('solutionUci' in store.round()!.puzzle).toBeFalse();
  });

  it('locks the board while a move is being submitted and applies the forced reply', async () => {
    api.createRound.and.returnValue(of(createRound()));
    await store.startRound();

    const response = new Subject<SubmitLichessPuzzleMoveResponse>();
    api.submitMove.and.returnValue(response);

    const pending = store.submitMove('g1f3');
    expect(store.submitting()).toBeTrue();
    expect(store.boardMovable()).toBeFalse();

    response.next({
      correct: true,
      forcedMoveUci: 'b8c6',
      round: createRound({ currentStep: 2, currentFen: 'after-forced-reply' }),
    });
    response.complete();
    await pending;

    expect(store.submitting()).toBeFalse();
    expect(store.boardMovable()).toBeTrue();
    expect(store.lastMove()).toEqual({ from: 'b8', to: 'c6' });
    expect(store.notice()).toContain('opponent replied');
  });

  it('keeps a rated failed round playable for line completion', async () => {
    api.createRound.and.returnValue(of(createRound()));
    await store.startRound();
    api.submitMove.and.returnValue(of({
      correct: false,
      forcedMoveUci: null,
      round: createRound({
        firstWrongAt: '2026-07-29T05:00:00.000Z',
        upstreamStatus: 'SYNCED',
        ratingDiff: -8,
      }),
    }));

    await store.submitMove('d2d4');

    expect(store.round()?.status).toBe('IN_PROGRESS');
    expect(store.boardMovable()).toBeTrue();
    expect(store.notice()).toContain('rated result is a loss');
  });
});

function createRound(overrides: Partial<LichessPuzzleRound> = {}): LichessPuzzleRound {
  return {
    id: 1,
    source: 'FRESH',
    angle: 'mix',
    difficulty: 'normal',
    ratedRequested: true,
    status: 'IN_PROGRESS',
    outcome: null,
    currentFen: 'start-fen',
    currentStep: 0,
    firstWrongAt: null,
    learningCompletedAt: null,
    upstreamStatus: 'NOT_REQUIRED',
    ratingDiff: null,
    startedAt: '2026-07-29T04:59:00.000Z',
    completedAt: null,
    puzzle: {
      id: 'abcde',
      rating: 1600,
      themes: ['fork'],
      startFen: 'start-fen',
      lastMoveUci: 'e7e5',
      sideToMove: 'WHITE',
      solutionPlies: 3,
    },
    ...overrides,
  };
}
