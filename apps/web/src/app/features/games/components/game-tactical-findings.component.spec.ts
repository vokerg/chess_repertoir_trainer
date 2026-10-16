import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { GameTacticalFinding } from '../data-access/game-tactical-findings-api.service';
import { GameTacticalFindingsComponent } from './game-tactical-findings.component';

describe('GameTacticalFindingsComponent', () => {
  let fixture: ComponentFixture<GameTacticalFindingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameTacticalFindingsComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(GameTacticalFindingsComponent);
    fixture.componentRef.setInput('gameId', 7);
    fixture.detectChanges();
  });

  it('renders each finding, but only missed shots and user blunders are trainable', () => {
    fixture.componentRef.setInput('findings', [
      finding(11, 'MISSED_SHOT', 11, 'e4d5', 'e4e5', 180),
      finding(12, 'PUNISHED_OPPONENT_BLUNDER', 12, 'd8d5', null, null),
      finding(13, 'USER_BLUNDER', 18, 'g1f3', 'd2d4', 0),
    ]);
    fixture.detectChanges();

    const rows = Array.from(root().querySelectorAll<HTMLElement>('.finding-row'));
    expect(rows.length).toBe(3);
    expect(rows[0].textContent).toContain('Missed shot');
    expect(rows[0].textContent).toContain('6 · e4d5');
    expect(rows[0].textContent).toContain('Best e4e5');
    expect(rows[0].textContent).toContain('180 cp swing');
    expect(rows[1].textContent).toContain('Punished blunder');
    expect(rows[1].textContent).not.toContain('Best');
    expect(rows[1].textContent).not.toContain('cp swing');
    expect(rows[2].textContent).toContain('My blunder');
    expect(rows[2].textContent).toContain('9 · g1f3');
    expect(rows[2].textContent).toContain('0 cp swing');

    const links = Array.from(root().querySelectorAll<HTMLAnchorElement>('a'));
    expect(links.length).toBe(3);
    expect(links[0].textContent).toContain('Train game findings (2)');
    expect(links[0].getAttribute('href')).toBe('/scenario-training/tactical-game?gameId=7');
    expect(links[1].getAttribute('href')).toBe('/scenario-training/tactical-game?gameId=7&detectionId=11');
    expect(links[2].getAttribute('href')).toBe('/scenario-training/tactical-game?gameId=7&detectionId=13');
    expect(rows[1].querySelector('a')).toBeNull();
  });

  it('emits the selected ply without changing the input findings', () => {
    const items = [finding(20, 'PUNISHED_OPPONENT_BLUNDER', 22, 'e7e5', null, -35)];
    fixture.componentRef.setInput('findings', items);
    fixture.detectChanges();
    const selected: number[] = [];
    fixture.componentInstance.moveSelected.subscribe((ply) => selected.push(ply));

    expect(root().querySelector('a')).toBeNull();
    root().querySelector<HTMLButtonElement>('.finding-row button')!.click();

    expect(selected).toEqual([22]);
    expect(items[0].triggerPlyNumber).toBe(22);
  });

  it('shows loading before errors, supports retry, and restores findings on recovery', () => {
    fixture.componentRef.setInput('findings', [
      finding(21, 'MISSED_SHOT', 7, 'c3d4', 'e3d4', 95),
    ]);
    fixture.componentRef.setInput('loading', true);
    fixture.componentRef.setInput('error', 'Unable to fetch findings');
    fixture.detectChanges();

    expect(root().textContent).toContain('Loading tactical findings...');
    expect(root().textContent).not.toContain('Unable to fetch findings');
    expect(root().querySelector('.finding-row')).toBeNull();

    fixture.componentRef.setInput('loading', false);
    fixture.detectChanges();
    const retry = root().querySelector<HTMLButtonElement>('.finding-error button')!;
    expect(root().textContent).toContain('Unable to fetch findings');
    expect(root().querySelector('.finding-row')).toBeNull();
    let retryCount = 0;
    fixture.componentInstance.retry.subscribe(() => retryCount++);
    retry.click();
    expect(retryCount).toBe(1);

    fixture.componentRef.setInput('error', null);
    fixture.detectChanges();
    expect(root().querySelectorAll('.finding-row').length).toBe(1);
    expect(root().querySelector('.finding-error')).toBeNull();
  });

  function root(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }
});

function finding(
  id: number,
  kind: GameTacticalFinding['kind'],
  triggerPlyNumber: number,
  moveUci: string,
  bestMoveUci: string | null,
  swingCp: number | null,
): GameTacticalFinding {
  return {
    id,
    importedGameId: 7,
    kind,
    triggerPlyNumber,
    userReplyPlyNumber: null,
    moveUci,
    bestMoveUci,
    swingCp,
  };
}
