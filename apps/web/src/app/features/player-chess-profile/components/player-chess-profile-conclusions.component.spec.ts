import { TestBed } from '@angular/core/testing';
import { PlayerChessProfileConclusionsComponent } from './player-chess-profile-conclusions.component';

describe('PlayerChessProfileConclusionsComponent', () => {
  it('renders evidence wording and emits the selected conclusion index', async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerChessProfileConclusionsComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(PlayerChessProfileConclusionsComponent);
    fixture.componentRef.setInput('conclusions', [{
      id: '0:PERFORMS_BETTER:CHARACTER:DYNAMIC',
      index: 0,
      summary: 'Dynamic openings scored above baseline.',
      sampleLabel: '20 games',
      metricLabel: '58%',
      evidenceLabel: 'Medium evidence',
      kindLabel: 'Above baseline',
      positive: true,
      negative: false,
    }]);
    const selected: number[] = [];
    fixture.componentInstance.selectConclusion.subscribe((index) => selected.push(index));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Medium evidence');
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    expect(selected).toEqual([0]);
  });
});
