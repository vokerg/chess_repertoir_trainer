import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { Type } from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  AccountPerformanceStatsResponse,
  AccountRatingHistoryResponse,
  AccountRatingStatsResponse,
} from '../data-access/accounts.models';
import { AccountProfileEvidenceComponent } from './account-profile-evidence.component';
import { AccountProfileProgressComponent } from './account-profile-progress.component';
import { AccountProfileSignalCardsComponent } from './account-profile-signal-cards.component';

describe('account profile presentation components', () => {
  it('keeps all rating pools visible without fabricating a blended rating', async () => {
    const fixture = await createFixture(AccountProfileSignalCardsComponent);
    fixture.componentRef.setInput('stats', ratingStats());
    fixture.componentRef.setInput('history', ratingHistory());
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.signal-card').length).toBe(4);
    expect(fixture.nativeElement.querySelector('.signal-card')?.textContent).toContain('1,200');
    expect(fixture.nativeElement.querySelector('.signal-card')?.textContent).toContain('1,700');
    expect(
      fixture.nativeElement.querySelector('.signal-card:first-child .signal-value'),
    ).toBeNull();

    fixture.componentRef.setInput('selectedSpeed', 'blitz');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.signal-value')?.textContent).toContain('1,500');
  });

  it('switches between milestones and yearly highs', async () => {
    const fixture = await createFixture(AccountProfileProgressComponent);
    fixture.componentRef.setInput('stats', ratingStats());
    fixture.componentRef.setInput('selectedSpeed', 'blitz');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.milestone-list')?.textContent).toContain('1,400');
    expect(fixture.nativeElement.querySelector('.milestone-list')?.textContent).toContain('Blitz');
    expect(fixture.nativeElement.querySelector('.milestone-list')?.textContent).not.toContain(
      'Bullet',
    );

    const yearlyHighsButton = fixture.nativeElement.querySelectorAll(
      '.tab-control button',
    )[1] as HTMLButtonElement;
    yearlyHighsButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.highs-table')?.textContent).toContain('2026');
    expect(
      fixture.nativeElement.querySelector('.highs-table thead')?.textContent,
    ).toContain('Blitz');
    expect(
      fixture.nativeElement.querySelector('.highs-table thead')?.textContent,
    ).not.toContain('Bullet');
    expect(fixture.nativeElement.querySelector('.milestone-list')).toBeNull();
  });

  it('restores recent, victory, and defeat evidence in one tabbed section', async () => {
    const fixture = await createFixture(AccountProfileEvidenceComponent);
    fixture.componentRef.setInput('stats', performanceStats());
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('#profile-evidence-tab-recent')?.getAttribute('aria-controls'),
    ).toBe('profile-evidence-panel-recent');
    expect(
      fixture.nativeElement.querySelector('#profile-evidence-panel-recent')?.getAttribute('role'),
    ).toBe('tabpanel');
    expect(fixture.nativeElement.querySelector('.recent-list')?.textContent).toContain(
      'recent-opponent',
    );

    const tabs = fixture.nativeElement.querySelectorAll('.evidence-tabs button');
    (tabs[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.highlight-shell')?.textContent).toContain(
      'best-opponent',
    );

    (tabs[2] as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.highlight-shell')?.textContent).toContain(
      'defeat-opponent',
    );
  });
});

async function createFixture<T>(component: Type<T>): Promise<ComponentFixture<T>> {
  await TestBed.configureTestingModule({
    imports: [component],
    providers: [provideRouter([])],
  }).compileComponents();
  return TestBed.createComponent(component);
}

function ratingStats(): AccountRatingStatsResponse {
  return {
    account: { id: 7, provider: 'LICHESS', username: 'profile-user', displayName: null },
    computedAt: '2026-08-12T06:42:00Z',
    gamesCount: 12,
    data: {
      version: 3,
      ratingSource: 'gameRecordedRating',
      speeds: [
        speed('bullet', 'Bullet', 1200, 1300),
        speed('blitz', 'Blitz', 1500, 1600),
        speed('rapid', 'Rapid', 1700, 1800),
      ],
    },
  };
}

function speed(
  key: 'bullet' | 'blitz' | 'rapid',
  label: 'Bullet' | 'Blitz' | 'Rapid',
  current: number,
  highest: number,
) {
  return {
    key,
    label,
    gamesCount: 4,
    current: { rating: current, ratingAt: '2026-08-12T06:42:00Z', gameId: current },
    highest: { rating: highest, ratingAt: '2026-08-10T06:42:00Z', gameId: highest },
    yearlyHighs: [
      { year: 2026, rating: highest, ratingAt: '2026-08-10T06:42:00Z', gameId: highest },
    ],
    milestones: [
      { rating: 1400, actualRating: 1401, reachedAt: '2026-08-01T06:42:00Z', gameId: current },
    ],
  };
}

function ratingHistory(): AccountRatingHistoryResponse {
  return {
    account: { id: 7, provider: 'LICHESS', username: 'profile-user', displayName: null },
    bucket: 'day',
    aggregation: 'max',
    ratingSource: 'gameRecordedRating',
    series: [
      {
        key: 'blitz',
        label: 'Blitz',
        points: [
          { date: '2026-08-01', rating: 1450, gameCount: 1, ratingAt: '2026-08-01T06:42:00Z' },
          { date: '2026-08-12', rating: 1500, gameCount: 1, ratingAt: '2026-08-12T06:42:00Z' },
        ],
      },
    ],
    yDomain: { min: 1400, max: 1600 },
  };
}

function performanceStats(): AccountPerformanceStatsResponse {
  const highlight = (gameId: number, opponentUsername: string, result: 'WIN' | 'LOSS') => ({
    gameId,
    endedAt: '2026-08-12T06:42:00Z',
    speed: 'blitz' as const,
    userRating: 1500,
    opponentRating: result === 'WIN' ? 1800 : 1000,
    opponentUsername,
    providerUrl: null,
  });

  return {
    account: { id: 7, provider: 'LICHESS', username: 'profile-user' },
    range: {},
    speeds: ['bullet', 'blitz', 'rapid'],
    gamesCount: 3,
    wdl: { wins: 2, draws: 0, losses: 1 },
    averageOpponentRating: { overall: 1500, wins: 1750, draws: null, losses: 1000 },
    timeControlWdl: [
      { timeControl: '5+0', gamesCount: 3, wins: 2, draws: 0, losses: 1, scorePercent: 67 },
    ],
    recentGames: [
      { ...highlight(1, 'recent-opponent', 'WIN'), resultForUser: 'WIN', timeControl: '5+0' },
    ],
    bestVictories: [highlight(2, 'best-opponent', 'WIN')],
    mostEmbarrassingDefeats: [highlight(3, 'defeat-opponent', 'LOSS')],
    bestVictory: highlight(2, 'best-opponent', 'WIN'),
    mostEmbarrassingDefeat: highlight(3, 'defeat-opponent', 'LOSS'),
  };
}
