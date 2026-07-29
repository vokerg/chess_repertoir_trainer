import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { defaultOpeningFilters } from '../../../shared/games/position-moves/position-game-moves.helpers';
import { LichessBotChallengeStore } from '../../../shared/lichess/bot-challenge/lichess-bot-challenge.store';
import { OpeningAnalysisStore } from '../state/opening-analysis.store';
import { OpeningAnalysisPageComponent } from './opening-analysis-page.component';

describe('OpeningAnalysisPageComponent', () => {
  let fixture: ComponentFixture<OpeningAnalysisPageComponent>;
  let store: jasmine.SpyObj<OpeningAnalysisStore>;

  beforeEach(async () => {
    store = jasmine.createSpyObj<OpeningAnalysisStore>('OpeningAnalysisStore', [
      'initialize',
      'toggleTags',
      'toggleMasters',
      'togglePeers',
      'toggleLastGames',
      'toggleEngine',
    ]);
    Object.assign(store, {
      tagsOpen: signal(true),
      mastersOpen: signal(false),
      peersOpen: signal(false),
      lastGamesOpen: signal(false),
      engineVisible: signal(true),
      currentFen: signal('startpos'),
      history: signal([]),
      filters: signal(defaultOpeningFilters()),
      blackPerspective: signal(false),
      analysis: signal(null),
      wdl: signal({ total: 0, wins: 0, draws: 0, losses: 0, scorePct: null }),
    });
    const challengeStore = jasmine.createSpyObj<LichessBotChallengeStore>(
      'LichessBotChallengeStore',
      ['openForFen'],
    );

    await TestBed.configureTestingModule({
      imports: [OpeningAnalysisPageComponent],
    })
      .overrideComponent(OpeningAnalysisPageComponent, {
        set: {
          template: '',
          providers: [
            { provide: OpeningAnalysisStore, useValue: store },
            { provide: LichessBotChallengeStore, useValue: challengeStore },
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(OpeningAnalysisPageComponent);
  });

  it('orders the header actions with public explorers before Last games and Engine', () => {
    const actions = page().headerActions();

    expect(actions.map((action) => action.id)).toEqual([
      'tags',
      'masters',
      'peers',
      'last-games',
      'engine',
      'challenge-lichess-bot',
    ]);
    expect(actions[0].pressed).toBeTrue();
    expect(actions[1].pressed).toBeFalse();
    expect(actions[2].pressed).toBeFalse();
    expect(actions[3].pressed).toBeFalse();

    actions[1].run();
    actions[2].run();
    actions[3].run();

    expect(store.toggleMasters).toHaveBeenCalled();
    expect(store.togglePeers).toHaveBeenCalled();
    expect(store.toggleLastGames).toHaveBeenCalled();
  });

  it('derives workspace context without introducing duplicate state', () => {
    expect(page().perspectiveLabel()).toBe('White perspective');
    expect(page().activeToolCount()).toBe(2);
    expect(page().filterSummary()).toBe('White - Any speed - Rated');

    store.blackPerspective.set(true);
    store.mastersOpen.set(true);
    store.peersOpen.set(true);

    expect(page().perspectiveLabel()).toBe('Black perspective');
    expect(page().activeToolCount()).toBe(4);
  });

  function page(): {
    headerActions(): readonly { id: string; pressed?: boolean; run: () => void }[];
    perspectiveLabel(): string;
    activeToolCount(): number;
    filterSummary(): string;
  } {
    return fixture.componentInstance as unknown as {
      headerActions(): readonly { id: string; pressed?: boolean; run: () => void }[];
      perspectiveLabel(): string;
      activeToolCount(): number;
      filterSummary(): string;
    };
  }
});
