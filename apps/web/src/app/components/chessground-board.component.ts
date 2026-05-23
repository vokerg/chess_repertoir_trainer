import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { Chess } from 'chess.js';
import { Chessground } from '@lichess-org/chessground';

type BoardSide = 'WHITE' | 'BLACK';
type Square = string;

@Component({
  selector: 'app-chessground-board',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="board-shell">
      <div #board class="chessground-board"></div>
    </div>
  `,
  styles: [
    `
    .board-shell {
      width: min(76vw, 520px);
      max-width: 100%;
      aspect-ratio: 1 / 1;
    }

    .chessground-board {
      width: 100%;
      height: 100%;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.18);
      border-radius: 4px;
      overflow: hidden;
    }
    `
  ]
})
export class ChessgroundBoardComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() fen: string = '';
  @Input() side: BoardSide = 'WHITE';
  @Input() lastMove: { from: string; to: string } | null = null;
  @Input() showCoordinates = true;
  @Output() move = new EventEmitter<string>();

  @ViewChild('board', { static: true }) boardElement!: ElementRef<HTMLElement>;

  private ground: any | null = null;
  private game = new Chess();

  ngAfterViewInit() {
    this.game = this.createGame(this.fen);
    this.ground = Chessground(this.boardElement.nativeElement, this.config());
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.ground) return;
    if (changes['fen'] || changes['side'] || changes['lastMove'] || changes['showCoordinates']) {
      this.game = this.createGame(this.fen);
      this.ground.set(this.config());
    }
  }

  ngOnDestroy() {
    this.ground?.destroy?.();
    this.ground = null;
  }

  private createGame(fen: string) {
    try {
      return fen === 'startpos' || !fen ? new Chess() : new Chess(fen);
    } catch {
      return new Chess();
    }
  }

  private config() {
    const turnColor = this.game.turn() === 'w' ? 'white' : 'black';
    return {
      fen: this.game.fen(),
      orientation: this.side === 'WHITE' ? 'white' : 'black',
      coordinates: this.showCoordinates,
      highlight: {
        lastMove: true,
        check: true,
      },
      lastMove: this.lastMove ? [this.lastMove.from, this.lastMove.to] : undefined,
      movable: {
        free: false,
        color: turnColor,
        dests: this.legalDests(),
        showDests: true,
        events: {
          after: (from: Square, to: Square) => this.handleMove(from, to),
        },
      },
      draggable: {
        enabled: true,
        showGhost: true,
      },
      selectable: {
        enabled: true,
      },
      animation: {
        enabled: true,
        duration: 160,
      },
    };
  }

  private legalDests() {
    const dests = new Map<string, string[]>();
    for (const move of this.game.moves({ verbose: true }) as any[]) {
      const from = move.from;
      const to = move.to;
      const existing = dests.get(from) ?? [];
      existing.push(to);
      dests.set(from, existing);
    }
    return dests;
  }

  private handleMove(from: Square, to: Square) {
    const legalMoves = this.game.moves({ verbose: true }) as any[];
    const matching = legalMoves.find((m) => m.from === from && m.to === to);
    if (!matching) {
      this.ground?.set(this.config());
      return;
    }

    const uci = from + to + (matching.promotion || '');
    this.move.emit(uci);

    // The server is the source of truth. Reset immediately; parent inputs will
    // update the board to the accepted FEN after the API response.
    queueMicrotask(() => this.ground?.set(this.config()));
  }
}
