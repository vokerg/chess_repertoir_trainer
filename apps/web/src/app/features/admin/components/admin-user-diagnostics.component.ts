import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type {
  AdminUserDetailResponse,
  AdminUserWorkResponse,
} from '@chess-trainer/contracts/admin';
import {
  FactGridComponent,
  type UiFactItem,
} from '../../../shared/ui/fact-grid/fact-grid.component';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import type { AdminLoadState } from '../state/admin-diagnostics.store';
import { AdminWarningListComponent } from './admin-warning-list.component';

@Component({
  selector: 'app-admin-user-diagnostics',
  standalone: true,
  imports: [AdminWarningListComponent, DatePipe, FactGridComponent, PanelComponent],
  templateUrl: './admin-user-diagnostics.component.html',
  styleUrl: './admin-user-diagnostics.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUserDiagnosticsComponent {
  readonly selectedUserId = input<number | null>(null);
  readonly detail = input<AdminUserDetailResponse | null>(null);
  readonly detailState = input<AdminLoadState>('idle');
  readonly detailError = input<string | null>(null);
  readonly work = input<AdminUserWorkResponse | null>(null);
  readonly workState = input<AdminLoadState>('idle');
  readonly workError = input<string | null>(null);

  readonly retry = output<void>();

  protected readonly accountFacts = computed<readonly UiFactItem[]>(() => {
    const section = this.detail()?.sections.accounts;
    if (!section?.available) return [];
    return [
      { id: 'total', label: 'Accounts', value: section.total, mono: true },
      { id: 'active', label: 'Active accounts', value: section.active, mono: true },
    ];
  });

  protected readonly gameFacts = computed<readonly UiFactItem[]>(() => {
    const section = this.detail()?.sections.games;
    if (!section?.available) return [];
    return [
      { id: 'total', label: 'Imported games', value: section.total, mono: true },
      { id: 'indexed', label: 'Indexed', value: section.indexed, mono: true },
      { id: 'analysed', label: 'Analysed', value: section.analysed, mono: true },
    ];
  });

  protected readonly courseFacts = computed<readonly UiFactItem[]>(() => {
    const section = this.detail()?.sections.courses;
    if (!section?.available) return [];
    return [
      { id: 'courses', label: 'Courses', value: section.courses, mono: true },
      { id: 'chapters', label: 'Chapters', value: section.chapters, mono: true },
      { id: 'lines', label: 'Lines', value: section.lines, mono: true },
    ];
  });

  protected readonly trainingFacts = computed<readonly UiFactItem[]>(() => {
    const section = this.detail()?.sections.training;
    if (!section?.available) return [];
    return [
      { id: 'sessions', label: 'Sessions', value: section.sessions, mono: true },
      { id: 'attempts', label: 'Subline attempts', value: section.sublineAttempts, mono: true },
      { id: 'latest-session', label: 'Latest session', value: section.latestSessionAt ?? 'None', mono: true },
      { id: 'latest-attempt', label: 'Latest attempt', value: section.latestSublineAttemptAt ?? 'None', mono: true },
    ];
  });

  protected readonly preparationFacts = computed<readonly UiFactItem[]>(() => {
    const section = this.detail()?.sections.preparation;
    if (!section?.available) return [];
    return [
      { id: 'runs', label: 'Preparation runs', value: section.totalRuns, mono: true },
      { id: 'active-runs', label: 'Active runs', value: section.activeRuns, mono: true },
      { id: 'latest-update', label: 'Latest update', value: section.latestUpdatedAt ?? 'None', mono: true },
    ];
  });

  protected readonly footprintFacts = computed<readonly UiFactItem[]>(() => {
    const section = this.detail()?.sections.footprint;
    if (!section?.available) return [];
    const rows = section.rowCounts;
    return [
      { id: 'accounts', label: 'External accounts', value: rows.externalAccounts, mono: true },
      { id: 'games', label: 'Imported games', value: rows.importedGames, mono: true },
      { id: 'courses', label: 'Courses', value: rows.courses, mono: true },
      { id: 'chapters', label: 'Chapters', value: rows.chapters, mono: true },
      { id: 'lines', label: 'Lines', value: rows.lines, mono: true },
      { id: 'sessions', label: 'Training sessions', value: rows.trainingSessions, mono: true },
      { id: 'attempts', label: 'Subline attempts', value: rows.trainingSublineAttempts, mono: true },
      { id: 'imports', label: 'Import runs', value: rows.importRuns, mono: true },
      { id: 'jobs', label: 'Job runs', value: rows.jobRuns, mono: true },
      { id: 'preparation', label: 'Preparation runs', value: rows.preparationRuns, mono: true },
    ];
  });
}
