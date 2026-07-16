import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import type { MastersExplorerResponse } from '@chess-trainer/contracts/masters-explorer';
import { firstValueFrom } from 'rxjs';
import { ProgressiveListComponent } from '../ui/progressive-list/progressive-list.component';
import { MastersExplorerApiService } from './masters-explorer-api.service';
import {
  gameDateLabel,
  gameResultLabel,
  percentage,
  playerLabel,
  sameOpening,
} from './masters-explorer.helpers';

@Component({
  selector: 'app-masters-explorer-widget',
  standalone: true,
  imports: [ProgressiveListComponent],
  templateUrl: './masters-explorer-widget.component.html',
  styleUrl: './masters-explorer-widget.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MastersExplorerWidgetComponent {
  private readonly api = inject(MastersExplorerApiService);

  readonly fen = input.required<string>();
  readonly moveSelected = output<string>();

  readonly response = signal<MastersExplorerResponse | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  protected readonly hasGames = computed(() => (this.response()?.games.total ?? 0) > 0);
  protected readonly percentage = percentage;
  protected readonly gameResultLabel = gameResultLabel;
  protected readonly gameDateLabel = gameDateLabel;
  protected readonly playerLabel = playerLabel;
  protected readonly sameOpening = sameOpening;

  private requestId = 0;
  private requestedFen: string | null = null;

  constructor() {
    effect(() => {
      const fen = this.fen();
      if (fen === this.requestedFen) return;
      this.requestedFen = fen;
      untracked(() => void this.loadForFen(fen));
    });
  }

  protected retry(): void {
    void this.loadForFen(this.fen());
  }

  private async loadForFen(fen: string): Promise<void> {
    const currentRequestId = ++this.requestId;
    this.loading.set(true);
    this.error.set(null);
    this.response.set(null);

    try {
      const response = await firstValueFrom(this.api.getPosition(fen));
      if (currentRequestId !== this.requestId) return;
      this.response.set(response);
    } catch (error) {
      if (currentRequestId !== this.requestId) return;
      this.error.set(readError(error));
    } finally {
      if (currentRequestId === this.requestId) this.loading.set(false);
    }
  }
}

function readError(error: unknown): string {
  const response = error as {
    error?: string | { error?: string; message?: string };
    message?: string;
  };
  if (typeof response?.error === 'string' && response.error) return response.error;
  if (typeof response?.error === 'object') {
    if (response.error.error) return response.error.error;
    if (response.error.message) return response.error.message;
  }
  return 'Could not load Masters explorer data.';
}
