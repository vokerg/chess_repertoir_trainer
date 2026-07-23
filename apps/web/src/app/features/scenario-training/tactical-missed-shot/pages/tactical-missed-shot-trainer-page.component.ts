import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnInit,
  computed,
  inject,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AnalysisWorkbenchComponent } from '../../../../shared/analysis/workbench/analysis-workbench.component';
import {
  PageHeaderAction,
  PageHeaderComponent,
} from '../../../../shared/ui/page-header/page-header.component';
import { ScenarioBoardShellComponent } from '../../../../shared/training/scenario-board-shell/scenario-board-shell.component';
import { TrainerEngineService } from '../../shared/trainer-engine.service';
import { ScenarioTrainingApiService } from '../data-access/scenario-training-api.service';
import { tacticalScenarioTrainerConfig } from '../helpers/tactical-scenario-trainer.config';
import { TacticalScenarioTrainerStore } from '../state/tactical-missed-shot-trainer.store';

@Component({
  standalone: true,
  imports: [AnalysisWorkbenchComponent, PageHeaderComponent, ScenarioBoardShellComponent],
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
  private gameId: number | null = null;

  protected readonly headerActions = computed<readonly PageHeaderAction[]>(() => [
    {
      id: 'next-scenario',
      label: this.gameId ? 'Next in this game' : 'Next scenario',
      disabled: this.store.loading() || this.store.evaluating() || this.store.disliking(),
      run: () => this.nextScenario(),
    },
  ]);

  ngOnInit(): void {
    this.store.configure(tacticalScenarioTrainerConfig(this.route.snapshot.data['scenarioKind']));
    const sessionId = Number(this.route.snapshot.paramMap.get('sessionId'));
    const detectionId = Number(this.route.snapshot.queryParamMap.get('detectionId'));
    const gameId = Number(this.route.snapshot.queryParamMap.get('gameId'));
    this.gameId = Number.isInteger(gameId) && gameId > 0 ? gameId : null;

    if (Number.isInteger(sessionId) && sessionId > 0) {
      void this.store.loadSession(sessionId);
      return;
    }
    if (Number.isInteger(detectionId) && detectionId > 0) {
      void this.store.startFromDetection(detectionId);
      return;
    }
    if (this.gameId) {
      void this.startGameScenario();
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
    if (this.store.loading()) return this.store.loadingMessage();
    const session = this.store.session();
    if (!session) return this.store.config().emptySubtitle;
    return [this.gameTitle(session), this.gameMeta(session)].filter(Boolean).join(' · ');
  }

  private async nextScenario(): Promise<void> {
    if (!this.gameId) {
      await this.store.nextScenario();
      return;
    }
    await this.startGameScenario(this.store.session()?.sourceId);
  }

  private async startGameScenario(excludeDetectionId?: number): Promise<void> {
    if (!this.gameId || this.store.loading()) return;
    this.store.loading.set(true);
    this.store.error.set(null);
    try {
      const config = this.store.config();
      const session = await firstValueFrom(config.start(this.api, {
        gameId: this.gameId,
        excludeDetectionId,
        random: true,
        excludePassedRecently: true,
      }));
      await this.router.navigate([config.routeBase, session.sessionId], {
        replaceUrl: true,
        queryParams: { gameId: this.gameId },
      });
      await this.store.loadSession(session.sessionId);
    } catch (error) {
      const response = error as { error?: { error?: string; message?: string }; message?: string };
      this.store.error.set(
        response?.error?.error || response?.error?.message || response?.message || this.store.config().startError,
      );
    } finally {
      this.store.loading.set(false);
    }
  }

  private playerLabel(
    username: string | null | undefined,
    rating: number | null | undefined,
  ): string {
    return `${username || 'Unknown'}${rating ? ` (${rating})` : ''}`;
  }
}
