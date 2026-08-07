import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { PageHeaderAction, PageHeaderComponent, PageHeaderStat } from '../../../shared/ui/page-header/page-header.component';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import { LineHealthTableComponent } from '../components/line-health-table/line-health-table.component';
import { LineSummary } from '../data-access/lines.models';
import { LinesPageStore } from '../state/lines-page.store';

@Component({
  selector: 'app-lines-page',
  standalone: true,
  imports: [FormsModule, RouterLink, PageHeaderComponent, PanelComponent, LineHealthTableComponent],
  providers: [LinesPageStore],
  templateUrl: './lines-page.component.html',
  styleUrl: './lines-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LinesPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly confirmDialog = inject(ConfirmDialogService);
  protected readonly store = inject(LinesPageStore);
  protected readonly canRetryLoad = signal(false);
  protected readonly headerStats = computed<readonly PageHeaderStat[]>(() => {
    if (!this.store.chapter()) return [];
    return [
      { id: 'lines', label: 'Lines', value: this.store.lines().length },
      { id: 'sublines', label: 'Active sublines', value: this.store.activeSublineCount() },
      { id: 'attempts', label: 'Recent attempts', value: this.store.totalAttempts() },
      { id: 'pass-rate', label: 'Recent pass rate', value: `${Math.round((this.store.chapterStats()?.passRate ?? 0) * 100)}%` },
    ];
  });
  protected readonly headerActions = computed<readonly PageHeaderAction[]>(() => {
    const courseId = this.store.courseId();
    const backAction: PageHeaderAction = {
      id: 'back',
      label: 'Back',
      link: courseId ? ['/courses', courseId] : ['/courses'],
    };
    const chapter = this.store.chapter();
    if (!chapter) return [backAction];

    const marathonAction: PageHeaderAction = this.store.selectedLineCount() > 0
      ? {
          id: 'selected-marathon',
          label: `Train selected (${this.store.selectedLineCount()})`,
          run: () => this.store.startSelectedLinesMarathon('ALL'),
        }
      : { id: 'marathon', label: 'Train chapter', link: ['/chapters', chapter.id, 'marathon'] };
    return [
      backAction,
      marathonAction,
      {
        id: 'select-all',
        label: 'Select all',
        disabled: this.store.lines().length === 0,
        run: () => this.store.selectAllLines(),
      },
      ...(!this.store.editingChapterName()
        ? [{ id: 'rename', label: 'Rename', run: () => this.store.startChapterEdit() }]
        : []),
    ];
  });
  protected readonly linePanelStats = computed<readonly PageHeaderStat[]>(() => {
    const selectedSublineCount = Object.values(this.store.selectedSublineHashesByLineId())
      .reduce((total, hashes) => total + hashes.length, 0);
    return [
      { id: 'selected', label: 'Selected lines', value: this.store.selectedLineCount() },
      { id: 'selected-sublines', label: 'Selected sublines', value: selectedSublineCount },
    ];
  });

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        map((params) => Number(params.get('chapterId'))),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((chapterId) => {
        this.canRetryLoad.set(Number.isFinite(chapterId) && chapterId > 0);
        this.store.initialize(chapterId);
      });
  }

  protected async confirmDeleteLine(line: LineSummary): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Delete line?',
      message: `Delete line "${line.name}" and its full move tree? This cannot be undone.`,
      tone: 'danger',
      confirmLabel: 'Delete line',
      cancelLabel: 'Cancel',
    });

    if (confirmed) void this.store.deleteLine(line);
  }
}
