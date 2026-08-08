import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { AdminUserDiagnosticsComponent } from '../components/admin-user-diagnostics.component';
import { AdminUserListComponent } from '../components/admin-user-list.component';
import { AdminApiService } from '../data-access/admin-api.service';
import { AdminDiagnosticsStore } from '../state/admin-diagnostics.store';
import {
  PageHeaderComponent,
  type PageHeaderAction,
  type PageHeaderStat,
} from '../../../shared/ui/page-header/page-header.component';
import { FactGridComponent, type UiFactItem } from '../../../shared/ui/fact-grid/fact-grid.component';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';

@Component({
  selector: 'app-admin-diagnostics-page',
  standalone: true,
  imports: [
    AdminUserDiagnosticsComponent,
    AdminUserListComponent,
    FactGridComponent,
    PageHeaderComponent,
    PanelComponent,
  ],
  providers: [AdminApiService, AdminDiagnosticsStore],
  templateUrl: './admin-diagnostics-page.component.html',
  styleUrl: './admin-diagnostics-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDiagnosticsPageComponent implements OnInit {
  protected readonly store = inject(AdminDiagnosticsStore);

  protected readonly headerStats = computed<readonly PageHeaderStat[]>(() => {
    const capability = this.store.capability();
    if (!capability || this.store.accessState() !== 'ready') return [];
    return [
      { id: 'access', label: 'Access', value: 'Server confirmed' },
      { id: 'budget', label: 'Budget', value: capability.requestBudget.enforcement },
    ];
  });

  protected readonly headerActions = computed<readonly PageHeaderAction[]>(() => {
    if (this.store.accessState() !== 'ready') return [];
    return [
      {
        id: 'refresh-admin-diagnostics',
        label: 'Refresh',
        run: () => void this.store.refresh(),
      },
    ];
  });

  protected readonly capabilityFacts = computed<readonly UiFactItem[]>(() => {
    const capability = this.store.capability();
    if (!capability) return [];
    return [
      { id: 'actor-key-version', label: 'Actor key version', value: capability.actorKeyVersion, mono: true },
      { id: 'budget', label: 'Request budget', value: capability.requestBudget.enforcement },
      {
        id: 'verified-session',
        label: 'Verified session evidence',
        value: capability.sessionEvidence.hasVerifiedSession ? 'Present' : 'Absent',
      },
      {
        id: 'factor-age',
        label: 'Factor verification age',
        value: capability.sessionEvidence.hasFactorVerificationAge ? 'Present' : 'Absent',
      },
      {
        id: 'reverification',
        label: 'Reverification evidence',
        value: capability.sessionEvidence.hasReverificationId ? 'Present' : 'Absent',
      },
    ];
  });

  ngOnInit(): void {
    void this.store.initialize();
  }
}
