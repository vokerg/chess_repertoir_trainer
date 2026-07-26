import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { OpeningExplorerResponse } from '@chess-trainer/contracts/opening-explorer';
import { of } from 'rxjs';
import { LichessGamesExplorerApiService } from './lichess-games-explorer-api.service';
import { compactGameCount, exactGameCount } from './lichess-games-explorer.helpers';
import {
  defaultLichessGamesExplorerFilters,
  lichessRatingOptions,
  lichessSpeedOptions,
} from './lichess-games-explorer.models';
import { LichessGamesExplorerWidgetComponent } from './lichess-games-explorer-widget.component';

@Component({
  standalone: true,
  imports: [LichessGamesExplorerWidgetComponent],
  template: `
    <app-lichess-games-explorer-widget
      [fen]="fen()"
      (moveSelected)="selectedMove.set($event)"
    />
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
    api = jasmine.createSpyObj<LichessGamesExplorerApiService>(
      'LichessGamesExplorerApiService',
      ['getPosition'],
    );
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

  it('loads an unrestricted population by default and omits top games from the UI', () => {
    expect(api.getPosition).toHaveBeenCalledOnceWith(
      'startpos',
      defaultLichessGamesExplorerFilters(),
    );
    expect(text()).toContain('Peer games');
    expect(text()).toContain('10 games');
    expect(text()).not.toContain('Top games');
    expect(text()).not.toContain('Example White');
  });

  it('reloads when a speed scenario changes while keeping at least one speed selected', async () => {
    button('.peers-header button').click();
    fixture.detectChanges();

    const bullet = checkbox('Bullet');
    bullet.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const filters = api.getPosition.calls.mostRecent().args[1];
    expect(filters.speeds).not.toContain('bullet');
    expect(filters.speeds.length).toBe(lichessSpeedOptions.length - 1);
    expect(filters.ratings.length).toBe(lichessRatingOptions.length);
  });

  it('emits a selected next move', () => {
    button('.peers-move-row').click();
    expect(host.selectedMove()).toBe('e2e4');
  });

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function button(selector: string): HTMLButtonElement {
    const element = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(selector);
    if (!element) throw new Error(`Missing button: ${selector}`);
    return element;
  }

  function checkbox(label: string): HTMLInputElement {
    const labels = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLLabelElement>('label'),
    );
    const element = labels.find((candidate) => candidate.textContent?.trim() === label)
      ?.querySelector<HTMLInputElement>('input');
    if (!element) throw new Error(`Missing checkbox: ${label}`);
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
    moves: [{
      uci: 'e2e4',
      san: 'e4',
      averageRating: 1800,
      games: { total: 6, whiteWins: 3, draws: 2, blackWins: 1 },
      opening,
      representativeGame: null,
    }],
    topGames: [{
      id: 'hidden-game',
      moveUci: 'e2e4',
      winner: 'WHITE',
      white: { name: 'Example White', rating: 1900 },
      black: { name: 'Example Black', rating: 1800 },
      year: 2026,
      month: '2026-01',
    }],
    dataset: {
      source: 'LICHESS_GAMES',
      profileVersion: 1,
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
  };
}
