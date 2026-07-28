import { TestBed } from '@angular/core/testing';
import { PlayerChessProfileFilterBarComponent } from './player-chess-profile-filter-bar.component';

describe('PlayerChessProfileFilterBarComponent', () => {
  it('renders account view models and emits filter intents', async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerChessProfileFilterBarComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(PlayerChessProfileFilterBarComponent);
    fixture.componentRef.setInput('filters', {
      period: '3M',
      from: '2026-04-28',
      to: '2026-07-28',
      accountIds: [4],
      speedPreset: 'BLITZ_AND_SLOWER',
      colors: ['WHITE', 'BLACK'],
      rated: true,
      minUserRating: null,
      maxUserRating: null,
      minOpponentRating: null,
      maxOpponentRating: null,
    });
    fixture.componentRef.setInput('accounts', [{
      id: 4,
      label: 'Player · Lichess',
      selected: true,
    }]);

    const accountIds: number[] = [];
    let recalculations = 0;
    fixture.componentInstance.accountToggle.subscribe((accountId) => accountIds.push(accountId));
    fixture.componentInstance.recalculate.subscribe(() => recalculations += 1);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Player · Lichess');

    const accountInputs = fixture.nativeElement.querySelectorAll(
      '.profile-picker-panel input[type="checkbox"]',
    ) as NodeListOf<HTMLInputElement>;
    accountInputs[1].dispatchEvent(new Event('change'));
    (fixture.nativeElement.querySelector('.profile-recalculate') as HTMLButtonElement).click();

    expect(accountIds).toEqual([4]);
    expect(recalculations).toBe(1);
  });
});
