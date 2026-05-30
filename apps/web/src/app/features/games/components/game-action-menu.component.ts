import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ImportedGameListItem } from '../data-access/games.models';

@Component({
  selector: 'app-game-action-menu',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="games-action-menu">
      <button
        type="button"
        class="games-action-menu-trigger"
        aria-label="More actions"
        [attr.aria-expanded]="open()"
        (click)="toggle.emit($event)"
      >
        •••
      </button>
      <div *ngIf="open()" class="games-action-menu-panel">
        <button
          *ngIf="!canForceReanalyse(); else reanalyseAction"
          type="button"
          class="games-action-menu-item games-action-menu-item-button"
          (click)="analyse.emit()"
          [disabled]="analysing() || analysisInProgress()"
        >
          {{ analyseActionLabel() }}
        </button>
        <ng-template #reanalyseAction>
          <button
            type="button"
            class="games-action-menu-item games-action-menu-item-button"
            (click)="forceReanalyse.emit()"
            [disabled]="analysing()"
          >
            {{ analysing() ? 'Re-analysing...' : 'Force re-analysis' }}
          </button>
        </ng-template>
        <button
          *ngIf="game().plyIndex?.status !== 'INDEXED'"
          type="button"
          class="games-action-menu-item games-action-menu-item-button"
          (click)="indexPlies.emit()"
          [disabled]="indexing()"
        >
          {{ indexing() ? 'Indexing...' : plyIndexActionLabel() }}
        </button>
        <a
          *ngIf="game().providerUrl"
          class="games-action-menu-item"
          [href]="game().providerUrl"
          target="_blank"
          rel="noreferrer"
          (click)="close.emit()"
        >
          Open on {{ providerLabel() }}
        </a>
      </div>
    </div>
  `,
  styles: [
    `
      .games-action-menu { position: relative; }
      .games-action-menu-trigger { display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 999px; border: 1px solid var(--border); background: rgba(255, 252, 247, 0.92); color: var(--muted-strong); cursor: pointer; font-weight: 900; letter-spacing: 0.12em; padding: 0; }
      .games-action-menu-trigger[aria-expanded='true'] { background: var(--accent-soft); color: var(--accent-strong); border-color: rgba(190, 126, 59, 0.35); }
      .games-action-menu-panel { position: absolute; right: 0; top: calc(100% + 0.4rem); z-index: 3; display: grid; min-width: 170px; padding: 0.45rem; border-radius: 18px; border: 1px solid var(--border); background: rgba(255, 252, 247, 0.98); box-shadow: 0 18px 34px rgba(35, 27, 21, 0.12); }
      .games-action-menu-item { display: block; border-radius: 12px; padding: 0.7rem 0.8rem; color: var(--text); text-decoration: none; font-weight: 700; }
      .games-action-menu-item-button { width: 100%; border: 0; background: transparent; text-align: left; }
      .games-action-menu-item:hover { background: rgba(35, 27, 21, 0.06); color: var(--accent-strong); }
    `,
  ],
})
export class GameActionMenuComponent {
  readonly game = input.required<ImportedGameListItem>();
  readonly open = input(false);
  readonly analysing = input(false);
  readonly indexing = input(false);
  readonly toggle = output<Event>();
  readonly close = output<void>();
  readonly analyse = output<void>();
  readonly forceReanalyse = output<void>();
  readonly indexPlies = output<void>();

  protected canForceReanalyse(): boolean {
    const status = this.game().analysis?.status;
    return status === 'FAILED' || status === 'INTERRUPTED' || status === 'COMPLETED';
  }

  protected analysisInProgress(): boolean {
    const status = this.game().analysis?.status;
    return status === 'QUEUED' || status === 'RUNNING';
  }

  protected analyseActionLabel(): string {
    if (this.analysing()) return 'Queueing...';
    const status = this.game().analysis?.status;
    if (status === 'QUEUED') return 'Queued';
    if (status === 'RUNNING') return 'Analysing...';
    return 'Analyse';
  }

  protected plyIndexActionLabel(): string {
    return this.game().plyIndex?.status === 'FAILED' ? 'Retry ply index' : 'Index plies';
  }

  protected providerLabel(): string {
    const provider = this.game().provider;
    if (provider === 'CHESS_COM') return 'Chess.com';
    if (provider === 'LICHESS') return 'Lichess';
    return 'Provider';
  }
}
