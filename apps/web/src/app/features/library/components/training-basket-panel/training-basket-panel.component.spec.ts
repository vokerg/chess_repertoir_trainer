import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TrainingBasketPanelComponent } from './training-basket-panel.component';

describe('TrainingBasketPanelComponent', () => {
  let fixture: ComponentFixture<TrainingBasketPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrainingBasketPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TrainingBasketPanelComponent);
    fixture.componentRef.setInput('stepLabel', '4');
    fixture.componentRef.setInput('lineCountLabel', 'Lines');
    fixture.componentRef.setInput('lineCount', 3);
    fixture.componentRef.setInput('activeSublineCount', 12);
    fixture.componentRef.setInput('recentAttempts', 20);
    fixture.componentRef.setInput('weakSublineCount', 2);
    fixture.componentRef.setInput('untrainedSublineCount', 0);
    fixture.componentRef.setInput('coverageLabel', '9/12');
    fixture.componentRef.setInput('masteryLabel', '73%');
    fixture.componentRef.setInput('sourceLabel', '3 selected lines');
    fixture.componentRef.setInput('scope', 'SELECTED_LINES');
    fixture.componentRef.setInput('canUseCourseScope', true);
    fixture.componentRef.setInput('canUseChapterScope', true);
    fixture.componentRef.setInput('canUseSelectedLinesScope', true);
    fixture.componentRef.setInput('canStart', true);
    fixture.detectChanges();
  });

  it('shows the selected scope, health, and mode availability', () => {
    const text = fixture.nativeElement.textContent?.replace(/\s+/g, ' ').trim();
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    const stats = Array.from(
      fixture.nativeElement.querySelectorAll('.basket-stat-row'),
    ).map((stat) => ({
      label: stat.querySelector('dt')?.textContent?.trim(),
      value: stat.querySelector('dd')?.textContent?.trim(),
    }));
    const selectedScope = buttons.find((button) => button.textContent?.trim() === 'Selected');
    const weakButton = buttons.find((button) => button.textContent?.trim() === 'Train weak');
    const untrainedButton = buttons.find(
      (button) => button.textContent?.trim() === 'Train untrained',
    );

    expect(text).toContain('Training plan');
    expect(text).toContain('3 selected lines');
    expect(text).toContain('Coverage 9/12 · Mastery 73%');
    expect(stats).toContain({ label: 'Lines', value: '3' });
    expect(stats).toContain({ label: 'Sublines', value: '12' });
    expect(selectedScope?.getAttribute('aria-pressed')).toBe('true');
    expect(weakButton?.disabled).toBeFalse();
    expect(untrainedButton?.disabled).toBeTrue();
  });

  it('emits scope and start commands without owning navigation', () => {
    const scopes: string[] = [];
    const starts: Array<{ mode: string; scope: string }> = [];
    fixture.componentInstance.scopeChange.subscribe((scope) => scopes.push(scope));
    fixture.componentInstance.startMode.subscribe((start) => starts.push(start));

    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    buttons.find((button) => button.textContent?.trim() === 'Section')?.click();
    buttons.find((button) => button.textContent?.trim() === 'Train weak')?.click();

    expect(scopes).toEqual(['CHAPTER']);
    expect(starts).toEqual([{ mode: 'WEAK_SUBLINES', scope: 'SELECTED_LINES' }]);
  });
});
