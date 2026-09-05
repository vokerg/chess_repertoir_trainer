import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AnalysisWorkbenchComponent } from '../../../../shared/analysis/workbench/analysis-workbench.component';
import {
  PageHeaderAction,
  PageHeaderComponent,
} from '../../../../shared/ui/page-header/page-header.component';
import { PanelComponent } from '../../../../shared/ui/panel/panel.component';
import { ScenarioBoardShellComponent } from '../../../../shared/training/scenario-board-shell/scenario-board-shell.component';
import { TrainerEngineService } from '../../shared/trainer-engine.service';
import { ScenarioTrainingApiService } from '../data-access/scenario-training-api.service';
import { tacticalScenarioTrainerConfig } from '../helpers/tactical-scenario-trainer.config';
import { TacticalScenarioTrainerStore } from '../state/tactical-missed-shot-trainer.store';

@Component({
  standalone: true,
  imports: [AnalysisWorkbenchComponent, PageHeaderComponent, PanelComponent, ScenarioBoardShellComponent],
  providers: [ScenarioTrainingApiService, TrainerEngineService, TacticalScenarioTrainerStore],
  templateUrl: './tactical-missed-shot-trainer-page.component.html',
  styleUrl: './tactical-missed-shot-trainer-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TacticalScenarioTrainerPageComponent implements OnInit {
  protected readonly store = inject(TacticalScenarioTrainerStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ScenarioTrainingApiService);
  private readonly gameId = signal<number | null>(null);
  private readonly gameTraining = signal(false);
  private cycleStartedAt: string | null = null;
  protected readonly gameTrainingComplete = signal(false);

  protected readonly headerActions = computed<readonly PageHeaderAction[]>(() =>
    this.gameTrainingComplete()
      ? []
      : [
          {
            id: 'next-scenario',
            label: this.gameTraining() ? 'Next in this game' : 'Next scenario',
            disabled: this.store.loading() || this.store.evaluating() || this.store.disliking(),
            run: () => this.nextScenario(),
          },
        ],
  );

  ngOnInit(): void {
    const scenarioKind = this.route.snapshot.data['scenarioKind'];
    this.store.configure(tacticalScenarioTrainerConfig(scenarioKind));
    const sessionId = Number(
      this.route.snapshot.paramMap.get('sessionId') ??
        this.route.snapshot.queryParamMap.get('sessionId'),
    );
    const detectionId = Number(this.route.snapshot.queryParamMap.get('detectionId'));
    const gameId = Number(this.route.snapshot.queryParamMap.get('gameId'));
    this.gameId.set(Number.isInteger(gameId) && gameId > 0 ? gameId : null);
    this.gameTraining.set(scenarioKind === 'game' || this.gameId() !== null);
    this.cycleStartedAt = this.validCycleStart(
      this.route.snapshot.queryParamMap.get('cycleStartedAt'),
    );

    if (
      this.gameTraining() &&
      this.route.snapshot.queryParamMap.get('complete') === 'true'
    ) {
      this.gameTrainingComplete.set(true);
      return;
    }
    if (Number.isInteger(sessionId) && sessionId > 0) {
      void this.store.loadSession(sessionId, { syncConfig: this.gameTraining() });
      return;
    }
    if (this.gameTraining()) {
      if (!this.gameId()) {
        this.store.error.set('A game id is required for game tactical training.');
        return;
      }
      void this.startGameScenario({
        detectionId: Number.isInteger(detectionId) && detectionId > 0 ? detectionId : undefined,
      });
      return;
    }
    if (Number.isInteger(detectionId) && detectionId > 0) {
      void this.store.startFromDetection(detectionId);
      return;
    }
    void this.store.startRandom();
  }

  @HostListener('window:keydown', ['$event'])
  protected onKeyDown(event: KeyboardEvent): void {
    this.store.handleKeyboard(event);
  }

  protected evalLabel(value: number | null | undefined): string {
    if (value === null || value === undefined) return '-';
    const pawns = value / 100;
    return `${pawns > 0 ? '+' : ''}${pawns.toFixed(2)}`;
  }

  protected gameTitle(
    session: {
      whiteUsername?: string | null;
      blackUsername?: string | null;
      whiteRating?: number | null;
      blackRating?: number | null;
    } | null,
  ): string {
    if (!session) return this.store.config().emptySubtitle;
    return `${this.playerLabel(session.whiteUsername, session.whiteRating)} vs ${this.playerLabel(session.blackUsername, session.blackRating)}`;
  }

  protected gameMeta(session: { endedAt?: string | null; gameResult?: string | null }): string {
    return [
      session.gameResult,
      session.endedAt
        ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(session.endedAt))
        : null,
    ]
      .filter(Boolean)
      .join(' · ');
  }

  protected pageSubtitle(): string {
    if (this.gameTrainingComplete()) return 'You have trained every tactical finding in this game.';
    if (this.store.loading()) return this.store.loadingMessage();
    const session = this.store.session();
    if (!session) return this.store.config().emptySubtitle;
    return [this.gameTitle(session), this.gameMeta(session)].filter(Boolean).join(' · ');
  }

  protected pageTitle(): string {
    return this.gameTraining() ? 'Game tactical training' : this.store.config().title;
  }

  protected async nextScenario(): Promise<void> {
    if (!this.gameTraining()) {
      await this.store.nextScenario();
      return;
    }
    await this.startGameScenario({ excludeDetectionId: this.store.session()?.sourceId });
  }

  protected async restartGameTraining(): Promise<void> {
    this.gameTrainingComplete.set(false);
    this.cycleStartedAt = null;
    await this.startGameScenario();
  }

  protected openGame(): void {
    const gameId = this.gameId();
    if (gameId) void this.router.navigate(['/games', gameId]);
  }

  protected async dislikeCurrentScenario(): Promise<void> {
    if (!this.gameTraining()) {
      await this.store.dislikeCurrentScenario();
      return;
    }
    if (await this.store.dislikeCurrentScenario(false)) await this.nextScenario();
  }

  private async startGameScenario(
    selection: { detectionId?: number; excludeDetectionId?: number } = {},
  ): Promise<void> {
    const gameId = this.gameId();
    if (!gameId || this.store.loading()) return;
    this.store.loading.set(true);
    this.store.error.set(null);
    try {
      const session = await firstValueFrom(this.api.startTacticalGame({
        gameId,
        detectionId: selection.detectionId,
        excludeDetectionId: selection.excludeDetectionId,
        random: true,
        excludePassedSince: this.cycleStartedAt ?? undefined,
      }));
      this.cycleStartedAt ??= session.startedAt;
      this.gameTrainingComplete.set(false);
      this.store.adoptSession(session, { syncConfig: true });
      await this.router.navigate(['/scenario-training/tactical-game'], {
        replaceUrl: true,
        queryParams: {
          gameId,
          sessionId: session.sessionId,
          cycleStartedAt: this.cycleStartedAt,
        },
      });
    } catch (error) {
      if (this.isGameTrainingComplete(error)) {
        this.gameTrainingComplete.set(true);
        this.store.error.set(null);
        await this.router.navigate(['/scenario-training/tactical-game'], {
          replaceUrl: true,
          queryParams: {
            gameId,
            cycleStartedAt: this.cycleStartedAt,
            complete: true,
          },
        });
      } else {
        const response = error as { error?: { error?: string; message?: string }; message?: string };
        this.store.error.set(
          response?.error?.error ||
            response?.error?.message ||
            response?.message ||
            this.store.config().startError,
        );
      }
    } finally {
      this.store.loading.set(false);
    }
  }

  private validCycleStart(value: string | null): string | null {
    if (value && !Number.isNaN(Date.parse(value))) return new Date(value).toISOString();
    return null;
  }

  private isGameTrainingComplete(error: unknown): boolean {
    return (
      error instanceof HttpErrorResponse &&
      error.status === 404 &&
      error.error?.error === 'No more tactical findings in this game'
    );
  }

  private playerLabel(
    username: string | null | undefined,
    rating: number | null | undefined,
  ): string {
    return `${username || 'Unknown'}${rating ? ` (${rating})` : ''}`;
  }
}
