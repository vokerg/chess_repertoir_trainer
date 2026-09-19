import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import {
  type GameTacticalFinding,
  GameTacticalFindingsApiService,
} from '../data-access/game-tactical-findings-api.service';
import { GameTacticalFindingsStore } from './game-tactical-findings.store';

describe('GameTacticalFindingsStore', () => {
  let api: jasmine.SpyObj<GameTacticalFindingsApiService>;
  let store: GameTacticalFindingsStore;

  beforeEach(() => {
    api = jasmine.createSpyObj<GameTacticalFindingsApiService>('GameTacticalFindingsApiService', ['getForGame']);
    TestBed.configureTestingModule({
      providers: [
        GameTacticalFindingsStore,
        { provide: GameTacticalFindingsApiService, useValue: api },
      ],
    });
    store = TestBed.inject(GameTacticalFindingsStore);
  });

  it('loads findings into page-scoped state', async () => {
    api.getForGame.and.returnValue(of([finding()]));

    await store.load(7);

    expect(api.getForGame).toHaveBeenCalledOnceWith(7);
    expect(store.findings()).toEqual([finding()]);
    expect(store.status()).toBe('READY');
  });

  it('ignores a response invalidated by reset', async () => {
    const response = new Subject<GameTacticalFinding[]>();
    api.getForGame.and.returnValue(response);

    const loading = store.load(7);
    store.reset();
    response.next([finding()]);
    response.complete();
    await loading;

    expect(store.findings()).toEqual([]);
    expect(store.status()).toBe('IDLE');
  });
});

function finding(): GameTacticalFinding {
  return {
    id: 1,
    importedGameId: 7,
    kind: 'MISSED_SHOT',
    triggerPlyNumber: 12,
    userReplyPlyNumber: 13,
    moveUci: 'e4d5',
    bestMoveUci: 'e4e5',
    swingCp: 180,
  };
}
