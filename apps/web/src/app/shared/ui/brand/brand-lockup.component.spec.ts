import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrandLockupComponent } from './brand-lockup.component';

describe('BrandLockupComponent', () => {
  let fixture: ComponentFixture<BrandLockupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [BrandLockupComponent] }).compileComponents();
    fixture = TestBed.createComponent(BrandLockupComponent);
  });

  it('keeps the product name as live text', () => {
    fixture.detectChanges();

    const copy = fixture.nativeElement.querySelector('.brand-copy');
    expect(copy.querySelector('strong')?.textContent).toContain('Chess Repertoire');
    expect(copy.querySelector('small')?.textContent).toContain('TRAINER');
  });

  it('passes the selected mark variant and applies inverse tone', () => {
    fixture.componentRef.setInput('tone', 'inverse');
    fixture.componentRef.setInput('markVariant', 'reversed');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.brand-lockup').classList).toContain('brand-lockup-inverse');
    expect(fixture.nativeElement.querySelector('app-brand-mark svg').classList).toContain('brand-mark-reversed');
  });
});
