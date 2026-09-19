import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OpeningEvidenceTabsComponent } from './opening-evidence-tabs.component';

describe('OpeningEvidenceTabsComponent', () => {
  let fixture: ComponentFixture<OpeningEvidenceTabsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OpeningEvidenceTabsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(OpeningEvidenceTabsComponent);
    fixture.componentRef.setInput('activeTab', 'performance');
    fixture.detectChanges();
  });

  it('renders the approved tab order and associates the active tab with its panel', () => {
    const tabs = tabButtons();
    const panel = fixture.nativeElement.querySelector('[role="tabpanel"]') as HTMLElement | null;

    expect(tabs.map((tab) => tab.textContent?.trim())).toEqual([
      'My performance',
      'Masters',
      'Peers',
      'Last games',
    ]);
    expect(tabs.map((tab) => tab.getAttribute('aria-selected'))).toEqual([
      'true',
      'false',
      'false',
      'false',
    ]);
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1, -1]);
    expect(panel?.getAttribute('aria-labelledby')).toBe('opening-evidence-tab-performance');
  });

  it('emits click selection and supports arrow, Home, and End keyboard navigation', () => {
    const selected: string[] = [];
    fixture.componentInstance.tabChange.subscribe((tab) => selected.push(tab));
    const tabs = tabButtons();
    const arrowEvent = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true,
    });
    spyOn(arrowEvent, 'stopPropagation').and.callThrough();

    tabs[1].click();
    tabs[0].dispatchEvent(arrowEvent);
    tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    tabs[3].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));

    expect(selected).toEqual(['masters', 'masters', 'last-games', 'performance']);
    expect(arrowEvent.defaultPrevented).toBeTrue();
    expect(arrowEvent.stopPropagation).toHaveBeenCalled();
    expect(document.activeElement).toBe(tabs[0]);
  });

  function tabButtons(): HTMLButtonElement[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll('[role="tab"]') as NodeListOf<HTMLButtonElement>,
    );
  }
});
