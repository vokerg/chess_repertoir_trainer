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

  it('uses the shared select menu for every single-choice filter', () => {
    const menus = fixture.debugElement.queryAll(By.directive(SelectMenuComponent));

    expect(menus.map((menu) => menu.componentInstance.ariaLabel())).toEqual([
      'Account',
      'Provider',
      'Result',
      'Colour',
      'Control',
      'Rated',
      'Analysis',
      'Period',
    ]);
  });

  it('preserves filter emissions and opens advanced dates for a custom period', () => {
    const changes: string[] = [];
    fixture.componentInstance.filtersChange.subscribe((filters) => changes.push(filters.provider));

    selectMenu('Provider').valueChange.emit('LICHESS');
    expect(changes).toEqual(['LICHESS']);

    selectMenu('Period').valueChange.emit('CUSTOM');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.advanced-filters')).not.toBeNull();
    expect(changes).toEqual(['LICHESS']);
  });

  function selectMenu(ariaLabel: string): SelectMenuComponent {
    const debugElement = fixture.debugElement
      .queryAll(By.directive(SelectMenuComponent))
      .find((menu) => menu.componentInstance.ariaLabel() === ariaLabel);

    expect(debugElement).toBeDefined();
    return debugElement!.componentInstance as SelectMenuComponent;
  }
});
