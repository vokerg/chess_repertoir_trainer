import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrandMarkComponent } from './brand-mark.component';

describe('BrandMarkComponent', () => {
  let fixture: ComponentFixture<BrandMarkComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [BrandMarkComponent] }).compileComponents();
    fixture = TestBed.createComponent(BrandMarkComponent);
  });

  it('is decorative by default', () => {
    fixture.detectChanges();

    const svg = fixture.nativeElement.querySelector('svg');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('role')).toBeNull();
    expect(svg.querySelector('title')).toBeNull();
  });

  it('uses a label for meaningful standalone marks', () => {
    fixture.componentRef.setInput('label', 'Chess Repertoire Trainer');
    fixture.detectChanges();

    const svg = fixture.nativeElement.querySelector('svg');
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('Chess Repertoire Trainer');
    expect(svg.querySelector('title')?.textContent).toContain('Chess Repertoire Trainer');
  });

  it('renders the plain and reversed variants without changing geometry', () => {
    fixture.componentRef.setInput('variant', 'mark');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('svg').classList).toContain('brand-mark-plain');

    fixture.componentRef.setInput('variant', 'reversed');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('svg').classList).toContain('brand-mark-reversed');
    expect(fixture.nativeElement.querySelectorAll('circle').length).toBe(3);
  });

  it('renders the Decision Grid identity without changing the default mark', () => {
    fixture.componentRef.setInput('variant', 'grid');
    fixture.detectChanges();

    const svg = fixture.nativeElement.querySelector('svg');
    expect(svg.classList).toContain('brand-mark-grid');
    expect(svg.querySelectorAll('.brand-grid-cells rect').length).toBe(9);
    expect(svg.querySelectorAll('.brand-grid-cell-selected').length).toBe(5);
    expect(svg.querySelector('.brand-mark-branch')).toBeNull();
  });
});
