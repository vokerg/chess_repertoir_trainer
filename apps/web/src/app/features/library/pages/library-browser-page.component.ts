import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { StudyLineListComponent } from '../components/study-line-list/study-line-list.component';
import { StudyScopeItem, StudyScopeListComponent } from '../components/study-scope-list/study-scope-list.component';
import { TrainingBasketPanelComponent } from '../components/training-basket-panel/training-basket-panel.component';
import { LibraryApiService } from '../data-access/library-api.service';
import { LibraryBrowserStore } from '../state/library-browser.store';

@Component({
  selector: 'app-library-browser-page',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, StudyScopeListComponent, StudyLineListComponent, TrainingBasketPanelComponent],
  providers: [LibraryApiService, LibraryBrowserStore],
  templateUrl: './library-browser-page.component.html',
  styleUrl: './library-browser-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LibraryBrowserPageComponent implements OnInit {
  protected readonly store = inject(LibraryBrowserStore);
  protected readonly courseItems = computed<StudyScopeItem[]>(() =>
    this.store.filteredCourses().map((course) => ({
      id: course.id,
      title: course.name,
      description: course.description || 'Personal repertoire',
      meta: this.store.courseMeta(course),
    })),
  );
  protected readonly chapterItems = computed<StudyScopeItem[]>(() =>
    this.store.filteredChapters().map((chapter) => ({
      id: chapter.id,
      title: chapter.name,
      description: chapter.description || 'Opening section',
      meta: this.store.chapterLineMeta(chapter),
    })),
  );
  protected readonly headerActions = computed<readonly PageHeaderAction[]>(() => [
    {
      id: 'filters',
      label: this.store.reviewOnly() ? 'Review filter on' : 'Filters',
      active: this.store.reviewOnly(),
      run: () => this.store.toggleReviewOnly(),
    },
    {
      id: 'select-visible',
      label: 'Select visible lines',
      disabled: this.store.filteredLines().length === 0,
      run: () => this.store.selectAllVisibleLines(),
    },
  ]);

  ngOnInit(): void {
    void this.store.loadCourses();
  }
}
