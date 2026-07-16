import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { MastersExplorerResponse } from '@chess-trainer/contracts/masters-explorer';
import { Subject, of, throwError } from 'rxjs';
import { MastersExplorerApiService } from './masters-explorer-api.service';
import {
  gameResultLabel,
  percentage,
} from './masters-explorer.helpers';
import { MastersExplorerWidgetComponent } from './masters-explorer-widget.component';

@Component({
  standalone: true,
  imports: [MastersExplorerWidgetComponent],
  template: `
    @if (visible()) {
      <app-masters-explorer-widget
        [fen]="fen()"
        (moveSelected)="selectedMove.set($event)"
      />
    }
  `,
})
class TestHostComponent {
  readonly visible = signal(false);
  readonly fen = signal('startpos');
  readonly selectedMove = signal<string | null>(null);
}

describe('MastersExplorerWidgetComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;
  let api: jasmine.SpyObj<MastersExplorerApiService>;

  beforeEach(async () => {
    api = jasmine.createSpyObj<MastersExplorerApiService>('MastersExplorerApiService', [
      'getPosition',
    ]);
    api.getPosition.and.returnValue(of(responseFor('startpos')));

    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [{ provide: MastersExplorerApiService, useValue: api }],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('does not request data before the parent renders the widget', () => {
    expect(api.getPosition).not.toHaveBeenCalled();
  });

  it('stops reacting to FEN changes after the parent hides the widget', async () => {
    host.visible.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(api.getPosition).toHaveBeenCalledTimes(1);

    host.visible.set(false);
    fixture.detectChanges();
    host.fen.set('hidden-fen');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(api.getPosition).toHaveBeenCalledTimes(1);
  });

  it('requests the current FEN when rendered and requests again when the FEN changes', async () => {
    host.visible.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(api.getPosition).toHaveBeenCalledOnceWith('startpos');

    api.getPosition.and.returnValue(of(responseFor('next-fen', { openingName: 'French Defense' })));
    host.fen.set('next-fen');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.getPosition).toHaveBeenCalledWith('next-fen');
    expect(text()).toContain('French Defense');
  });

  it('does not allow an older response to overwrite a newer FEN result', async () => {
    const oldRequest = new Subject<MastersExplorerResponse>();
    const newRequest = new Subject<MastersExplorerResponse>();
    api.getPosition.and.returnValues(oldRequest, newRequest);

    host.visible.set(true);
    fixture.detectChanges();
    host.fen.set('new-fen');
    fixture.detectChanges();

    newRequest.next(responseFor('new-fen', { openingName: 'Fresh opening' }));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(text()).toContain('Fresh opening');

    oldRequest.next(responseFor('startpos', { openingName: 'Stale opening' }));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(text()).toContain('Fresh opening');
    expect(text()).not.toContain('Stale opening');
  });

  it('emits the selected move UCI', async () => {
    host.visible.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    button('.masters-move-row').click();

    expect(host.selectedMove()).toBe('e2e4');
  });

  it('shows drawn games with the expected result label', async () => {
    host.visible.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(text()).toContain('½–½');
  });

  it('shows the stale-data warning', async () => {
    api.getPosition.and.returnValue(of(responseFor('startpos', { cacheStatus: 'STALE' })));
    host.visible.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(text()).toContain(
      'Showing cached Masters data because Lichess is temporarily unavailable.',
    );
  });

  it('shows the no-games state', async () => {
    api.getPosition.and.returnValue(of(responseFor('startpos', { empty: true })));
    host.visible.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(text()).toContain('No master games found for this position.');
  });

  it('shows an API error and retries the request for the same FEN', async () => {
    api.getPosition.and.returnValues(
      throwError(() => ({ error: { error: 'Masters service unavailable.' } })),
      of(responseFor('startpos')),
    );
    host.visible.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(text()).toContain('Masters service unavailable.');

    button('.masters-error button').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.getPosition).toHaveBeenCalledTimes(2);
    expect(text()).toContain('Position results');
  });

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function button(selector: string): HTMLButtonElement {
    const element = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(selector);
    if (!element) throw new Error(`Missing button: ${selector}`);
    return element;
  }
});

describe('Masters explorer helpers', () => {
  it('returns zero percentages for a zero total', () => {
    expect(percentage(0, 0)).toBe(0);
    expect(percentage(5, 0)).toBe(0);
  });

  it('formats draws with the chess result glyphs', () => {
    expect(gameResultLabel(null)).toBe('½–½');
  });
});

function responseFor(
  fen: string,
  options: {
    openingName?: string;
    cacheStatus?: 'HIT' | 'REFRESHED' | 'STALE';
    empty?: boolean;
  } = {},
): MastersExplorerResponse {
  const games = options.empty
    ? { total: 0, whiteWins: 0, draws: 0, blackWins: 0 }
    : { total: 10, whiteWins: 4, draws: 3, blackWins: 3 };
  const opening = { eco: 'C20', name: options.openingName ?? "King's Pawn Game" };

  return {
    fen,
    normalizedFen: fen,
    opening,
    games,
    moves: options.empty
      ? []
      : [
          {
            uci: 'e2e4',
            san: 'e4',
            averageRating: 2520,
            games: { total: 6, whiteWins: 3, draws: 2, blackWins: 1 },
            opening,
            representativeGame: null,
          },
        ],
    topGames: options.empty
      ? []
      : [
          {
            id: 'master-game',
            moveUci: 'e2e4',
            winner: null,
            white: { name: 'White Player', rating: 2600 },
            black: { name: 'Black Player', rating: null },
            year: 2025,
            month: '2025-05',
          },
        ],
    dataset: {
      source: 'LICHESS_MASTERS',
      profileVersion: 1,
      sinceYear: 2000,
      untilYear: 2025,
      movesLimit: 20,
      topGamesLimit: 15,
    },
    cache: {
      status: options.cacheStatus ?? 'HIT',
      fetchedAt: '2026-07-16T10:00:00.000Z',
      expiresAt: '2026-07-17T10:00:00.000Z',
    },
  };
}
