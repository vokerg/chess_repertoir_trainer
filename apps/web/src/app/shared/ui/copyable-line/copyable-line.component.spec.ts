import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CopyableLineComponent } from './copyable-line.component';

describe('CopyableLineComponent', () => {
  let fixture: ComponentFixture<CopyableLineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CopyableLineComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(CopyableLineComponent);
    fixture.componentRef.setInput('line', 'd4 d5 c4');
    fixture.componentRef.setInput('name', 'Line');
    fixture.componentRef.setInput('label', 'Copy');
    fixture.componentRef.setInput('trail', true);
    fixture.componentRef.setInput('currentSegment', 3);
    fixture.componentRef.setInput('segments', [
      { id: '1-d2d4', label: 'd4', index: 1 },
      { id: '2-d7d5', label: 'd5', index: 2 },
      { id: '3-c2c4', label: 'c4', index: 3 },
    ]);
    fixture.componentRef.setInput('link', ['/analysis']);
    fixture.componentRef.setInput('queryParams', { moves: 'd2d4,d7d5,c2c4' });
    fixture.detectChanges();
  });

  it('renders a copyable, analysis-linked move trail with the current segment identified', () => {
    const moves = moveButtons();
    const openLink = fixture.nativeElement.querySelector('.line-trail-open') as HTMLAnchorElement | null;

    expect(moves.map((move) => move.textContent?.trim())).toEqual(['d4', 'd5', 'c4']);
    expect(moves[2].getAttribute('aria-current')).toBe('step');
    expect(fixture.nativeElement.querySelector('app-copy-button')).not.toBeNull();
    expect(openLink?.getAttribute('href')).toContain('/analysis?moves=d2d4,d7d5,c2c4');
  });

  it('emits earlier segment selections and ignores the already-current segment', () => {
    const selected: number[] = [];
    fixture.componentInstance.segmentSelected.subscribe((index) => selected.push(index));
    const moves = moveButtons();

    moves[0].click();
    moves[2].click();

    expect(selected).toEqual([1]);
  });

  it('keeps the compact trail treatment at the start position', () => {
    fixture.componentRef.setInput('segments', []);
    fixture.componentRef.setInput('currentSegment', 0);
    fixture.componentRef.setInput('line', 'Start position');
    fixture.detectChanges();

    expect(moveButtons()).toEqual([]);
    expect(fixture.nativeElement.querySelector('.line-trail-empty').textContent.trim())
      .toBe('Start position');
  });

  function moveButtons(): HTMLButtonElement[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll('.line-trail button') as NodeListOf<HTMLButtonElement>,
    );
  }
});
