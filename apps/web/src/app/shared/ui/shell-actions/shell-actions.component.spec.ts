import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { UiShellAction } from '../ui-shell.model';
import { ShellActionsComponent } from './shell-actions.component';

describe('ShellActionsComponent', () => {
  let fixture: ComponentFixture<ShellActionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShellActionsComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(ShellActionsComponent);
  });

  it('renders stable toggle labels with aria-pressed and distinct on/off styling', () => {
    const run = jasmine.createSpy('run');
    const actions: UiShellAction[] = [
      { id: 'games', kind: 'toggle', label: 'My games', pressed: false, run },
      { id: 'engine', kind: 'toggle', label: 'Engine', pressed: true, run },
      { id: 'challenge', label: 'Challenge bot', run },
    ];
    fixture.componentRef.setInput('actions', actions);
    fixture.detectChanges();

    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    expect(buttons.map((button) => button.textContent?.trim())).toEqual([
      'My games',
      'Engine',
      'Challenge bot',
    ]);
    expect(buttons[0].getAttribute('aria-pressed')).toBe('false');
    expect(buttons[0].classList).toContain('ui-shell-toggle');
    expect(buttons[0].classList).not.toContain('active');
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
    expect(buttons[1].classList).toContain('active');
    expect(buttons[2].getAttribute('aria-pressed')).toBeNull();
    expect(buttons[2].classList).not.toContain('ui-shell-toggle');

    buttons[0].click();
    expect(run).toHaveBeenCalled();
  });
});
