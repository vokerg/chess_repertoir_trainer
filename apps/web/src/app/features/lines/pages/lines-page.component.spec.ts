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
    store = jasmine.createSpyObj<LinesPageStore>(
      'LinesPageStore',
      ['initialize', 'loadPage'],
      {
        courseId: signal<number | null>(null),
        chapter: signal<ChapterDetail | null>(null),
        chapterStats: signal<ActiveTrainingStats | null>(null),
        lines: signal<LineSummary[]>([]),
        loading: signal(true),
        error: signal<string | null>(null),
        activeSublineCount: signal(0),
        totalAttempts: signal(0),
      },
    );

    await TestBed.configureTestingModule({
      imports: [LinesPageComponent],
      providers: [
        provideRouter([]),
        { provide: ConfirmDialogService, useValue: jasmine.createSpyObj('ConfirmDialogService', ['confirm']) },
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

  it('renders an explicit loading state before chapter data exists', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Loading chapter lines...');
    expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Create a line');
  });

  it('renders a recoverable error instead of a blank route after initial load failure', () => {
    store.loading.set(false);
    store.error.set('Could not load lines.');
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement;
    const retryButton = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ).find((button) => (button as HTMLButtonElement).textContent?.trim() === 'Retry') as HTMLButtonElement;

    expect(alert.textContent).toContain('Could not load lines.');
    expect(fixture.nativeElement.textContent).not.toContain('Create a line');
    expect(fixture.nativeElement.textContent).not.toContain('Import or export PGN');

    retryButton.click();
    expect(store.loadPage).toHaveBeenCalledTimes(1);
  });
});
