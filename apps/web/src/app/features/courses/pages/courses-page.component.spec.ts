import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { CourseDetail } from '../data-access/course-detail.models';
import { CoursesStore } from '../state/courses.store';
import { CoursesPageComponent } from './courses-page.component';

describe('CoursesPageComponent', () => {
  let fixture: ComponentFixture<CoursesPageComponent>;
  let store: jasmine.SpyObj<CoursesStore>;
  let confirmDialog: jasmine.SpyObj<ConfirmDialogService>;

  beforeEach(async () => {
    store = jasmine.createSpyObj<CoursesStore>('CoursesStore', ['deleteCourse', 'loadCourses'], {
      courses: signal<CourseDetail[]>([]),
      deletingId: signal<number | null>(null),
    });
    confirmDialog = jasmine.createSpyObj<ConfirmDialogService>('ConfirmDialogService', ['confirm']);

    await TestBed.configureTestingModule({
      imports: [CoursesPageComponent],
      providers: [{ provide: ConfirmDialogService, useValue: confirmDialog }],
    })
      .overrideComponent(CoursesPageComponent, {
        set: {
          template: '',
          providers: [{ provide: CoursesStore, useValue: store }],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(CoursesPageComponent);
  });

  it('deletes a course only when confirmed', async () => {
    const course = { id: 1, name: 'Italian Game', description: null };
    confirmDialog.confirm.and.resolveTo(true);

    await page().confirmDeleteCourse(course);

    expect(store.deleteCourse).toHaveBeenCalledOnceWith(course);
  });

  it('does not delete a course when cancelled', async () => {
    confirmDialog.confirm.and.resolveTo(false);

    await page().confirmDeleteCourse({ id: 1, name: 'Italian Game', description: null });

    expect(store.deleteCourse).not.toHaveBeenCalled();
  });

  function page(): { confirmDeleteCourse(course: CourseDetail): Promise<void> } {
    return fixture.componentInstance as unknown as { confirmDeleteCourse(course: CourseDetail): Promise<void> };
  }
});
