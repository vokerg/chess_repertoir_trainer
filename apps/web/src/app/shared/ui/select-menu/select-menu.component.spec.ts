import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SelectMenuComponent, type UiSelectMenuOption } from './select-menu.component';

describe('SelectMenuComponent', () => {
  let fixture: ComponentFixture<SelectMenuComponent>;

  const options: readonly UiSelectMenuOption[] = [
    { value: 'ALL', label: 'Any platform' },
    { value: 'LICHESS', label: 'Lichess', marker: 'graphite' },
    {
      value: 'CHESS_COM',
      label: 'Chess.com',
      caption: 'Connected games',
      marker: 'action',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectMenuComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SelectMenuComponent);
    fixture.componentRef.setInput('ariaLabel', 'Platform');
    fixture.componentRef.setInput('value', 'LICHESS');
    fixture.componentRef.setInput('options', options);
    fixture.detectChanges();
  });

  it('renders the current value and a tokenized marker in the trigger', () => {
    const trigger = fixture.nativeElement.querySelector('.select-menu-trigger') as HTMLButtonElement;

    expect(trigger.textContent).toContain('Lichess');
    expect(trigger.getAttribute('role')).toBe('combobox');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.querySelector('.select-menu-marker-graphite')).not.toBeNull();
  });

  it('opens an accessible option panel and emits a changed value', () => {
    const values: string[] = [];
    fixture.componentInstance.valueChange.subscribe((value) => values.push(value));

    trigger().click();
    fixture.detectChanges();

    const panel = fixture.nativeElement.querySelector('.select-menu-panel') as HTMLElement;
    const optionButtons = Array.from(
      fixture.nativeElement.querySelectorAll('.select-menu-option'),
    ) as HTMLButtonElement[];

    expect(panel.getAttribute('role')).toBe('listbox');
    expect(optionButtons.map((option) => option.getAttribute('aria-selected'))).toEqual([
      'false',
      'true',
      'false',
    ]);
    expect(optionButtons[2].textContent).toContain('Connected games');

    optionButtons[2].click();
    fixture.detectChanges();

    expect(values).toEqual(['CHESS_COM']);
    expect(fixture.nativeElement.querySelector('.select-menu-panel')).toBeNull();
  });

  it('supports arrow navigation and keyboard selection', async () => {
    const values: string[] = [];
    fixture.componentInstance.valueChange.subscribe((value) => values.push(value));

    trigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();

    const selectedOption = fixture.nativeElement.querySelector(
      '.select-menu-option-selected',
    ) as HTMLButtonElement;
    selectedOption.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );
    fixture.detectChanges();
    await fixture.whenStable();

    const activeOption = fixture.nativeElement.querySelector(
      '.select-menu-option-active',
    ) as HTMLButtonElement;
    expect(activeOption.textContent).toContain('Chess.com');

    activeOption.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();

    expect(values).toEqual(['CHESS_COM']);
    expect(fixture.nativeElement.querySelector('.select-menu-panel')).toBeNull();
  });

  function trigger(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('.select-menu-trigger') as HTMLButtonElement;
  }
});
