import { TestBed } from '@angular/core/testing';
import { PlayerChessProfileBreakdownComponent } from './player-chess-profile-breakdown.component';

describe('PlayerChessProfileBreakdownComponent', () => {
  it('uses pressed-button semantics and emits view and evidence intents', async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerChessProfileBreakdownComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(PlayerChessProfileBreakdownComponent);
    fixture.componentRef.setInput('activeView', 'PREFERENCE');
    fixture.componentRef.setInput('selectedDimension', 'CHARACTER');
    fixture.componentRef.setInput('preferenceItems', [{
      id: 'CHARACTER:DYNAMIC',
      dimension: 'CHARACTER',
      value: 'DYNAMIC',
      title: 'Dynamic',
      summary: '12 games · 60% exposure',
      exposurePercent: 60,
    }]);

    const views: string[] = [];
    const selections: unknown[] = [];
    fixture.componentInstance.viewChange.subscribe((view) => views.push(view));
    fixture.componentInstance.inspect.subscribe((selection) => selections.push(selection));
    fixture.detectChanges();

    const viewButtons = fixture.nativeElement.querySelectorAll('.profile-view-tabs button') as NodeListOf<HTMLButtonElement>;
    expect(viewButtons[0].getAttribute('aria-pressed')).toBe('true');
    expect(viewButtons[1].getAttribute('aria-pressed')).toBe('false');

    viewButtons[1].click();
    (fixture.nativeElement.querySelector('.profile-row-heading button') as HTMLButtonElement).click();

    expect(views).toEqual(['PERFORMANCE']);
    expect(selections).toEqual([{
      kind: 'PREFERENCE',
      dimension: 'CHARACTER',
      value: 'DYNAMIC',
    }]);
  });
});
