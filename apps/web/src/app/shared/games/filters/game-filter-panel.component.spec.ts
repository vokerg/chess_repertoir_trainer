import { By } from '@angular/platform-browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { emptyImportedGameFacets } from '../game.models';
import { SelectMenuComponent } from '../../ui/select-menu/select-menu.component';
import { defaultGameFilters } from './game-filter.model';
import { GameFilterPanelComponent } from './game-filter-panel.component';

describe('GameFilterPanelComponent', () => {
  let fixture: ComponentFixture<GameFilterPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameFilterPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GameFilterPanelComponent);
    fixture.componentRef.setInput('filters', defaultGameFilters());
    fixture.componentRef.setInput('facets', emptyImportedGameFacets());
    fixture.detectChanges();
  });

  it('keeps only essential single-choice filters in the main panel', () => {
    const mainMenus = fixture.debugElement
      .query(By.css('.essential-filters'))
      .queryAll(By.directive(SelectMenuComponent));

    expect(mainMenus.map((menu) => menu.componentInstance.ariaLabel())).toEqual([
      'Account',
      'Result',
      'Colour',
      'Period',
    ]);
  });

  it('keeps every advanced single-choice filter in the shared sheet', () => {
    const menus = fixture.debugElement.queryAll(By.directive(SelectMenuComponent));

    expect(menus.map((menu) => menu.componentInstance.ariaLabel())).toEqual([
      'Account',
      'Result',
      'Colour',
      'Period',
      'Provider',
      'Control',
      'Rated',
      'Analysis',
      'Indexed',
    ]);
  });

  it('preserves filter emissions and opens advanced dates for a custom period', () => {
    const changes: string[] = [];
    fixture.componentInstance.filtersChange.subscribe((filters) => changes.push(filters.provider));

    selectMenu('Provider').valueChange.emit('LICHESS');
    expect(changes).toEqual(['LICHESS']);

    selectMenu('Period').valueChange.emit('CUSTOM');
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('.more-filters-dialog') as HTMLDialogElement;
    expect(dialog.open).toBeTrue();
    expect(dialog.querySelector('input[type="date"]')).not.toBeNull();
    expect(changes).toEqual(['LICHESS']);
  });

  it('shows active advanced filters as removable chips', () => {
    const filters = {
      ...defaultGameFilters(),
      rated: 'true' as const,
      opponent: 'Carlsen',
    };
    fixture.componentRef.setInput('filters', filters);
    const changes: string[] = [];
    fixture.componentInstance.filtersChange.subscribe((next) => changes.push(next.opponent));
    fixture.detectChanges();

    const chips = Array.from(
      fixture.nativeElement.querySelectorAll('.active-filter-chip'),
    ) as HTMLButtonElement[];
    expect(chips.map((chip) => chip.textContent?.trim())).toEqual([
      'Blitz + rapid×',
      'Rated×',
      'Opponent: Carlsen×',
    ]);

    chips[2].click();
    expect(changes).toEqual(['']);
  });

  function selectMenu(ariaLabel: string): SelectMenuComponent {
    const debugElement = fixture.debugElement
      .queryAll(By.directive(SelectMenuComponent))
      .find((menu) => menu.componentInstance.ariaLabel() === ariaLabel);

    expect(debugElement).toBeDefined();
    return debugElement!.componentInstance as SelectMenuComponent;
  }
});
