import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  type GameTacticalFinding,
  GameTacticalFindingsApiService,
} from '../data-access/game-tactical-findings-api.service';

export type GameTacticalFindingsStatus = 'IDLE' | 'LOADING' | 'READY' | 'ERROR';

@Injectable()
export class GameTacticalFindingsStore {
  private readonly api = inject(GameTacticalFindingsApiService);
  private requestId = 0;

  readonly status = signal<GameTacticalFindingsStatus>('IDLE');
  readonly findings = signal<readonly GameTacticalFinding[]>([]);
  readonly error = signal<string | null>(null);

  reset(): void {
    this.requestId += 1;
    this.status.set('IDLE');
    this.findings.set([]);
    this.error.set(null);
  }

  async load(gameId: number): Promise<void> {
    const requestId = ++this.requestId;
    this.status.set('LOADING');
    this.error.set(null);

    try {
      const findings = await firstValueFrom(this.api.getForGame(gameId));
      if (requestId !== this.requestId) return;
      this.findings.set(findings);
      this.status.set('READY');
    } catch {
      if (requestId !== this.requestId) return;
      this.error.set('Could not load tactical findings for this game.');
      this.status.set('ERROR');
    }
  }
}
