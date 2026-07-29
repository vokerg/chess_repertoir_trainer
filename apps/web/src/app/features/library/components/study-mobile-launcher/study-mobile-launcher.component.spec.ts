import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LibraryLine } from '../../data-access/library.models';
import { StudyMobileLauncherComponent } from './study-mobile-launcher.component';
import { StudyLauncherSummary } from './study-mobile-launcher.models';

describe('StudyMobileLauncherComponent', () => {
  let fixture: ComponentFixture<StudyMobileLauncherComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudyMobileLauncherComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StudyMobileLauncherComponent);
    fixture.componentRef.setInput('selectedCourse', {
      id: 1,
      name: 'Black repertoire',
      description: 'Practical responses as Black',
    });
    fixture.componentRef.setInput('selectedChapter', {
      id: 2,
      name: 'Sicilian Defence',
      description: 'Open Sicilian systems',
    });
    fixture.componentRef.setInput('visibleChapters', [
      { id: 2, name: 'Sicilian Defence', description: 'Open Sicilian systems' },
    ]);
    fixture.componentRef.setInput('visibleLines', [line()]);
    fixture.componentRef.setInput('selectedLineId', 42);
    fixture.componentRef.setInput('courseSummary', summary('Black repertoire', 4, 12, 0, 3));
    fixture.componentRef.setInput('chapterSummary', summary('Sicilian Defence', 3, 8, 2, 1));
    fixture.componentRef.setInput('lineSummary', summary('Najdorf main line', 1, 4, 1, 0));
    fixture.detectChanges();
  });

  it('keeps the course-first mobile flow and mode eligibility visible', () => {
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    const repertoireTab = buttons.find((button) => button.textContent?.trim() === 'Repertoire');
    const trainAll = buttons.find((button) => button.textContent?.trim() === 'Train all');
    const trainWeak = buttons.find((button) => button.textContent?.trim() === 'Train weak');
    const trainUntrained = buttons.find(
      (button) => button.textContent?.trim() === 'Train untrained',
    );

    expect(repertoireTab?.getAttribute('aria-pressed')).toBe('true');
    expect(fixture.nativeElement.textContent).toContain('Black repertoire');
    expect(trainAll?.disabled).toBeFalse();
    expect(trainWeak?.disabled).toBeTrue();
    expect(trainUntrained?.disabled).toBeFalse();
  });

  it('emits a single-line marathon command from the line scope', () => {
    const starts: unknown[] = [];
    fixture.componentInstance.startTraining.subscribe((start) => starts.push(start));

    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    buttons.find((button) => button.textContent?.trim() === 'Line')?.click();
    fixture.detectChanges();

    const updatedButtons = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    updatedButtons.find((button) => button.textContent?.trim() === 'Train all')?.click();

    expect(starts).toEqual([{ scope: 'LINE', lineId: 42, mode: 'ALL' }]);
  });
});

function summary(
  title: string,
  lineCount: number,
  activeSublineCount: number,
  weakSublineCount: number,
  untrainedSublineCount: number,
): StudyLauncherSummary {
  return {
    title,
    description: 'Training summary',
    lineCountLabel: 'Lines',
    lineCount,
    activeSublineCount,
    weakSublineCount,
    untrainedSublineCount,
    coverageLabel: '6/8',
    masteryLabel: '75%',
    canStart: true,
  };
}

function line(): LibraryLine {
  return {
    id: 42,
    name: 'Najdorf main line',
    sideToTrain: 'BLACK',
    startingFen: 'startpos',
    trainingStats: {
      totalAttempts: 6,
      passedCount: 4,
      failedCount: 2,
      passRate: 0.67,
      activeSublineCount: 4,
      trainedSublineCount: 4,
      untrainedSublineCount: 0,
      weakSublineCount: 1,
      status: 'REVIEW',
    },
  };
}
