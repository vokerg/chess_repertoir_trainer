import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { Chess } from 'chess.js';
import { Chessground } from '@lichess-org/chessground';
import type { Api } from '@lichess-org/chessground/api';
import type { Config } from '@lichess-org/chessground/config';
import type { Color, Key } from '@lichess-org/chessground/types';
import { ChessSoundService } from '../services/chess-sound.service';

type BoardSide = 'WHITE' | 'BLACK';
type BoardArrowShape = { orig: Key; dest: Key; brush: string };
type VerboseMove = {
  from: string;
  to: string;
  captured?: string;
  promotion?: string;
};

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
      :host {
        display: block;
        width: min(100%, var(--chess-board-size, 520px));
        min-width: 0;
        aspect-ratio: 1 / 1;
      }

      .board-shell {
        width: 100%;
        height: 100%;
        aspect-ratio: 1 / 1;
      }

      .chessground-board {
        width: 100%;
        height: 100%;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.18);
        border-radius: 4px;
        overflow: hidden;
      }
    `,
  ],
})
export class ChessgroundBoardComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() fen: string = '';
  @Input() side: BoardSide = 'WHITE';
  @Input() size: string | null = null;
  @Input() lastMove: { from: string; to: string } | null = null;
  @Input() arrows: Array<{ from: string; to: string; brush?: string }> = [];
  @Input() showCoordinates = true;
  @Input() sound = true;
  @Input() positionVersion = 0;
  @Output() move = new EventEmitter<string>();

  @ViewChild('board', { static: true }) boardElement!: ElementRef<HTMLElement>;
  @HostBinding('style.--chess-board-size') get boardSize(): string | null {
    return this.size;
  }

  private ground: Api | null = null;
  private game = new Chess();
  private pendingMove: string | null = null;

  constructor(private sounds: ChessSoundService) {}

  ngAfterViewInit() {
    this.game = this.createGame(this.fen);
    this.ground = Chessground(this.boardElement.nativeElement, this.config());
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.ground) return;
    if (changes['fen'] || changes['side'] || changes['positionVersion']) {
      this.playExternalMoveSound(changes);
      this.game = this.createGame(this.fen);
      this.pendingMove = null;
      this.ground.set(this.config());
      return;
    }

    if (changes['lastMove'] || changes['showCoordinates'] || changes['arrows']) {
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

  private config(): Config {
    const turnColor: Color = this.game.turn() === 'w' ? 'white' : 'black';
    return {
      fen: this.game.fen(),
      orientation: this.side === 'WHITE' ? 'white' : 'black',
      turnColor,
      coordinates: this.showCoordinates,
      highlight: {
        lastMove: true,
        check: true,
      },
      lastMove: this.lastMove ? [this.lastMove.from as Key, this.lastMove.to as Key] : undefined,
      drawable: {
        enabled: true,
        visible: true,
        autoShapes: this.arrowShapes() as any,
      },
      movable: {
        free: false,
        color: this.pendingMove ? undefined : turnColor,
        dests: this.pendingMove ? new Map<Key, Key[]>() : this.legalDests(),
        showDests: true,
        events: {
          after: (from: Key, to: Key) => this.handleMove(from, to),
        },
      },
      draggable: {
        enabled: !this.pendingMove,
        showGhost: true,
      },
      selectable: {
        enabled: !this.pendingMove,
      },
      animation: {
        enabled: true,
        duration: 160,
      },
    };
  }

  private arrowShapes(): BoardArrowShape[] {
    return (this.arrows || [])
      .filter((arrow) => arrow.from && arrow.to)
      .map((arrow) => ({
        orig: arrow.from as Key,
        dest: arrow.to as Key,
        brush: arrow.brush || 'green',
      }));
  }

  private legalDests(): Map<Key, Key[]> {
    const dests = new Map<Key, Key[]>();
    for (const move of this.game.moves({ verbose: true }) as VerboseMove[]) {
      const from = move.from as Key;
      const to = move.to as Key;
      const existing = dests.get(from) ?? [];
      existing.push(to);
      dests.set(from, existing);
    }
    return dests;
  }

  private handleMove(from: Key, to: Key) {
    if (this.pendingMove) return;

    const legalMoves = this.game.moves({ verbose: true }) as VerboseMove[];
    const matching = legalMoves.find((m) => m.from === from && m.to === to);
    if (!matching) {
      this.ground?.set(this.config());
      if (this.sound) this.sounds.play('error');
      return;
    }

    const uci = from + to + (matching.promotion || '');
    this.game.move({ from, to, promotion: matching.promotion || 'q' });
    this.pendingMove = uci;
    if (this.sound) this.sounds.play(matching.captured ? 'capture' : 'move');
    this.ground?.set(this.config());
    this.move.emit(uci);
  }

  private playExternalMoveSound(changes: SimpleChanges): void {
    if (!this.sound || !changes['fen'] || changes['fen'].firstChange) return;
    if (!this.lastMove || changes['fen'].currentValue === changes['fen'].previousValue) return;

    const lastMoveUci = `${this.lastMove.from}${this.lastMove.to}`;
    if (this.pendingMove && lastMoveUci === this.pendingMove.substring(0, 4)) return;

    const legalMoves = this.game.moves({ verbose: true }) as VerboseMove[];
    const matching = legalMoves.find(
      (move) => move.from === this.lastMove?.from && move.to === this.lastMove?.to,
    );
    if (!matching) return;

    const preview = this.createGame(this.game.fen());
    try {
      preview.move({
        from: matching.from,
        to: matching.to,
        promotion: matching.promotion || 'q',
      });
    } catch {
      return;
    }

    if (preview.fen() !== this.createGame(this.fen).fen()) return;
    this.sounds.play(matching.captured ? 'capture' : 'move');
  }
}
