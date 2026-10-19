import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { OpeningStruggleItem } from '../data-access/opening-struggles.models';
import { OpeningStruggleCoverageComponent } from './opening-struggle-coverage.component';

describe('OpeningStruggleCoverageComponent', () => {
  let fixture: ComponentFixture<OpeningStruggleCoverageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OpeningStruggleCoverageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(OpeningStruggleCoverageComponent);
    fixture.componentRef.setInput('item', struggle());
    fixture.detectChanges();
  });

  it('links the icon to an accessible, line-specific course explanation', () => {
    fixture.componentRef.setInput('item', struggle({
      key: 'WHITE:e2e4 e7e5/g1f3',
      courseCoverage: {
        status: 'MY_DEVIATION',
        coveredPlies: 2,
        deviationPly: 3,
        courses: [{ id: 7, name: 'Open Games' }],
        expectedMoveSans: ['Bb5'],
      },
    }));
    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector('button.coverage-icon') as HTMLButtonElement;
    const tooltip = fixture.nativeElement.querySelector('.coverage-popover') as HTMLElement;

    expect(trigger.type).toBe('button');
    expect(trigger.classList.contains('my_deviation')).toBeTrue();
    expect(trigger.getAttribute('aria-describedby')).toBe('course-coverage-WHITE-e2e4-e7e5-g1f3');
    expect(trigger.getAttribute('popovertarget')).toBe(tooltip.id);
    expect(tooltip.id).toBe(trigger.getAttribute('aria-describedby'));
    expect(tooltip.getAttribute('role')).toBe('tooltip');
    expect(tooltip.getAttribute('popover')).toBe('auto');
    expect(trigger.getAttribute('aria-label')).toBe(
      'Course coverage: Your deviation. Your move 2. Nf3 leaves the course. Expected: Bb5. Course: Open Games.',
    );
    expect(tooltip.textContent).toContain('Your deviation');
    expect(tooltip.textContent).toContain('Expected: Bb5.');
    expect(tooltip.textContent).toContain('2 covered plies');
  });

  it('updates all five coverage states without retaining stale explanations or icons', () => {
    const cases = [
      { status: 'COVERED', icon: '✓', label: 'Covered', explanation: 'Covered by courses through the full line.' },
      { status: 'MY_DEVIATION', icon: '↗', label: 'Your deviation', explanation: 'Your move leaves the course.' },
      { status: 'OPPONENT_UNCOVERED', icon: '?', label: 'Opponent move uncovered', explanation: 'The opponent move is not covered.' },
      { status: 'REPERTOIRE_ENDED', icon: '■', label: 'Repertoire ended', explanation: 'The stored repertoire ends before this line ends.' },
      { status: 'NOT_COVERED', icon: '○', label: 'Not covered', explanation: 'Not covered by your courses.' },
    ] as const;

    for (const entry of cases) {
      fixture.componentRef.setInput('item', struggle({
        courseCoverage: {
          status: entry.status,
          coveredPlies: 0,
          deviationPly: null,
          courses: [],
          expectedMoveSans: [],
        },
      }));
      fixture.detectChanges();

      const trigger = fixture.nativeElement.querySelector('button.coverage-icon') as HTMLButtonElement;
      const tooltip = fixture.nativeElement.querySelector('.coverage-popover') as HTMLElement;

      expect(trigger.classList.contains(entry.status.toLowerCase())).toBeTrue();
      expect(trigger.querySelector('span')?.textContent).toBe(entry.icon);
      expect(trigger.getAttribute('aria-label')).toBe(
        `Course coverage: ${entry.label}. ${entry.explanation}`,
      );
      expect(tooltip.querySelector('strong')?.textContent).toBe(entry.label);
      expect(tooltip.querySelector('p')?.textContent).toBe(entry.explanation);
      expect(tooltip.querySelector('small')?.textContent).toBe('0 covered plies');
    }
  });

  it('opens on mouse hover but not touch or pen input', () => {
    const trigger = fixture.nativeElement.querySelector('button.coverage-icon') as HTMLButtonElement;
    const tooltip = fixture.nativeElement.querySelector('.coverage-popover') as HTMLElement;
    const show = jasmine.createSpy('showPopover');
    Object.defineProperty(tooltip, 'showPopover', { configurable: true, value: show });
    spyOn(tooltip, 'matches').and.returnValue(false);

    trigger.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'touch' }));
    trigger.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'pen' }));
    expect(show).not.toHaveBeenCalled();

    trigger.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    expect(show).toHaveBeenCalledTimes(1);
  });

  it('does not hide a focused tooltip trigger when the mouse leaves', () => {
    const trigger = fixture.nativeElement.querySelector('button.coverage-icon') as HTMLButtonElement;
    const tooltip = fixture.nativeElement.querySelector('.coverage-popover') as HTMLElement;
    const hide = jasmine.createSpy('hidePopover');
    Object.defineProperty(tooltip, 'hidePopover', { configurable: true, value: hide });
    spyOn(tooltip, 'matches').and.returnValue(true);

    trigger.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'touch' }));
    expect(hide).not.toHaveBeenCalled();

    trigger.focus();
    expect(document.activeElement).toBe(trigger);
    trigger.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
    expect(hide).not.toHaveBeenCalled();

    trigger.blur();
    trigger.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
    expect(hide).toHaveBeenCalledTimes(1);
  });

  it('keeps an open tooltip within the viewport near the lower-right corner', () => {
    const trigger = fixture.nativeElement.querySelector('button.coverage-icon') as HTMLButtonElement;
    const tooltip = fixture.nativeElement.querySelector('.coverage-popover') as HTMLElement;
    const top = window.innerHeight - 36;
    spyOn(trigger, 'getBoundingClientRect').and.returnValue(
      new DOMRect(window.innerWidth - 36, top, 24, 24),
    );
    Object.defineProperty(tooltip, 'offsetHeight', { configurable: true, value: 96 });
    spyOn(tooltip, 'matches').and.returnValue(true);

    tooltip.dispatchEvent(new Event('toggle'));

    const width = Math.min(304, window.innerWidth - 24);
    expect(tooltip.style.width).toBe(`${width}px`);
    expect(parseFloat(tooltip.style.left)).toBeGreaterThanOrEqual(12);
    expect(parseFloat(tooltip.style.left) + width).toBeLessThanOrEqual(window.innerWidth - 12);
    expect(parseFloat(tooltip.style.top)).toBe(top - 96 - 8);
  });
});

function struggle(overrides: Partial<OpeningStruggleItem> = {}): OpeningStruggleItem {
  return {
    key: 'WHITE:e2e4 e7e5 g1f3',
    parentKey: 'WHITE:e2e4 e7e5',
    userColor: 'WHITE',
    movesUci: ['e2e4', 'e7e5', 'g1f3'],
    ply: 3,
    analysisGameId: 42,
    totalReachGames: 5,
    metricGames: 5,
    wins: 0,
    draws: 0,
    losses: 5,
    winRate: 0,
    lossRate: 100,
    scorePct: 0,
    analysedMoveCount: 5,
    averageCentipawnLoss: 125,
    evalGames: 5,
    avgUserEvalCp: -154,
    bestUserEvalCp: -120,
    worstUserEvalCp: -200,
    afterPositionAnalysisId: 7,
    afterPositionNormalizedFen: 'after-position',
    afterPositionBestScoreCpWhite: -154,
    afterPositionBestMateWhite: null,
    courseCoverage: {
      status: 'NOT_COVERED',
      coveredPlies: 0,
      deviationPly: null,
      courses: [],
      expectedMoveSans: [],
    },
    ...overrides,
  };
}
