import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';
import { AiCapabilitiesService } from '../../../core/ai/ai-capabilities.service';
import { GameInsightsComponent } from '../components/game-insights.component';
import { GameDetailHeaderComponent } from '../components/game-detail-header.component';
import { GameSummaryComponent } from '../components/game-summary.component';
import { GameWorkbenchComponent } from '../components/game-workbench.component';
import { GameDetailStore } from '../state/game-detail.store';
import { GameAiReviewStore } from '../state/game-ai-review.store';
import { GameTacticalFindingsStore } from '../state/game-tactical-findings.store';
import { GameTacticalFindingsApiService } from '../data-access/game-tactical-findings-api.service';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';

@Component({
  selector: 'app-game-detail-page',
  standalone: true,
  imports: [
    GameInsightsComponent,
    GameDetailHeaderComponent,
    GameSummaryComponent,
    GameWorkbenchComponent,
    PanelComponent,
  ],
  providers: [
    GameAiReviewStore,
    GameDetailStore,
    GameTacticalFindingsApiService,
    GameTacticalFindingsStore,
  ],
  templateUrl: './game-detail-page.component.html',
  styleUrl: './game-detail-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly capabilities = inject(AiCapabilitiesService);
  private readonly currentGameId = signal<number | null>(null);
  private readonly requestedPly = signal<number | null>(null);
  private readonly appliedPly = signal<number | null>(null);
  private readonly workbenchAnchor = viewChild<ElementRef<HTMLElement>>('gameWorkbench');
  protected readonly store = inject(GameDetailStore);
  protected readonly aiReviewStore = inject(GameAiReviewStore);
  protected readonly tacticalFindingsStore = inject(GameTacticalFindingsStore);

  protected readonly aiReviewAvailable = toSignal(
    this.capabilities.getCapabilities().pipe(map((response) => response.widgets.gameReview)),
    { initialValue: false },
  );

  constructor() {
    effect(() => {
      const gameId = this.currentGameId();
      if (!gameId || !this.aiReviewAvailable()) return;
      untracked(() => void this.aiReviewStore.load(gameId));
    });

    effect(() => {
      const treeSignal = this.store.tree;
      if (typeof treeSignal !== 'function') return;
      const ply = this.requestedPly();
      const tree = treeSignal();
      if (!tree || !ply || this.appliedPly() === ply) return;
      untracked(() => {
        this.appliedPly.set(ply);
        this.selectFindingMove(ply);
      });
    });
  }

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        map((params) => Number(params.get('gameId'))),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((gameId) => {
        this.aiReviewStore.reset();
        this.tacticalFindingsStore.reset();
        this.appliedPly.set(null);
        this.currentGameId.set(gameId);
        this.store.initialize(gameId);
        void this.tacticalFindingsStore.load(gameId);
      });

    const queryParamMap = this.route.queryParamMap;
    if (queryParamMap) {
      queryParamMap
        .pipe(
          map((params) => Number(params.get('ply'))),
          map((ply) => Number.isInteger(ply) && ply > 0 ? ply : null),
          distinctUntilChanged(),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe((ply) => {
          this.appliedPly.set(null);
          this.requestedPly.set(ply);
        });
    }
  }

  @HostListener('window:keydown', ['$event'])
  protected onKeyDown(event: KeyboardEvent): void {
    this.store.handleKeyboard(event);
  }

  protected async confirmDeleteSelectedSubtree(): Promise<void> {
    const message = this.store.deleteConfirmationText();
    if (!message) return;

    const confirmed = await this.confirmDialog.confirm({
      title: 'Delete local variation?',
      message,
      tone: 'danger',
      confirmLabel: 'Delete variation',
      cancelLabel: 'Cancel',
    });

    if (confirmed) this.store.deleteSelectedSubtree();
  }

  protected generateAiReview(): void {
    const game = this.store.game();
    if (!game || this.store.analysisStatusLabel() !== 'Saved') return;
    void this.aiReviewStore.generate(game.id);
  }

  protected retryTacticalFindings(): void {
    const gameId = this.currentGameId();
    if (gameId) void this.tacticalFindingsStore.load(gameId);
  }

  protected selectFindingMove(plyNumber: number): void {
    this.store.selectNode(plyNumber);
    queueMicrotask(() => {
      this.workbenchAnchor()?.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }
}
