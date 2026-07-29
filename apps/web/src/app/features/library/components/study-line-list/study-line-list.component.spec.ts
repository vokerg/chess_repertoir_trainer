import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LibraryLine } from '../../data-access/library.models';
import { StudyLineListComponent } from './study-line-list.component';

describe('StudyLineListComponent', () => {
  let fixture: ComponentFixture<StudyLineListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudyLineListComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(StudyLineListComponent);
    fixture.componentRef.setInput('stepLabel', '3');
    fixture.componentRef.setInput('title', 'Lines');
    fixture.componentRef.setInput('subtitle', 'Review health, select lines, or train directly.');
    fixture.componentRef.setInput('lines', [line()]);
    fixture.componentRef.setInput('selectedLineId', 42);
    fixture.componentRef.setInput('selectedLineIds', [42]);
    fixture.detectChanges();
  });

  it('keeps selection, health evidence, and direct actions visible', () => {
    const text = fixture.nativeElement.textContent?.replace(/\s+/g, ' ').trim();
    const selectButton = fixture.nativeElement.querySelector(
      '.line-select-button',
    ) as HTMLButtonElement;
    const facts = Array.from(
      fixture.nativeElement.querySelectorAll('.line-facts > span'),
    ).map((fact) => ({
      label: fact.querySelector('small')?.textContent?.trim(),
      value: fact.querySelector('strong')?.textContent?.trim(),
    }));

    expect(text).toContain('3');
    expect(text).toContain('Lines');
    expect(text).toContain('1 selected');
    expect(text).toContain('Sicilian main line');
    expect(text).toContain('Train as Black');
    expect(facts).toEqual([
      { label: 'Coverage', value: '4/6' },
      { label: 'Mastery', value: '75%' },
      { label: 'Weak', value: '2' },
      { label: 'Untrained', value: '2' },
    ]);
    expect(text).toContain('Train');
    expect(text).toContain('Edit');
    expect(selectButton.getAttribute('aria-pressed')).toBe('true');
  });

  it('emits line selection and marathon-basket intents separately', () => {
    const selected: number[] = [];
    const toggled: number[] = [];
    fixture.componentInstance.selectLine.subscribe((lineId) => selected.push(lineId));
    fixture.componentInstance.toggleLine.subscribe((lineId) => toggled.push(lineId));

    const selectButton = fixture.nativeElement.querySelector(
      '.line-select-button',
    ) as HTMLButtonElement;
    const checkbox = fixture.nativeElement.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement;

    selectButton.click();
    checkbox.dispatchEvent(new Event('change'));

    expect(selected).toEqual([42]);
    expect(toggled).toEqual([42]);
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
