import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
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
      'toggleLastGames',
      'toggleEngine',
    ]);
    Object.assign(store, {
      tagsOpen: signal(true),
      mastersOpen: signal(false),
      lastGamesOpen: signal(false),
      engineVisible: signal(true),
      currentFen: signal('startpos'),
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

  it('orders the header actions with Masters and Last games between Tags and Engine', () => {
    const actions = page().headerActions();

    expect(actions.map((action) => action.id)).toEqual([
      'tags',
      'masters',
      'last-games',
      'engine',
      'challenge-lichess-bot',
    ]);
    expect(actions[0].pressed).toBeTrue();
    expect(actions[1].pressed).toBeFalse();
    expect(actions[2].pressed).toBeFalse();

    actions[1].run();
    actions[2].run();

    expect(store.toggleMasters).toHaveBeenCalled();
    expect(store.toggleLastGames).toHaveBeenCalled();
  });

  function page(): {
    headerActions(): readonly { id: string; pressed?: boolean; run: () => void }[];
  } {
    return fixture.componentInstance as unknown as {
      headerActions(): readonly { id: string; pressed?: boolean; run: () => void }[];
    };
  }
});
