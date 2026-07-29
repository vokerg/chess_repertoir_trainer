import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FactGridComponent, type UiFactItem } from './fact-grid.component';

describe('FactGridComponent', () => {
  let fixture: ComponentFixture<FactGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FactGridComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FactGridComponent);
    fixture.componentRef.setInput('ariaLabel', 'Training health');
    fixture.componentRef.setInput('columns', 4);
    fixture.componentRef.setInput('compactColumns', 2);
    fixture.componentRef.setInput('items', items());
    fixture.detectChanges();
  });

  it('renders semantic fact labels and values', () => {
    const grid = fixture.nativeElement.querySelector('dl') as HTMLElement;
    const entries = Array.from(grid.querySelectorAll('.fact-item')) as HTMLElement[];

    expect(grid.getAttribute('aria-label')).toBe('Training health');
    expect(grid.style.getPropertyValue('--fact-grid-columns')).toBe('4');
    expect(grid.style.getPropertyValue('--fact-grid-compact-columns')).toBe('2');
    expect(entries.map((entry) => entry.querySelector('dt')?.textContent?.trim())).toEqual([
      'Coverage',
      'Mastery',
    ]);
    expect(entries.map((entry) => entry.querySelector('dd')?.textContent?.trim())).toEqual([
      '4/6',
      '75%',
    ]);
    expect(entries.every((entry) => entry.classList.contains('fact-item-mono'))).toBeTrue();
  });

  it('exposes highlighted presentation without changing semantics', () => {
    fixture.componentRef.setInput('highlighted', true);
    fixture.detectChanges();

    const grid = fixture.nativeElement.querySelector('dl') as HTMLElement;
    expect(grid.classList.contains('fact-grid-highlighted')).toBeTrue();
    expect(grid.querySelectorAll('dt').length).toBe(2);
    expect(grid.querySelectorAll('dd').length).toBe(2);
  });
});

function items(): readonly UiFactItem[] {
  return [
    { id: 'coverage', label: 'Coverage', value: '4/6', mono: true },
    { id: 'mastery', label: 'Mastery', value: '75%', mono: true },
  ];
}
