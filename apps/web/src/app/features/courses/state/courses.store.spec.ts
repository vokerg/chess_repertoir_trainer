import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CourseDetailApiService } from '../data-access/course-detail-api.service';
import { CoursesStore } from './courses.store';

describe('CoursesStore', () => {
  let api: jasmine.SpyObj<CourseDetailApiService>;
  let store: CoursesStore;

  beforeEach(() => {
    api = jasmine.createSpyObj<CourseDetailApiService>('CourseDetailApiService', [
      'createCourse',
      'getCatalog',
      'deleteCourse',
    ]);
    api.getCatalog.and.returnValue(of({ courses: [] }));
    api.createCourse.and.returnValue(of({
      id: 8,
      name: 'Sicilian',
      description: null,
      side: 'BLACK',
      coverKey: 'BLACK_COUNTERPLAY',
    }));

    TestBed.configureTestingModule({
      providers: [CoursesStore, { provide: CourseDetailApiService, useValue: api }],
    });
    store = TestBed.inject(CoursesStore);
  });

  it('resets the cover to a compatible default when the side changes', () => {
    store.setNewCourseSide('BLACK');

    expect(store.newCourseSide()).toBe('BLACK');
    expect(store.newCourseCoverKey()).toBe('SICILIAN');
  });

  it('creates a course with explicit side and cover metadata', async () => {
    store.newCourseName.set('Sicilian');
    store.setNewCourseSide('BLACK');
    store.newCourseCoverKey.set('BLACK_COUNTERPLAY');

    await store.createCourse();

    expect(api.createCourse).toHaveBeenCalledOnceWith({
      name: 'Sicilian',
      description: null,
      side: 'BLACK',
      coverKey: 'BLACK_COUNTERPLAY',
    });
    expect(api.getCatalog).toHaveBeenCalledTimes(1);
  });
});
