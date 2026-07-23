import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  GameTacticalFinding,
  GameTacticalFindingsApiService,
} from '../data-access/game-tactical-findings-api.service';

@Component({
  selector: 'app-game-tactical-findings',
  standalone: true,
  imports: [RouterLink],
  providers: [GameTacticalFindingsApiService],
  templateUrl: './game-tactical-findings.component.html',
  styleUrl: './game-tactical-findings.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameTacticalFindingsComponent implements OnInit {
  private readonly api = inject(GameTacticalFindingsApiService);

  readonly gameId = input.required<number>();
  readonly moveSelected = output<number>();
  readonly findings = signal<readonly GameTacticalFinding[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly missedShotCount = computed(() => this.findings().filter((item) => item.kind === 'MISSED_SHOT').length);
  readonly blunderCount = computed(() => this.findings().filter((item) => item.kind === 'USER_BLUNDER').length);

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.findings.set(await firstValueFrom(this.api.getForGame(this.gameId())));
    } catch {
      this.error.set('Could not load tactical findings for this game.');
    } finally {
      this.loading.set(false);
    }
  }

  protected kindLabel(item: GameTacticalFinding): string {
    if (item.kind === 'MISSED_SHOT') return 'Missed shot';
    if (item.kind === 'PUNISHED_OPPONENT_BLUNDER') return 'Punished blunder';
    return 'My blunder';
  }

  protected moveLabel(item: GameTacticalFinding): string {
    return `${Math.ceil(item.triggerPlyNumber / 2)} · ${item.moveUci}`;
  }

  protected trainingRoute(item: GameTacticalFinding): string | null {
    if (item.kind === 'MISSED_SHOT') return '/scenario-training/tactical-missed-shot';
    if (item.kind === 'USER_BLUNDER') return '/scenario-training/tactical-blunder';
    return null;
  }
}
