import { ChangeDetectionStrategy, Component, HostListener, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ScenarioBoardShellComponent } from '../../../../shared/training/scenario-board-shell/scenario-board-shell.component';
import { TrainerEngineService } from '../../shared/trainer-engine.service';
import { ScenarioTrainingApiService } from '../data-access/scenario-training-api.service';
import { TacticalMissedShotTrainerStore } from '../state/tactical-missed-shot-trainer.store';

@Component({
  standalone: true,
  imports: [RouterLink, ScenarioBoardShellComponent],
  providers: [ScenarioTrainingApiService, TrainerEngineService, TacticalMissedShotTrainerStore],
  templateUrl: './tactical-missed-shot-trainer-page.component.html',
  styleUrl: './tactical-missed-shot-trainer-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TacticalMissedShotTrainerPageComponent implements OnInit {
  protected readonly store = inject(TacticalMissedShotTrainerStore);
  private readonly route = inject(ActivatedRoute);

  ngOnInit(): void {
    const sessionId = Number(this.route.snapshot.paramMap.get('sessionId'));
    const detectionId = Number(this.route.snapshot.queryParamMap.get('detectionId'));
    if (Number.isInteger(sessionId) && sessionId > 0) {
      void this.store.loadSession(sessionId);
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
}
