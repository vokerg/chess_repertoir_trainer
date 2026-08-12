import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import {
  PageHeaderAction,
  PageHeaderComponent,
} from '../../../shared/ui/page-header/page-header.component';
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
  protected readonly routeChapterId = signal<number | null>(null);
  protected readonly lineFilter = signal<'ALL' | 'ATTENTION'>('ALL');
  protected readonly loadedChapter = computed(() => {
    const routeChapterId = this.routeChapterId();
    const chapter = this.store.chapter();
    return chapter && routeChapterId === chapter.id ? chapter : null;
  });
  protected readonly canRetryLoad = computed(() => this.routeChapterId() !== null);
  protected readonly attentionLineCount = computed(
    () => this.store.lines().filter((line) => this.lineNeedsAttention(line)).length,
  );
  protected readonly displayedLines = computed(() => {
    const lines = this.store.lines();
    return this.lineFilter() === 'ATTENTION'
      ? lines.filter((line) => this.lineNeedsAttention(line))
      : lines;
  });
  protected readonly recentPassRate = computed(
    () => `${Math.round((this.store.chapterStats()?.passRate ?? 0) * 100)}%`,
  );
  protected readonly selectedSublineCount = computed(() =>
    Object.values(this.store.selectedSublineHashesByLineId()).reduce(
      (total, hashes) => total + hashes.length,
      0,
    ),
  );
  protected readonly headerActions = computed<readonly PageHeaderAction[]>(() => {
    const chapter = this.loadedChapter();
    const courseId = chapter ? this.store.courseId() : null;
    const backAction: PageHeaderAction = {
      id: 'back',
      label: 'Back',
      link: courseId ? ['/courses', courseId] : ['/courses'],
    };
    if (!chapter) return [backAction];

    return [
      backAction,
      { id: 'marathon', label: 'Train chapter', link: ['/chapters', chapter.id, 'marathon'] },
      ...(!this.store.editingChapterName()
        ? [{ id: 'rename', label: 'Edit chapter', run: () => this.store.startChapterEdit() }]
        : []),
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
        this.routeChapterId.set(Number.isFinite(chapterId) && chapterId > 0 ? chapterId : null);
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

  private lineNeedsAttention(line: LineSummary): boolean {
    return (
      line.trainingStats.status === 'NEW' ||
      line.trainingStats.status === 'WEAK' ||
      line.trainingStats.status === 'REVIEW' ||
      line.trainingStats.untrainedSublineCount > 0 ||
      line.trainingStats.weakSublineCount > 0
    );
  }
}
