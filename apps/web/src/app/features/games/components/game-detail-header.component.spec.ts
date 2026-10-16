import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { ImportedGameDetail } from '../data-access/games.models';
import { GameDetailHeaderComponent } from './game-detail-header.component';

describe('GameDetailHeaderComponent', () => {
  let fixture: ComponentFixture<GameDetailHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameDetailHeaderComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(GameDetailHeaderComponent);
    fixture.componentRef.setInput('title', 'Game against example');
    fixture.detectChanges();
  });

  it('shows the breadcrumb and title but no game actions until a game exists', () => {
    expect(root().querySelector<HTMLAnchorElement>('.workbench-breadcrumb')?.getAttribute('href'))
      .toBe('/games');
    expect(root().querySelector('h2')?.textContent).toContain('Game against example');
    expect(actionButtons()).toEqual([]);
    expect(root().querySelector('.workbench-meta')).toBeNull();
    expect(root().querySelector('a[target="_blank"]')).toBeNull();
  });

  it('presents imported-game context and links safely to the source game', () => {
    fixture.componentRef.setInput('game', game());
    fixture.detectChanges();

    const metadata = root().querySelector('.workbench-meta')?.textContent ?? '';
    expect(metadata).toContain('Lichess');
    expect(metadata).toContain('Rated');
    expect(metadata).toContain('blitz');
    expect(metadata).toContain('3+2');

    const sourceLink = root().querySelector<HTMLAnchorElement>('a[target="_blank"]')!;
    expect(sourceLink.getAttribute('href')).toBe('https://lichess.org/abc123');
    expect(sourceLink.textContent).toContain('Open on Lichess');
    expect(sourceLink.getAttribute('rel')).toContain('noreferrer');
  });

  it('emits full-refresh intent only when the control is available', () => {
    fixture.componentRef.setInput('game', game());
    fixture.detectChanges();
    let refreshCount = 0;
    fixture.componentInstance.fullRefresh.subscribe(() => refreshCount++);

    const refresh = actionButtons()[0];
    expect(refresh.textContent).toContain('Full refresh');
    expect(refresh.disabled).toBeFalse();
    refresh.click();
    expect(refreshCount).toBe(1);

    fixture.componentRef.setInput('fullRefreshing', true);
    fixture.detectChanges();
    expect(refresh.disabled).toBeTrue();
    expect(refresh.textContent).toContain('Game workflow in background...');
    refresh.click();
    expect(refreshCount).toBe(1);
  });

  it('gates AI review by availability and request state without changing the command', () => {
    fixture.componentRef.setInput('game', game());
    fixture.detectChanges();
    expect(actionButtons().length).toBe(1);

    fixture.componentRef.setInput('aiReviewAvailable', true);
    fixture.detectChanges();
    const review = actionButtons()[1];
    let reviewCount = 0;
    fixture.componentInstance.generateAiReview.subscribe(() => reviewCount++);
    expect(review.textContent).toContain('Generate AI overview');
    expect(review.disabled).toBeFalse();
    review.click();
    expect(reviewCount).toBe(1);

    fixture.componentRef.setInput('aiReviewGenerated', true);
    fixture.detectChanges();
    expect(review.textContent).toContain('Regenerate AI overview');

    fixture.componentRef.setInput('aiReviewLoading', true);
    fixture.detectChanges();
    expect(review.textContent).toContain('Loading saved AI overview...');
    expect(review.disabled).toBeTrue();
    review.click();
    expect(reviewCount).toBe(1);

    fixture.componentRef.setInput('aiReviewLoading', false);
    fixture.componentRef.setInput('aiReviewGenerating', true);
    fixture.detectChanges();
    expect(review.textContent).toContain('Generating AI overview...');
    expect(review.disabled).toBeTrue();

    fixture.componentRef.setInput('aiReviewGenerating', false);
    fixture.componentRef.setInput('aiReviewDisabled', true);
    fixture.detectChanges();
    expect(review.disabled).toBeTrue();
    expect(reviewCount).toBe(1);
  });

  it('handles unknown metadata and omits missing external links', () => {
    fixture.componentRef.setInput('game', game({
      providerUrl: null,
      rated: null,
      speedCategory: null,
      endedAt: null,
    }));
    fixture.detectChanges();

    const metadata = root().querySelector('.workbench-meta')?.textContent ?? '';
    expect(metadata).toContain('Date unknown');
    expect(metadata).toContain('Rating unknown');
    expect(metadata).toContain('unknown speed');
    expect(root().querySelector('a[target="_blank"]')).toBeNull();
  });

  function root(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function actionButtons(): HTMLButtonElement[] {
    return Array.from(root().querySelectorAll<HTMLButtonElement>('button.game-header-action'));
  }
});

function game(overrides: Partial<ImportedGameDetail> = {}): ImportedGameDetail {
  return {
    id: 7,
    accountId: 1,
    provider: 'LICHESS',
    providerGameId: 'abc123',
    providerUrl: 'https://lichess.org/abc123',
    startedAt: null,
    endedAt: '2026-07-19T14:00:00.000Z',
    speedCategory: 'blitz',
    rated: true,
    variant: 'standard',
    timeControl: { raw: '180+2', initial: 180, increment: 2 },
    white: { username: 'me', rating: 1500 },
    black: { username: 'opponent', rating: 1600 },
    userColor: 'WHITE',
    opponentUsername: 'opponent',
    result: '1-0',
    resultForUser: 'WIN',
    status: null,
    opening: { eco: 'B01', name: 'Scandinavian Defense' },
    tagCodes: [],
    tags: [],
    plyIndex: { status: 'INDEXED', indexedAt: null, error: null },
    analysis: {
      status: 'COMPLETED',
      runId: null,
      depth: null,
      completedAt: null,
      createdAt: null,
      whiteAccuracy: null,
      blackAccuracy: null,
      userAccuracy: null,
      summary: null,
      criticalMoveCount: null,
    },
    pgn: null,
    plies: [],
    createdAt: '2026-07-19T14:00:00.000Z',
    updatedAt: '2026-07-19T14:00:00.000Z',
    ...overrides,
  };
}
