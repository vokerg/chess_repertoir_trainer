import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  computed,
  inject,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';
import {
  PageHeaderAction,
  PageHeaderComponent,
} from '../../../shared/ui/page-header/page-header.component';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import { type UiShellAction } from '../../../shared/ui/ui-shell.model';
import { FreeAnalysisApiService } from '../data-access/free-analysis-api.service';
import { FreeAnalysisStore } from '../state/free-analysis.store';
import { AnalysisReintegrationDialogComponent } from '../components/analysis-reintegration-dialog.component';
import { AnalysisReintegrationApiService } from '../data-access/analysis-reintegration-api.service';
import { AnalysisReintegrationStore } from '../state/analysis-reintegration.store';
import { buildAnalysisReintegrationLinePayload } from '../helpers/analysis-reintegration-payload.helpers';
import { FreeAnalysisWorkbenchComponent } from '../components/free-analysis-workbench.component';
import { FreeAnalysisMyGamesPanelComponent } from '../components/free-analysis-my-games-panel.component';
import {
  freeAnalysisRouteInputFromQuery,
  sameFreeAnalysisRouteInput,
} from '../helpers/free-analysis-route-query.helpers';

@Component({
  selector: 'app-free-analysis-page',
  standalone: true,
  imports: [
    PageHeaderComponent,
    PanelComponent,
    FreeAnalysisWorkbenchComponent,
    AnalysisReintegrationDialogComponent,
    FreeAnalysisMyGamesPanelComponent,
  ],
  providers: [
    FreeAnalysisStore,
    FreeAnalysisApiService,
    AnalysisReintegrationStore,
    AnalysisReintegrationApiService,
  ],
  templateUrl: './free-analysis-page.component.html',
  styleUrl: './free-analysis-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FreeAnalysisPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly store = inject(FreeAnalysisStore);
  protected readonly reintegrationStore = inject(AnalysisReintegrationStore);
  protected readonly headerActions = computed<readonly PageHeaderAction[]>(() => [
    {
      id: 'my-games',
      label: this.store.myGamesOpen() ? 'Hide my games' : 'My games',
      run: () => this.store.toggleMyGames(),
    },
    {
      id: 'reintegrate',
      label: 'Reintegrate into course',
      disabled: !this.store.tree(),
      run: () => this.openReintegrationDialog(),
    },
  ]);
  protected readonly myGamesActions = computed<readonly UiShellAction[]>(() => [
    {
      id: 'refresh',
      label: this.store.myGamesLoading() ? 'Loading...' : 'Refresh',
      disabled: this.store.myGamesLoading(),
      run: () => this.store.refreshMyGames(),
    },
  ]);

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(
        map(freeAnalysisRouteInputFromQuery),
        distinctUntilChanged(sameFreeAnalysisRouteInput),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((input) => this.store.initialize(input));
  }

  @HostListener('window:keydown', ['$event'])
  protected onKeyDown(event: KeyboardEvent): void {
    this.store.handleKeyboard(event);
  }

  protected confirmDeleteSelectedSubtree(): void {
    const message = this.store.deleteConfirmationText();
    if (!message || !window.confirm(message)) return;
    this.store.deleteSelectedSubtree();
  }

  protected openReintegrationDialog(): void {
    const tree = this.store.tree();
    if (tree) {
      void this.reintegrationStore.openForTree(
        buildAnalysisReintegrationLinePayload(tree, this.store.selectedNodeId()),
      );
    }
  }
}
