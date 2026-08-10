import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { OpeningExplorerResponse } from '@chess-trainer/contracts/opening-explorer';
import { of } from 'rxjs';
import { compactGameCount, exactGameCount } from '../games/game-count.helpers';
import { LichessGamesExplorerApiService } from './lichess-games-explorer-api.service';
import { defaultLichessGamesExplorerFilters } from './lichess-games-explorer.models';
import { LichessGamesExplorerWidgetComponent } from './lichess-games-explorer-widget.component';

@Component({
  standalone: true,
  imports: [LichessGamesExplorerWidgetComponent],
  template: `
    <app-lichess-games-explorer-widget [fen]="fen()" (moveSelected)="selectedMove.set($event)" />
  `,
})
class TestHostComponent {
  readonly fen = signal('startpos');
  readonly selectedMove = signal<string | null>(null);
}

describe('LichessGamesExplorerWidgetComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;
  let api: jasmine.SpyObj<LichessGamesExplorerApiService>;

  beforeEach(async () => {
    api = jasmine.createSpyObj<LichessGamesExplorerApiService>('LichessGamesExplorerApiService', [
      'getPosition',
    ]);
    api.getPosition.and.returnValue(of(response()));

    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [{ provide: LichessGamesExplorerApiService, useValue: api }],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('loads the default peer population and shows its resolved provenance', () => {
    expect(api.getPosition).toHaveBeenCalledOnceWith(
      'startpos',
      defaultLichessGamesExplorerFilters(),
    );
    expect(text()).toContain('Peer games');
    expect(text()).toContain('Blitz and slower · 1400–1799 · recent peer evidence');
    expect(text()).toContain('10 games');
    expect(text()).not.toContain('Top games');
    expect(text()).not.toContain('Example White');
  });

  it('reloads when the speed preset changes', async () => {
    button('.peers-header button').click();
    fixture.detectChanges();

    select('Time controls').value = 'BULLET';
    select('Time controls').dispatchEvent(new Event('change'));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(api.getPosition.calls.mostRecent().args[1]).toEqual({
      speedPreset: 'BULLET',
      ratingTarget: 'MY_PEERS_PLUS_ONE',
      ratingGroup: null,
    });
  });

  it('reloads with one explicit Lichess rating group', async () => {
    button('.peers-header button').click();
    fixture.detectChanges();

    select('Player level').value = 'GROUP:1800';
    select('Player level').dispatchEvent(new Event('change'));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(api.getPosition.calls.mostRecent().args[1]).toEqual({
      speedPreset: 'BLITZ_AND_SLOWER',
      ratingTarget: 'GROUP',
      ratingGroup: 1800,
    });
  });

  it('emits a selected next move', () => {
    button('.opening-explorer-move-row').click();
    expect(host.selectedMove()).toBe('e2e4');
  });

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function button(selector: string): HTMLButtonElement {
    const element = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      selector,
    );
    if (!element) throw new Error(`Missing button: ${selector}`);
    return element;
  }

  function select(label: string): HTMLSelectElement {
    const labels = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLLabelElement>('label'),
    );
    const element = labels
      .find((candidate) => candidate.textContent?.includes(label))
      ?.querySelector<HTMLSelectElement>('select');
    if (!element) throw new Error(`Missing select: ${label}`);
    return element;
  }
});

describe('peer game count formatting', () => {
  it('keeps small counts readable and compacts thousands and millions', () => {
    expect(compactGameCount(999)).toBe('999');
    expect(compactGameCount(964_731)).toBe('964.7K');
    expect(compactGameCount(41_419_407)).toBe('41.4M');
  });

  it('keeps an exact grouped value for tooltips', () => {
    expect(exactGameCount(41_419_407)).toBe('41,419,407');
  });
});

function response(): OpeningExplorerResponse {
  const opening = { eco: 'C20', name: "King's Pawn Game" };
  return {
    fen: 'startpos',
    normalizedFen: 'startpos',
    opening,
    games: { total: 10, whiteWins: 4, draws: 3, blackWins: 3 },
    moves: [
      {
        uci: 'e2e4',
        san: 'e4',
        averageRating: 1800,
        games: { total: 6, whiteWins: 3, draws: 2, blackWins: 1 },
        opening,
        representativeGame: null,
      },
    ],
    topGames: [
      {
        id: 'hidden-game',
        moveUci: 'e2e4',
        winner: 'WHITE',
        white: { name: 'Example White', rating: 1900 },
        black: { name: 'Example Black', rating: 1800 },
        year: 2026,
        month: '2026-01',
      },
    ],
    dataset: {
      source: 'LICHESS_GAMES',
      profileVersion: 666067204,
      sinceYear: 0,
      untilYear: 2026,
      movesLimit: 12,
      topGamesLimit: 0,
    },
    cache: {
      status: 'REFRESHED',
      fetchedAt: '2026-07-26T12:00:00.000Z',
      expiresAt: '2026-08-25T12:00:00.000Z',
    },
    population: {
      requested: {
        speedPreset: 'BLITZ_AND_SLOWER',
        ratingTarget: 'MY_PEERS_PLUS_ONE',
        ratingGroup: null,
      },
      effective: {
        speeds: ['blitz', 'classical', 'correspondence', 'rapid'],
        ratingGroups: [1400, 1600],
      },
      peerResolution: {
        evidencePeriod: 'RECENT_THREE_MONTHS',
        eligibleGames: 12,
        selectedGroups: [1400],
        distribution: [0, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2500].map((group) => ({
          group: group as 0 | 1000 | 1200 | 1400 | 1600 | 1800 | 2000 | 2200 | 2500,
          games: group === 1400 ? 12 : 0,
        })),
        contributions: [
          {
            accountId: 1,
            provider: 'LICHESS',
            username: 'player',
            speed: 'blitz',
            games: 12,
          },
        ],
        normalizationProfile: {
          id: 'universal-online-strength',
          version: '2026-07-lichess-bands-v1',
        },
        resolverPolicyVersion: 'dominant-contiguous-window-v1',
      },
    },
  };
}
