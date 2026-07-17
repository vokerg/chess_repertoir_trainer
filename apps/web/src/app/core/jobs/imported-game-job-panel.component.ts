import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import type { JobRunKind, JobRunStatus, JobRunSummary } from '@chess-trainer/contracts/jobs';
import { ImportedGameJobStore } from './imported-game-job.store';

@Component({
  selector: 'app-imported-game-job-panel',
  standalone: true,
  templateUrl: './imported-game-job-panel.component.html',
  styleUrl: './imported-game-job-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportedGameJobPanelComponent {
  protected readonly store = inject(ImportedGameJobStore);

  protected kindLabel(kind: JobRunKind): string {
    switch (kind) {
      case 'INDEX_GAMES': return 'Index games';
      case 'ANALYSE_GAMES': return 'Analyse games';
      case 'PROCESS_GAMES': return 'Full game processing';
      case 'REFRESH_TAGS': return 'Refresh tags';
    }
  }

  protected statusLabel(status: JobRunStatus): string {
    switch (status) {
      case 'QUEUED': return 'Queued';
      case 'RUNNING': return 'Running';
      case 'COMPLETED': return 'Completed';
      case 'PARTIALLY_FAILED': return 'Partially failed';
      case 'FAILED': return 'Failed';
      case 'CANCELLED': return 'Cancelled';
    }
  }

  protected statusClass(status: JobRunStatus): string {
    if (status === 'COMPLETED') return 'job-status job-status-success';
    if (status === 'FAILED' || status === 'PARTIALLY_FAILED') {
      return 'job-status job-status-error';
    }
    if (status === 'CANCELLED') return 'job-status job-status-muted';
    return 'job-status job-status-active';
  }

  protected progressLabel(run: JobRunSummary): string {
    const counts = run.taskCounts;
    const settled = counts.completed + counts.skipped + counts.failed + counts.cancelled;
    if (run.status === 'QUEUED') return `${counts.queued} queued`;
    if (run.status === 'RUNNING') {
      return `${settled}/${run.totalTasks} settled · ${counts.running} running`;
    }
    if (counts.failed) return `${settled}/${run.totalTasks} settled · ${counts.failed} failed`;
    return `${settled}/${run.totalTasks} settled`;
  }

  protected progressPercent(run: JobRunSummary): number {
    if (!run.totalTasks) return 0;
    const counts = run.taskCounts;
    const settled = counts.completed + counts.skipped + counts.failed + counts.cancelled;
    return Math.max(0, Math.min(100, Math.round((settled / run.totalTasks) * 100)));
  }
}
