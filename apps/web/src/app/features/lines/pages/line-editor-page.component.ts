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
import { combineLatest, distinctUntilChanged, map } from 'rxjs';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import {
  PageHeaderAction,
  PageHeaderComponent,
  PageHeaderStat,
} from '../../../shared/ui/page-header/page-header.component';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import { LineEditorWorkbenchComponent } from '../components/line-editor-workbench.component';
import { LineEditorStore } from '../state/line-editor.store';

@Component({
  selector: 'app-line-editor-page',
  standalone: true,
  imports: [PageHeaderComponent, PanelComponent, LineEditorWorkbenchComponent],
  providers: [LineEditorStore],
  templateUrl: './line-editor-page.component.html',
  styleUrl: './line-editor-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LineEditorPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly confirmDialog = inject(ConfirmDialogService);
  protected readonly store = inject(LineEditorStore);

  protected readonly headerStats = computed<readonly PageHeaderStat[]>(() => {
    const line = this.store.line();
    if (!line) return [];
    return [
      {
        id: 'side',
        label: 'Train as',
        value: line.sideToTrain === 'BLACK' ? 'Black' : 'White',
      },
      {
        id: 'selected',
        label: 'Selected',
        value: this.store.selectedLabel(),
      },
    ];
  });

  protected readonly headerActions = computed<readonly PageHeaderAction[]>(() => {
    const line = this.store.line();
    if (!line) return [];
    return [
      {
        id: 'back',
        label: 'Back to lines',
        link: this.store.breadcrumbLink(),
      },
      {
        id: 'train',
        label: 'Train line',
        link: ['/lines', line.id, 'train'],
      },
    ];
  });

  ngOnInit(): void {
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(
        map(([params, query]) => ({
          lineId: Number(params.get('lineId')),
          nodeId: Number(query.get('nodeId')) || undefined,
        })),
        distinctUntilChanged(
          (previous, current) =>
            previous.lineId === current.lineId && previous.nodeId === current.nodeId,
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ lineId, nodeId }) => this.store.initialize(lineId, nodeId));
  }

  @HostListener('window:keydown', ['$event'])
  protected onKeyDown(event: KeyboardEvent): void {
    this.store.handleKeyboard(event);
  }

  protected async confirmDeleteSelectedSubtree(): Promise<void> {
    const message = this.store.deleteConfirmationText();
    if (!message) return;

    const confirmed = await this.confirmDialog.confirm({
      title: 'Delete variation?',
      message,
      tone: 'danger',
      confirmLabel: 'Delete variation',
      cancelLabel: 'Cancel',
    });

    if (confirmed) void this.store.deleteSelectedSubtree();
  }
}