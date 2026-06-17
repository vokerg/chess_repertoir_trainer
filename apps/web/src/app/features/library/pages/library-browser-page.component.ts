import { DecimalPipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PageHeaderAction, PageHeaderComponent } from '../../../components/page-header.component';
import { CopyableFenComponent } from '../../../shared/ui/copyable-fen/copyable-fen.component';
import { LibraryApiService } from '../data-access/library-api.service';
import {
  failureRate,
  lineStatus,
  sideLabel,
  startingPositionLabel,
  statusClass,
  statusLabel,
} from '../helpers/library-line.helpers';
import { LibraryBrowserStore } from '../state/library-browser.store';

@Component({
  selector: 'app-library-browser-page',
  standalone: true,
  imports: [DecimalPipe, NgClass, FormsModule, RouterLink, PageHeaderComponent, CopyableFenComponent],
  providers: [LibraryApiService, LibraryBrowserStore],
  templateUrl: './library-browser-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LibraryBrowserPageComponent implements OnInit {
  protected readonly store = inject(LibraryBrowserStore);
  protected readonly lineStatus = lineStatus;
  protected readonly failureRate = failureRate;
  protected readonly statusLabel = statusLabel;
  protected readonly statusClass = statusClass;
  protected readonly sideLabel = sideLabel;
  protected readonly startingPositionLabel = startingPositionLabel;
  protected readonly headerActions = computed<readonly PageHeaderAction[]>(() => [
    {
      id: 'filters',
      label: this.store.reviewOnly() ? 'Review filter on' : 'Filters',
      active: this.store.reviewOnly(),
      run: () => this.store.toggleReviewOnly(),
    },
    {
      id: 'new-line',
      label: 'New line',
      disabled: !this.store.selectedChapterId() || this.store.lineLoading(),
      run: () => this.store.createLineInSelectedChapter(),
    },
  ]);

  ngOnInit(): void {
    void this.store.loadCourses();
  }
}
