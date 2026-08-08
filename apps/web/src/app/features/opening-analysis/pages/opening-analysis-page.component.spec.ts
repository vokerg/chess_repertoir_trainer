import { signal, type WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { defaultOpeningFilters } from '../../../shared/games/position-moves/position-game-moves.helpers';
import { LichessBotChallengeStore } from '../../../shared/lichess/bot-challenge/lichess-bot-challenge.store';
import { OpeningAnalysisStore } from '../state/opening-analysis.store';
import { OpeningAnalysisPageComponent } from './opening-analysis-page.component';

describe('OpeningAnalysisPageComponent', () => {
  let fixture: ComponentFixture<OpeningAnalysisPageComponent>;
  let store: jasmine.SpyObj<OpeningAnalysisStore>;
  let history: WritableSignal<Array<{ uci: string; san: string }>>;

  beforeEach(async () => {
    history = signal<Array<{ uci: string; san: string }>>([]);
    store = jasmine.createSpyObj<OpeningAnalysisStore>('OpeningAnalysisStore', [
      'initialize',
      'toggleEngine',
    ]);
    Object.assign(store, {
      activeEvidenceTab: signal('performance'),
      engineVisible: signal(true),
      currentFen: signal('startpos'),
      history,
      filters: signal(defaultOpeningFilters()),
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

  it('keeps only Engine and Challenge bot in the header actions', () => {
    const actions = page().headerActions();

    expect(actions.map((action) => action.id)).toEqual(['engine', 'challenge-lichess-bot']);
    expect(actions[0].pressed).toBeTrue();

    actions[0].run();

    expect(store.toggleEngine).toHaveBeenCalled();
  });

  it('keeps the approved three summary stats and derives the reusable move trail', () => {
    expect(page().headerStats().map((stat) => stat.id)).toEqual(['games', 'score', 'wdl']);

    history.set([
      { uci: 'd2d4', san: 'd4' },
      { uci: 'd7d5', san: 'd5' },
      { uci: 'c2c4', san: 'c4' },
    ]);

    expect(page().lineTrailMoves()).toEqual([
      { id: '1-d2d4', label: 'd4', index: 1 },
      { id: '2-d7d5', label: 'd5', index: 2 },
      { id: '3-c2c4', label: 'c4', index: 3 },
    ]);
  });

  function page(): {
    headerActions(): readonly { id: string; pressed?: boolean; run: () => void }[];
    headerStats(): readonly { id: string }[];
    lineTrailMoves(): readonly { id: string | number; label: string; index: number }[];
  } {
    return fixture.componentInstance as unknown as {
      headerActions(): readonly { id: string; pressed?: boolean; run: () => void }[];
      headerStats(): readonly { id: string }[];
      lineTrailMoves(): readonly { id: string | number; label: string; index: number }[];
    };
  }
});
