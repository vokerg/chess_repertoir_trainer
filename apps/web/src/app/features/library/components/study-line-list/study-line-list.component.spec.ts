import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { LibraryLine } from '../../data-access/library.models';
import { StudyLineListComponent } from './study-line-list.component';

describe('StudyLineListComponent', () => {
  let fixture: ComponentFixture<StudyLineListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudyLineListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StudyLineListComponent);
    fixture.componentRef.setInput('title', 'Sicilian Defence');
    fixture.componentRef.setInput('subtitle', '1 line · Choose any combination to train.');
    fixture.componentRef.setInput('lines', [line()]);
    fixture.componentRef.setInput('selectedLineIds', [42]);
    fixture.componentRef.setInput('searchText', 'Sicilian');
    fixture.detectChanges();
  });

  it('shows clear mastery bars and keeps the status beside the line name', () => {
    const text = fixture.nativeElement.textContent?.replace(/\s+/g, ' ').trim();
    const selectButton = fixture.nativeElement.querySelector(
      '.line-select-button',
    ) as HTMLButtonElement;
    const titleRow = fixture.nativeElement.querySelector('.line-title-row') as HTMLElement;
    const masteryCell = fixture.nativeElement.querySelector('.mastery-cell') as HTMLElement;
    const progress = fixture.nativeElement.querySelector('.mini-track') as HTMLElement;
    const sectionHealth = fixture.nativeElement.querySelector('.section-health') as HTMLElement;

    expect(text).toContain('Sicilian Defence');
    expect(sectionHealth.querySelector('.section-health-label span')?.textContent).toBe('Section mastery');
    expect(sectionHealth.querySelector('.section-health-label strong')?.textContent).toBe('75%');
    expect(text).toContain('2 weak');
    expect(text).toContain('2 untrained');
    expect(text).toContain('1 selected');
    expect(text).toContain('Train as Black');
    expect(titleRow.textContent).toContain('Sicilian main line');
    expect(titleRow.textContent).toContain('Review');
    expect(masteryCell.querySelector('span')?.textContent).toBe('Mastery');
    expect(masteryCell.querySelector('strong')?.textContent).toBe('75%');
    expect(progress.getAttribute('aria-valuenow')).toBe('75');
    expect((progress.firstElementChild as HTMLElement).style.width).toBe('75%');
    expect(text).not.toContain('Coverage');
    expect(text).not.toContain('Edit');
    expect(selectButton.getAttribute('aria-pressed')).toBe('true');
  });

  it('emits search, selection, select-visible, and clear intents', () => {
    const searches: string[] = [];
    const toggled: number[] = [];
    let selectVisibleCount = 0;
    let clearCount = 0;
    fixture.componentInstance.searchTextChange.subscribe((value) => searches.push(value));
    fixture.componentInstance.toggleLine.subscribe((lineId) => toggled.push(lineId));
    fixture.componentInstance.selectAllVisible.subscribe(() => selectVisibleCount++);
    fixture.componentInstance.clearSelection.subscribe(() => clearCount++);

    const search = fixture.nativeElement.querySelector('input[type="search"]') as HTMLInputElement;
    search.value = 'Najdorf';
    search.dispatchEvent(new Event('input'));
    (fixture.nativeElement.querySelector('.line-select-button') as HTMLButtonElement).click();
    let buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    buttons.find((button) => button.textContent?.trim() === 'Clear')?.click();
    fixture.componentRef.setInput('selectedLineIds', []);
    fixture.detectChanges();
    buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    buttons.find((button) => button.textContent?.trim() === 'Select visible')?.click();

    expect(searches).toEqual(['Najdorf']);
    expect(toggled).toEqual([42]);
    expect(selectVisibleCount).toBe(1);
    expect(clearCount).toBe(1);
  });
});

function line(): LibraryLine {
  return {
    id: 42,
    name: 'Sicilian main line',
    sideToTrain: 'BLACK',
    startingFen: 'startpos',
    trainingStats: {
      totalAttempts: 8,
      passedCount: 6,
      failedCount: 2,
      passRate: 0.75,
      activeSublineCount: 6,
      trainedSublineCount: 4,
      untrainedSublineCount: 2,
      weakSublineCount: 2,
      status: 'REVIEW',
    },
  };
}
