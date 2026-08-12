import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { ActiveTrainingStats, ChapterDetail, LineSummary } from '../data-access/lines.models';
import { LinesPageStore } from '../state/lines-page.store';
import { LinesPageComponent } from './lines-page.component';

describe('LinesPageComponent state presentation', () => {
  let fixture: ComponentFixture<LinesPageComponent>;
  let store: jasmine.SpyObj<LinesPageStore>;

  beforeEach(async () => {
    store = jasmine.createSpyObj<LinesPageStore>('LinesPageStore', ['initialize', 'loadPage'], {
      courseId: signal<number | null>(null),
      chapter: signal<ChapterDetail | null>(null),
      chapterStats: signal<ActiveTrainingStats | null>(null),
      lines: signal<LineSummary[]>([]),
      loading: signal(true),
      error: signal<string | null>(null),
      activeSublineCount: signal(0),
      totalAttempts: signal(0),
      selectedLineIds: signal<number[]>([]),
      selectedLineCount: signal(0),
      canStartSelectedMarathon: signal(false),
      expandedLineId: signal<number | null>(null),
      lineSublineStatusByLineId: signal({}),
      selectedSublineHashesByLineId: signal({}),
      transferLineId: signal<number | null>(null),
      loadingSublineStatusLineId: signal<number | null>(null),
      sublineStatusError: signal<string | null>(null),
      deletingLineId: signal<number | null>(null),
      editingChapterName: signal(false),
      chapterNameDraft: signal(''),
      savingChapterName: signal(false),
      transferMessage: signal<string | null>(null),
      editingLineId: signal<number | null>(null),
      editingLine: signal<LineSummary | null>(null),
      lineNameDraft: signal(''),
      savingLineId: signal<number | null>(null),
      transferLine: signal<LineSummary | null>(null),
      transferMode: signal<'MOVE' | 'COPY' | null>(null),
      targetCourseId: signal<number | null>(null),
      targetChapterId: signal<number | null>(null),
      targetCourses: signal([]),
      targetChapters: signal([]),
      loadingTransferTargets: signal(false),
      transferringLineId: signal<number | null>(null),
      newLineName: signal(''),
      newLineSide: signal<'WHITE' | 'BLACK'>('WHITE'),
      newLineStartingFen: signal('startpos'),
      saving: signal(false),
      exportLineId: signal<number | null>(null),
      exporting: signal(false),
      exportedPgn: signal(''),
      importName: signal(''),
      importSide: signal<'WHITE' | 'BLACK'>('WHITE'),
      importStartingFen: signal('startpos'),
      importPgnText: signal(''),
      importing: signal(false),
      pgnMessage: signal<string | null>(null),
      pgnError: signal<string | null>(null),
    });

    await TestBed.configureTestingModule({
      imports: [LinesPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: ConfirmDialogService,
          useValue: jasmine.createSpyObj('ConfirmDialogService', ['confirm']),
        },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ chapterId: '11' })) },
        },
      ],
    })
      .overrideComponent(LinesPageComponent, {
        set: { providers: [{ provide: LinesPageStore, useValue: store }] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(LinesPageComponent);
  });

  it('renders loading instead of stale chapter content while the route identity changes', () => {
    store.chapter.set({ id: 10, courseId: 3, name: 'Previous chapter', description: null });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Loading chapter lines...');
    expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Previous chapter');
    expect(fixture.nativeElement.textContent).not.toContain('Create a line');
  });

  it('renders a recoverable error instead of a blank route after initial load failure', () => {
    store.loading.set(false);
    store.error.set('Could not load lines.');
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement;
    const retryButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (button) => (button as HTMLButtonElement).textContent?.trim() === 'Retry',
    ) as HTMLButtonElement;

    expect(alert.textContent).toContain('Could not load lines.');
    expect(fixture.nativeElement.textContent).not.toContain('Create a line');
    expect(fixture.nativeElement.textContent).not.toContain('Import or export PGN');

    retryButton.click();
    expect(store.loadPage).toHaveBeenCalledTimes(1);
  });

  it('summarizes the chapter and filters the table to lines needing attention', () => {
    const lines: LineSummary[] = [
      {
        id: 101,
        chapterId: 11,
        name: 'Stable main line',
        sideToTrain: 'WHITE',
        startingFen: 'startpos',
        trainingStats: {
          totalAttempts: 10,
          passedCount: 9,
          failedCount: 1,
          passRate: 0.9,
          activeSublineCount: 3,
          trainedSublineCount: 3,
          untrainedSublineCount: 0,
          weakSublineCount: 0,
          status: 'STABLE',
        },
      },
      {
        id: 102,
        chapterId: 11,
        name: 'Needs work',
        sideToTrain: 'BLACK',
        startingFen: 'startpos',
        trainingStats: {
          totalAttempts: 4,
          passedCount: 1,
          failedCount: 3,
          passRate: 0.25,
          activeSublineCount: 2,
          trainedSublineCount: 1,
          untrainedSublineCount: 1,
          weakSublineCount: 1,
          status: 'WEAK',
        },
      },
    ];
    store.courseId.set(3);
    store.chapter.set({ id: 11, courseId: 3, name: "Queen's Gambit", description: null });
    store.lines.set(lines);
    store.chapterStats.set({
      scopeType: 'CHAPTER',
      scopeId: 11,
      activeSublineCount: 5,
      trainedSublineCount: 4,
      untrainedSublineCount: 1,
      weakSublineCount: 1,
      statsWindowSize: 20,
      totalAttempts: 14,
      passedCount: 10,
      failedCount: 4,
      passRate: 0.71,
      failureRate: 0.29,
      attemptPassRate: 0.71,
      status: 'REVIEW',
      weakestSublines: [],
    });
    store.loading.set(false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.chapter-summary')?.textContent).toContain('71%');
    expect(
      fixture.nativeElement.querySelectorAll('.health-table tbody > tr:not(.expanded-row)').length,
    ).toBe(2);

    const attentionFilter = Array.from(
      fixture.nativeElement.querySelectorAll('.line-filter button'),
    ).find((button) =>
      (button as HTMLButtonElement).textContent?.includes('Needs attention'),
    ) as HTMLButtonElement;
    attentionFilter.click();
    fixture.detectChanges();

    const tableText = fixture.nativeElement.querySelector('.health-table')?.textContent;
    expect(
      fixture.nativeElement.querySelectorAll('.health-table tbody > tr:not(.expanded-row)').length,
    ).toBe(1);
    expect(tableText).toContain('Needs work');
    expect(tableText).not.toContain('Stable main line');
  });
});
