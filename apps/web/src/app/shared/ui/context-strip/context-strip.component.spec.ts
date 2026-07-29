import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContextStripComponent, type UiContextItem } from './context-strip.component';

describe('ContextStripComponent', () => {
  let fixture: ComponentFixture<ContextStripComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContextStripComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ContextStripComponent);
    fixture.componentRef.setInput('ariaLabel', 'Current selection');
    fixture.componentRef.setInput('presentation', 'cards');
    fixture.componentRef.setInput('items', items());
    fixture.detectChanges();
  });

  it('renders semantic labels, values, and optional markers', () => {
    const strip = fixture.nativeElement.querySelector('dl') as HTMLElement;
    const entries = Array.from(strip.querySelectorAll('.context-item')) as HTMLElement[];

    expect(strip.getAttribute('aria-label')).toBe('Current selection');
    expect(entries.map((entry) => entry.querySelector('dt')?.textContent?.trim())).toEqual([
      'Repertoire',
      'Lines',
    ]);
    expect(entries.map((entry) => entry.querySelector('dd')?.textContent?.trim())).toEqual([
      'White repertoire',
      '3 selected',
    ]);
    expect(entries[0].querySelector('.context-marker')?.textContent?.trim()).toBe('1');
    expect(entries[1].classList.contains('context-item-mono')).toBeTrue();
  });

  it('switches presentation without changing item semantics', () => {
    fixture.componentRef.setInput('presentation', 'segments');
    fixture.detectChanges();

    const strip = fixture.nativeElement.querySelector('dl') as HTMLElement;
    expect(strip.classList.contains('context-strip-segments')).toBeTrue();
    expect(strip.querySelectorAll('dt').length).toBe(2);
    expect(strip.querySelectorAll('dd').length).toBe(2);
  });
});

function items(): readonly UiContextItem[] {
  return [
    { id: 'repertoire', marker: '1', label: 'Repertoire', value: 'White repertoire' },
    { id: 'lines', label: 'Lines', value: '3 selected', mono: true },
  ];
}
