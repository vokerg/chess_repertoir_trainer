import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import { StudyLineListComponent } from '../components/study-line-list/study-line-list.component';
import {
  type StudyScopeItem,
  StudyScopeListComponent,
} from '../components/study-scope-list/study-scope-list.component';
import { TrainingBasketPanelComponent } from '../components/training-basket-panel/training-basket-panel.component';
import { LibraryApiService } from '../data-access/library-api.service';
import { LibraryBrowserStore } from '../state/library-browser.store';

@Component({
  selector: 'app-library-browser-page',
  standalone: true,
  imports: [
    PageHeaderComponent,
    PanelComponent,
    StudyScopeListComponent,
    StudyLineListComponent,
    TrainingBasketPanelComponent,
  ],
  providers: [LibraryApiService, LibraryBrowserStore],
  templateUrl: './library-browser-page.component.html',
  styleUrl: './library-browser-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LibraryBrowserPageComponent implements OnInit {
  protected readonly store = inject(LibraryBrowserStore);

  protected readonly courseItems = computed<StudyScopeItem[]>(() =>
    this.store.courses().map((course) => ({
      id: course.id,
      title: course.name,
      description: course.description || 'Personal repertoire',
      meta: this.store.courseMeta(course),
    })),
  );
  protected readonly chapterItems = computed<StudyScopeItem[]>(() =>
    this.store.chapters().map((chapter) => ({
      id: chapter.id,
      title: chapter.name,
      description: chapter.description || 'Opening section',
      meta: this.store.chapterLineMeta(chapter),
    })),
  );
  protected readonly selectedChapterTitle = computed(
    () => this.store.selectedChapter()?.name ?? 'Lines',
  );
  protected readonly selectedChapterSubtitle = computed(() => {
    const chapter = this.store.selectedChapter();
    if (!chapter) return 'Choose a section to review and select its lines.';
    const count = this.store.lines().length;
    return `${count} ${count === 1 ? 'line' : 'lines'} · Choose any combination to train.`;
  });

  ngOnInit(): void {
    void this.store.loadCourses();
  }
}
