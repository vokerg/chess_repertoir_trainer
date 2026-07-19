import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  inject,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';
import { AiCapabilitiesService } from '../../../core/ai/ai-capabilities.service';
import { GameAiReviewWidgetComponent } from '../components/game-ai-review-widget.component';
import { GameDetailHeaderComponent } from '../components/game-detail-header.component';
import { GameSummaryComponent } from '../components/game-summary.component';
import { GameWorkbenchComponent } from '../components/game-workbench.component';
import { GameDetailStore } from '../state/game-detail.store';
import { GameAiReviewStore } from '../state/game-ai-review.store';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';

@Component({
  selector: 'app-game-detail-page',
  standalone: true,
  imports: [
    GameAiReviewWidgetComponent,
    GameDetailHeaderComponent,
    GameSummaryComponent,
    GameWorkbenchComponent,
    PanelComponent,
  ],
  providers: [GameDetailStore, GameAiReviewStore],
  templateUrl: './game-detail-page.component.html',
  styleUrl: './game-detail-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly capabilities = inject(AiCapabilitiesService);
  protected readonly store = inject(GameDetailStore);
  protected readonly aiReviewStore = inject(GameAiReviewStore);

  protected readonly aiReviewAvailable = toSignal(
    this.capabilities.getCapabilities().pipe(map((response) => response.widgets.gameReview)),
    { initialValue: false },
  );

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        map((params) => Number(params.get('gameId'))),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((gameId) => {
        this.aiReviewStore.reset();
        this.store.initialize(gameId);
      });
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
}
