import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TrainingBasketPanelComponent } from './training-basket-panel.component';

describe('TrainingBasketPanelComponent', () => {
  let fixture: ComponentFixture<TrainingBasketPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrainingBasketPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TrainingBasketPanelComponent);
    fixture.componentRef.setInput('activeSublineCount', 12);
    fixture.componentRef.setInput('weakSublineCount', 2);
    fixture.componentRef.setInput('untrainedSublineCount', 0);
    fixture.componentRef.setInput('sourceLabel', '3 selected lines');
    fixture.componentRef.setInput('scope', 'SELECTED_LINES');
    fixture.componentRef.setInput('mode', 'WEAK_SUBLINES');
    fixture.componentRef.setInput('canUseCourseScope', true);
    fixture.componentRef.setInput('canUseChapterScope', true);
    fixture.componentRef.setInput('canUseSelectedLinesScope', true);
    fixture.componentRef.setInput('canStart', true);
    fixture.detectChanges();
  });

  it('uses a plain-language recap and one prototype-style start action', () => {
    const text = fixture.nativeElement.textContent?.replace(/\s+/g, ' ').trim();
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    const selectedScope = buttons.find((button) =>
      button.textContent?.includes('Selected lines'),
    );
    const selectedMode = buttons.find((button) => button.textContent?.trim() === 'Weak');
    const startButton = buttons.find((button) =>
      button.textContent?.includes('Start 2 sublines'),
    );
    const recap = Array.from(
      fixture.nativeElement.querySelectorAll('.session-recap div') as NodeListOf<HTMLElement>,
    ).map((item) => ({
      label: item.querySelector('dt')?.textContent?.trim(),
      value: item.querySelector('dd')?.textContent?.trim(),
    }));

    expect(text).toContain('Set your focus');
    expect(text).toContain('3 selected lines');
    expect(recap).toEqual([
      { label: 'Scope', value: 'Selected lines' },
      { label: 'Focus', value: 'Weak' },
      { label: 'Material', value: '2 sublines' },
    ]);
    expect(text).not.toContain('Coverage');
    expect(selectedScope?.getAttribute('aria-pressed')).toBe('true');
    expect(selectedMode?.getAttribute('aria-pressed')).toBe('true');
    expect(startButton?.textContent).toContain('▶');
    expect(startButton?.disabled).toBeFalse();
    expect(buttons.filter((button) => button.classList.contains('start-session')).length).toBe(1);
  });

  it('emits scope, mode, and start intents without owning navigation', () => {
    const scopes: string[] = [];
    const modes: string[] = [];
    const starts: Array<{ mode: string; scope: string }> = [];
    fixture.componentInstance.scopeChange.subscribe((scope) => scopes.push(scope));
    fixture.componentInstance.modeChange.subscribe((mode) => modes.push(mode));
    fixture.componentInstance.startMode.subscribe((start) => starts.push(start));

    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    buttons.find((button) => button.textContent?.includes('This section'))?.click();
    buttons.find((button) => button.textContent?.trim() === 'All')?.click();
    buttons.find((button) => button.textContent?.includes('Start 2 sublines'))?.click();

    expect(scopes).toEqual(['CHAPTER']);
    expect(modes).toEqual(['ALL']);
    expect(starts).toEqual([{ mode: 'WEAK_SUBLINES', scope: 'SELECTED_LINES' }]);
  });
});
