import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { CourseChapter, CourseDetail, CourseStats } from '../data-access/course-detail.models';
import { AvailableSubline } from '../data-access/sublines/sublines.models';
import { CourseDetailStore } from '../state/course-detail.store';
import { CourseDetailPageComponent } from './course-detail-page.component';

describe('CourseDetailPageComponent state presentation', () => {
  let fixture: ComponentFixture<CourseDetailPageComponent>;
  let store: jasmine.SpyObj<CourseDetailStore>;

  beforeEach(async () => {
    store = jasmine.createSpyObj<CourseDetailStore>(
      'CourseDetailStore',
      [
        'initialize',
        'loadCoursePage',
        'startCourseEdit',
        'cancelCourseEdit',
        'saveCourseName',
        'startChapterEdit',
        'cancelChapterEdit',
        'saveChapterName',
        'deleteChapter',
        'deleteCourse',
        'createChapter',
      ],
      {
        courseId: signal<number | null>(7),
        course: signal<CourseDetail | null>(null),
        stats: signal<CourseStats | null>(null),
        chapters: signal<CourseChapter[]>([]),
        sublines: signal<AvailableSubline[]>([]),
        sublinesLoading: signal(false),
        sublinesError: signal<string | null>(null),
        loading: signal(true),
        error: signal<string | null>(null),
        editingCourseName: signal(false),
        courseNameDraft: signal(''),
        savingCourseName: signal(false),
        editingChapterId: signal<number | null>(null),
        chapterNameDraft: signal(''),
        savingChapterId: signal<number | null>(null),
        deletingCourse: signal(false),
        deletingChapterId: signal<number | null>(null),
        newChapterName: signal(''),
        newChapterDescription: signal<string | null>(null),
        saving: signal(false),
      },
    );

    await TestBed.configureTestingModule({
      imports: [CourseDetailPageComponent],
      providers: [
        provideRouter([]),
        { provide: ConfirmDialogService, useValue: jasmine.createSpyObj('ConfirmDialogService', ['confirm']) },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ courseId: '7' })) },
        },
      ],
    })
      .overrideComponent(CourseDetailPageComponent, {
        set: { providers: [{ provide: CourseDetailStore, useValue: store }] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(CourseDetailPageComponent);
  });

  it('renders an explicit loading state before course data exists', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Loading course details...');
    expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Create a chapter');
  });

  it('renders a bounded recovery state and suppresses authoring after initial load failure', () => {
    store.loading.set(false);
    store.error.set('Could not load course.');
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement;
    const retryButton = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ).find((button) => (button as HTMLButtonElement).textContent?.trim() === 'Retry') as HTMLButtonElement;

    expect(alert.textContent).toContain('Could not load course.');
    expect(fixture.nativeElement.textContent).not.toContain('Create a chapter');
    expect(fixture.nativeElement.textContent).not.toContain('Available sublines and repertoire structure');

    retryButton.click();
    expect(store.loadCoursePage).toHaveBeenCalledTimes(1);
  });
});
