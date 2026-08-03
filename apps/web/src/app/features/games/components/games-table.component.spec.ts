import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ImportedGameJobStore } from '../../../core/jobs/imported-game-job.store';
import type { ImportedGameSearchItem } from '../data-access/games.models';
import { GamesTableComponent } from './games-table.component';

describe('GamesTableComponent', () => {
  let fixture: ComponentFixture<GamesTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GamesTableComponent],
      providers: [
        provideRouter([]),
        {
          provide: ImportedGameJobStore,
          useValue: {
            isGameActive: jasmine.createSpy('isGameActive').and.returnValue(false),
            activeRunForGame: jasmine.createSpy('activeRunForGame').and.returnValue(null),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GamesTableComponent);
    fixture.componentRef.setInput('games', [game()]);
    fixture.componentRef.setInput('pageInfo', { nextCursor: null, hasMore: false });
    fixture.detectChanges();
  });

  it('keeps core analytical evidence in the responsive card representation', () => {
    const card = fixture.nativeElement.querySelector('.games-mobile-card') as HTMLElement;
    const text = card.textContent?.replace(/\s+/g, ' ').trim();

    expect(text).toContain('WhitePlayer (1820)');
    expect(text).toContain('BlackPlayer (1785)');
    expect(text).toContain('B20');
    expect(text).toContain('Sicilian Defence');
    expect(text).toContain('Rapid · 10+5');
    expect(text).toContain('87%');
    expect(text).toContain('Analysed');
  });

  it('shows one mutually exclusive processing status per game', () => {
    const statusCell = fixture.nativeElement.querySelector(
      'td[data-label="Status"]',
    ) as HTMLElement;

    expect(statusCell.textContent?.trim()).toBe('Analysed');
    expect(statusCell.querySelectorAll('p').length).toBe(1);
  });

  it('shows loaded-result context when no further page is available', () => {
    const pagination = fixture.nativeElement.querySelector('.games-pagination') as HTMLElement;
    expect(pagination.textContent).toContain('1 loaded');
    expect(pagination.textContent).toContain('All matching games loaded');
  });

  it('uses a single Analyse link for an unanalysed game', () => {
    const unanalysedGame = {
      ...game(),
      analysis: {
        status: 'NOT_ANALYZED' as const,
        whiteAccuracy: null,
        blackAccuracy: null,
        userAccuracy: null,
      },
    };
    let analysedGame: ImportedGameSearchItem | undefined;
    fixture.componentInstance.analyse.subscribe((candidate) => (analysedGame = candidate));
    fixture.componentRef.setInput('games', [unanalysedGame]);
    fixture.detectChanges();

    const analyseLink = fixture.nativeElement.querySelector(
      '.games-row-action-link',
    ) as HTMLAnchorElement;
    analyseLink.click();

    expect(analyseLink.textContent?.trim()).toBe('Analyse');
    expect(analysedGame).toBe(unanalysedGame);
    expect(fixture.nativeElement.querySelector('app-game-action-menu')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Open on Lichess');
  });
});

function game(): ImportedGameSearchItem {
  return {
    id: 42,
    provider: 'LICHESS',
    providerUrl: 'https://lichess.org/example',
    endedAt: '2026-07-27T12:00:00.000Z',
    speedCategory: 'rapid',
    rated: true,
    timeControl: { raw: null, initial: 600, increment: 5 },
    white: { username: 'WhitePlayer', rating: 1820 },
    black: { username: 'BlackPlayer', rating: 1785 },
    userColor: 'WHITE',
    resultForUser: 'WIN',
    opening: { eco: 'B20', name: 'Sicilian Defence' },
    tagCount: 2,
    plyIndex: { status: 'INDEXED' },
    analysis: {
      status: 'COMPLETED',
      whiteAccuracy: 87.2,
      blackAccuracy: 81.4,
      userAccuracy: 87.2,
    },
  };
}
