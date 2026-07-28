import { TestBed } from '@angular/core/testing';
import { PlayerChessProfileConclusionsComponent } from './player-chess-profile-conclusions.component';

describe('PlayerChessProfileConclusionsComponent', () => {
  it('renders evidence wording and emits the selected conclusion index', async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerChessProfileConclusionsComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(PlayerChessProfileConclusionsComponent);
    fixture.componentRef.setInput('conclusions', [{
      code: 'PERFORMS_BETTER',
      dimension: 'CHARACTER',
      value: 'DYNAMIC',
      metric: 'SCORE_PERCENT',
      sampleSize: 20,
      metricValue: 58,
      baselineValue: 50,
      delta: 8,
      evidenceStrength: 'MEDIUM',
      summary: 'Dynamic openings scored above baseline.',
    }]);
    const selected: number[] = [];
    fixture.componentInstance.selectConclusion.subscribe((index) => selected.push(index));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Medium evidence');
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    expect(selected).toEqual([0]);
  });
});
