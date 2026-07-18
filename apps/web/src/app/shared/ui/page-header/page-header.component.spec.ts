import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PageHeaderComponent } from './page-header.component';

describe('PageHeaderComponent', () => {
  let fixture: ComponentFixture<PageHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageHeaderComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(PageHeaderComponent);
    fixture.componentRef.setInput('title', 'Games');
  });

  it('renders flat by default', () => {
    fixture.detectChanges();

    const header = fixture.nativeElement.querySelector('.page-header') as HTMLElement;
    expect(header.classList).not.toContain('page-header-raised');
  });

  it('renders the explicit raised appearance', () => {
    fixture.componentRef.setInput('appearance', 'raised');
    fixture.detectChanges();

    const header = fixture.nativeElement.querySelector('.page-header') as HTMLElement;
    expect(header.classList).toContain('page-header-raised');
  });
});
