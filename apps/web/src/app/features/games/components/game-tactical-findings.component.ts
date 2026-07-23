import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { type GameTacticalFinding } from '../data-access/game-tactical-findings-api.service';

@Component({
  selector: 'app-game-tactical-findings',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './game-tactical-findings.component.html',
  styleUrl: './game-tactical-findings.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameTacticalFindingsComponent {
  readonly gameId = input.required<number>();
  readonly findings = input<readonly GameTacticalFinding[]>([]);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly retry = output<void>();
  readonly moveSelected = output<number>();
  readonly missedShotCount = computed(() => this.findings().filter((item) => item.kind === 'MISSED_SHOT').length);
  readonly blunderCount = computed(() => this.findings().filter((item) => item.kind === 'USER_BLUNDER').length);

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
