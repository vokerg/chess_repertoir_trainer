import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { BoardActionToolbarComponent } from '../../chess/board/board-action-toolbar.component';
import { ChessgroundBoardComponent } from '../../chess/board/chessground-board.component';

export type ScenarioBoardMode = 'context' | 'challenge' | 'result';
export type ScenarioBoardColor = 'WHITE' | 'BLACK';

export interface ScenarioBoardContextPly {
  plyNumber: number;
  moveNumber: number;
  moveUci: string;
  moveSan: string | null;
  fenBefore: string;
  fenAfter: string;
  isUserMove: boolean;
}

export interface ScenarioBoardGameHeader {
  whiteUsername?: string | null;
  blackUsername?: string | null;
  userColor?: ScenarioBoardColor;
  opponentUsername?: string | null;
  resultForUser?: string | null;
  gameResult?: string | null;
  openingEco?: string | null;
  openingName?: string | null;
  endedAt?: string | null;
  providerUrl?: string | null;
}

@Component({
  selector: 'app-scenario-board-shell',
  standalone: true,
  imports: [BoardActionToolbarComponent, ChessgroundBoardComponent],
  templateUrl: './scenario-board-shell.component.html',
  styleUrl: './scenario-board-shell.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScenarioBoardShellComponent {
  readonly mode = input<ScenarioBoardMode>('context');
  readonly currentFen = input.required<string>();
  readonly side = input<ScenarioBoardColor>('WHITE');
  readonly lastMove = input<{ from: string; to: string } | null>(null);
  readonly contextPlies = input<ScenarioBoardContextPly[]>([]);
  readonly selectedContextPly = input<number | null>(null);
  readonly challengePlyNumber = input.required<number>();
  readonly boardDisabled = input(false);
  readonly boardPositionVersion = input(0);
  readonly gameHeader = input<ScenarioBoardGameHeader>({});

  readonly boardMove = output<string>();
  readonly goStart = output<void>();
  readonly goPrevious = output<void>();
  readonly goNext = output<void>();
  readonly goChallenge = output<void>();
  readonly contextPlySelected = output<number>();

  protected readonly modeLabel = computed(() => {
    if (this.mode() === 'challenge') return 'Your move';
    if (this.mode() === 'result') return 'Attempt result';
    return 'Reviewing game context';
  });

  protected readonly openingLabel = computed(() => {
    const header = this.gameHeader();
    return [header.openingEco, header.openingName].filter(Boolean).join(' ') || null;
  });

  protected readonly dateLabel = computed(() => {
    const endedAt = this.gameHeader().endedAt;
    if (!endedAt) return null;
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(endedAt));
  });

  protected readonly selectedContextIndex = computed(() => {
    const selected = this.selectedContextPly();
    if (selected === null) return -1;
    return this.contextPlies().findIndex((ply) => ply.plyNumber === selected);
  });

  protected readonly canGoBackward = computed(() => this.mode() !== 'context' || this.selectedContextIndex() >= 0);
  protected readonly canGoForward = computed(() => {
    if (this.mode() !== 'context') return true;
    const index = this.selectedContextIndex();
    return index < this.contextPlies().length - 1;
  });

  protected moveLabel(ply: ScenarioBoardContextPly): string {
    const san = ply.moveSan || ply.moveUci;
    return ply.plyNumber % 2 === 1 ? `${ply.moveNumber}. ${san}` : san;
  }
}
