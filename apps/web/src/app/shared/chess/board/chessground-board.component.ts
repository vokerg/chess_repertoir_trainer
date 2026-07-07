import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  NgZone,
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
import { ACTIVE_CHESS_BOARD_THEME } from './chess-board-theme';
import { ChessSoundService } from '../services/chess-sound.service';

type BoardSide = 'WHITE' | 'BLACK';
type BoardArrowShape = { orig: Key; dest: Key; brush: string };
type PromotionPiece = 'q' | 'r' | 'b' | 'n';
type PendingPromotion = {
  from: Key;
  to: Key;
  color: Color;
  moves: VerboseMove[];
};
type VerboseMove = {
  from: string;
  to: string;
  captured?: string;
  promotion?: PromotionPiece;
};

@Component({
  selector: 'app-chessground-board',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="board-shell">
      <div #board class="chessground-board"></div>
      @if (pendingPromotion) {
        <div
          class="promotion-picker-backdrop"
          [style.--promotion-left]="promotionPickerPosition().left"
          [style.--promotion-top]="promotionPickerPosition().top"
          aria-label="Choose promotion piece"
        >
          <div class="promotion-picker cg-wrap" role="group" aria-label="Choose promotion piece">
            @for (option of promotionOptions; track option.id) {
              <button
                type="button"
                class="promotion-option"
                [attr.aria-label]="option.label"
                [title]="option.label"
                [disabled]="!isPromotionAvailable(option.id)"
                (click)="selectPromotion(option.id)"
              >
                <piece
                  class="promotion-piece"
                  [class.white]="pendingPromotion.color === 'white'"
                  [class.black]="pendingPromotion.color === 'black'"
                  [class.queen]="option.role === 'queen'"
                  [class.knight]="option.role === 'knight'"
                  [class.rook]="option.role === 'rook'"
                  [class.bishop]="option.role === 'bishop'"
                ></piece>
              </button>
            }
          </div>
        </div>
      }
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
        position: relative;
        width: 100%;
        height: 100%;
        aspect-ratio: 1 / 1;
        border-radius: var(--board-radius);
        padding: var(--board-rim);
        background: var(--board-rim-color);
        box-shadow: var(--board-shadow);
        box-sizing: border-box;
      }

      .chessground-board {
        width: 100%;
        height: 100%;
        border-radius: calc(var(--board-radius) - var(--board-rim));
        overflow: hidden;
      }

      .promotion-picker-backdrop {
        position: absolute;
        inset: var(--board-rim);
        z-index: 20;
        border-radius: calc(var(--board-radius) - var(--board-rim));
        background: var(--promotion-backdrop);
      }

      .promotion-picker {
        position: absolute;
        top: var(--promotion-top);
        left: var(--promotion-left);
        display: grid;
        grid-template-rows: repeat(4, minmax(0, 1fr));
        width: 12.5%;
        height: 50%;
        border: 1px solid var(--promotion-border);
        border-radius: 0;
        overflow: hidden;
        box-shadow: var(--promotion-shadow);
      }

      .promotion-option {
        position: relative;
        display: block;
        width: 100%;
        min-width: 0;
        min-height: 0;
        border: 0;
        border-bottom: 1px solid var(--promotion-option-border);
        border-radius: 0;
        background: var(--promotion-option-bg);
        cursor: pointer;
      }

      .promotion-option:last-child {
        border-bottom: 0;
      }

      .promotion-option:hover:not(:disabled),
      .promotion-option:focus-visible {
        background: var(--promotion-option-active-bg);
        outline: none;
      }

      .promotion-option:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }

      piece.promotion-piece {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        background-size: 92%;
        background-position: center;
        background-repeat: no-repeat;
        pointer-events: none;
      }

      :host.board-theme-walnut {
        --board-light-square: #edd9b7;
        --board-dark-square: #9d6b42;
        --board-last-move: rgba(245, 207, 87, 0.58);
        --board-dest-dot: rgba(41, 72, 45, 0.55);
        --board-dest-ring: rgba(41, 72, 45, 0.32);
        --board-selected: rgba(47, 88, 54, 0.45);
        --board-coordinate-light: rgba(255, 250, 239, 0.9);
        --board-coordinate-dark: rgba(76, 47, 29, 0.86);
        --board-radius: 10px;
        --board-rim: 4px;
        --board-rim-color: #5f3b24;
        --board-shadow: 0 14px 30px rgba(40, 24, 13, 0.28), 0 2px 8px rgba(40, 24, 13, 0.2);
        --promotion-backdrop: rgba(35, 22, 14, 0.28);
        --promotion-border: rgba(95, 59, 36, 0.32);
        --promotion-shadow: 0 18px 36px rgba(42, 25, 13, 0.32);
        --promotion-option-bg: #fffaf2;
        --promotion-option-border: rgba(95, 59, 36, 0.22);
        --promotion-option-active-bg: #f3dfbf;
      }

      :host.board-theme-sage {
        --board-light-square: #e5e2c8;
        --board-dark-square: #7f9b75;
        --board-last-move: rgba(238, 201, 81, 0.56);
        --board-dest-dot: rgba(36, 78, 65, 0.52);
        --board-dest-ring: rgba(36, 78, 65, 0.28);
        --board-selected: rgba(44, 96, 78, 0.42);
        --board-coordinate-light: rgba(252, 251, 236, 0.9);
        --board-coordinate-dark: rgba(44, 68, 50, 0.86);
        --board-radius: 10px;
        --board-rim: 4px;
        --board-rim-color: #536a4d;
        --board-shadow: 0 14px 30px rgba(42, 61, 45, 0.24), 0 2px 8px rgba(42, 61, 45, 0.18);
        --promotion-backdrop: rgba(29, 45, 33, 0.28);
        --promotion-border: rgba(83, 106, 77, 0.32);
        --promotion-shadow: 0 18px 36px rgba(29, 45, 33, 0.28);
        --promotion-option-bg: #fffff7;
        --promotion-option-border: rgba(83, 106, 77, 0.22);
        --promotion-option-active-bg: #dfe8d2;
      }

      :host.board-theme-slate {
        --board-light-square: #d7dde2;
        --board-dark-square: #657786;
        --board-last-move: rgba(236, 196, 73, 0.58);
        --board-dest-dot: rgba(30, 58, 80, 0.5);
        --board-dest-ring: rgba(30, 58, 80, 0.28);
        --board-selected: rgba(35, 73, 99, 0.4);
        --board-coordinate-light: rgba(247, 250, 252, 0.88);
        --board-coordinate-dark: rgba(35, 48, 59, 0.86);
        --board-radius: 8px;
        --board-rim: 3px;
        --board-rim-color: #3e4c59;
        --board-shadow: 0 14px 30px rgba(37, 48, 59, 0.24), 0 2px 8px rgba(37, 48, 59, 0.18);
        --promotion-backdrop: rgba(24, 33, 42, 0.3);
        --promotion-border: rgba(62, 76, 89, 0.3);
        --promotion-shadow: 0 18px 36px rgba(24, 33, 42, 0.3);
        --promotion-option-bg: #ffffff;
        --promotion-option-border: rgba(62, 76, 89, 0.22);
        --promotion-option-active-bg: #e2e9ef;
      }

      :host.board-theme-training {
        --board-light-square: #f1e6c9;
        --board-dark-square: #4d8b8f;
        --board-last-move: rgba(255, 213, 79, 0.62);
        --board-dest-dot: rgba(26, 94, 88, 0.54);
        --board-dest-ring: rgba(26, 94, 88, 0.3);
        --board-selected: rgba(21, 102, 95, 0.43);
        --board-coordinate-light: rgba(255, 252, 241, 0.9);
        --board-coordinate-dark: rgba(31, 71, 74, 0.88);
        --board-radius: 12px;
        --board-rim: 4px;
        --board-rim-color: #2f6468;
        --board-shadow: 0 14px 30px rgba(28, 68, 71, 0.25), 0 2px 8px rgba(28, 68, 71, 0.18);
        --promotion-backdrop: rgba(21, 60, 63, 0.28);
        --promotion-border: rgba(47, 100, 104, 0.32);
        --promotion-shadow: 0 18px 36px rgba(21, 60, 63, 0.28);
        --promotion-option-bg: #fffdf7;
        --promotion-option-border: rgba(47, 100, 104, 0.22);
        --promotion-option-active-bg: #d8ecea;
      }

      :host ::ng-deep cg-board {
        background-color: var(--board-light-square);
        background-image: conic-gradient(
          var(--board-dark-square) 25%,
          var(--board-light-square) 0 50%,
          var(--board-dark-square) 0 75%,
          var(--board-light-square) 0
        );
        background-size: 25% 25%;
      }

      :host ::ng-deep cg-board square.last-move {
        background-color: var(--board-last-move);
      }

      :host ::ng-deep cg-board square.selected {
        background-color: var(--board-selected);
      }

      :host ::ng-deep cg-board square.move-dest {
        background: radial-gradient(var(--board-dest-dot) 22%, transparent 24%);
      }

      :host ::ng-deep cg-board square.oc.move-dest {
        background: radial-gradient(transparent 0%, transparent 78%, var(--board-dest-ring) 80%);
      }

      :host ::ng-deep cg-board square.move-dest:hover,
      :host ::ng-deep cg-board square.move-dest.hover {
        background: var(--board-selected);
      }

      :host ::ng-deep .orientation-white .ranks :nth-child(odd),
      :host ::ng-deep .orientation-white .files :nth-child(even),
      :host ::ng-deep .orientation-black .ranks :nth-child(even),
      :host ::ng-deep .orientation-black .files :nth-child(odd),
      :host ::ng-deep coords.squares:nth-of-type(odd) :nth-child(even),
      :host ::ng-deep coords.squares:nth-of-type(even) :nth-child(odd) {
        color: var(--board-coordinate-dark);
      }

      :host ::ng-deep .orientation-white .ranks :nth-child(even),
      :host ::ng-deep .orientation-white .files :nth-child(odd),
      :host ::ng-deep .orientation-black .ranks :nth-child(odd),
      :host ::ng-deep .orientation-black .files :nth-child(even),
      :host ::ng-deep coords.squares:nth-of-type(odd) :nth-child(odd),
      :host ::ng-deep coords.squares:nth-of-type(even) :nth-child(even) {
        color: var(--board-coordinate-light);
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
  @Input() movable = true;
  @Input() positionVersion = 0;
  @Output() move = new EventEmitter<string>();

  @ViewChild('board', { static: true }) boardElement!: ElementRef<HTMLElement>;
  @HostBinding('style.--chess-board-size') get boardSize(): string | null {
    return this.size;
  }
  @HostBinding('class') readonly themeClass = `board-theme-${ACTIVE_CHESS_BOARD_THEME}`;

  protected readonly promotionOptions: Array<{ id: PromotionPiece; label: string; role: string }> = [
    { id: 'q', label: 'Queen', role: 'queen' },
    { id: 'n', label: 'Knight', role: 'knight' },
    { id: 'r', label: 'Rook', role: 'rook' },
    { id: 'b', label: 'Bishop', role: 'bishop' },
  ];
  protected pendingPromotion: PendingPromotion | null = null;
  private ground: Api | null = null;
  private game = new Chess();
  private pendingMove: string | null = null;

  constructor(
    private sounds: ChessSoundService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef,
  ) {}

  ngAfterViewInit() {
    this.game = this.createGame(this.fen);
    this.ground = Chessground(this.boardElement.nativeElement, this.config());
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.ground) return;
    if (changes['fen'] || changes['side'] || changes['positionVersion']) {
      this.playExternalMoveSound(changes);
      this.game = this.createGame(this.fen);
      this.resetPendingMoveState();
      this.ground.set(this.config());
      return;
    }

    if (changes['lastMove'] || changes['showCoordinates'] || changes['arrows'] || changes['movable']) {
      this.ground.set(this.config());
    }
  }

  ngOnDestroy() {
    this.resetPendingMoveState();
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
        color: this.isBoardLocked() ? undefined : turnColor,
        dests: this.isBoardLocked() ? new Map<Key, Key[]>() : this.legalDests(),
        showDests: true,
        events: {
          after: (from: Key, to: Key) => this.zone.run(() => this.handleMove(from, to)),
        },
      },
      draggable: {
        enabled: !this.isBoardLocked(),
        showGhost: true,
      },
      selectable: {
        enabled: !this.isBoardLocked(),
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
      const existing = new Set<Key>(dests.get(from) ?? []);
      existing.add(to);
      dests.set(from, Array.from(existing));
    }
    return dests;
  }

  private handleMove(from: Key, to: Key) {
    if (this.isBoardLocked()) return;
    if (!this.movable) return;

    const legalMoves = this.game.moves({ verbose: true }) as VerboseMove[];
    const matching = legalMoves.filter((m) => m.from === from && m.to === to);
    if (matching.length === 0) {
      this.resetPendingMoveState();
      this.ground?.set(this.config());
      this.sounds.play('error');
      this.cdr.markForCheck();
      return;
    }

    const promotionMoves = matching.filter((move): move is VerboseMove & { promotion: PromotionPiece } =>
      this.isPromotionPiece(move.promotion),
    );
    if (promotionMoves.length > 0) {
      const promotionColor: Color = this.game.turn() === 'w' ? 'white' : 'black';
      this.pendingPromotion = { from, to, color: promotionColor, moves: promotionMoves };
      this.ground?.set(this.config());
      this.cdr.markForCheck();
      return;
    }

    this.commitMove(matching[0], undefined);
  }

  protected isPromotionAvailable(piece: PromotionPiece): boolean {
    return this.pendingPromotion?.moves.some((move) => move.promotion === piece) ?? false;
  }

  protected promotionPickerPosition(): { left: string; top: string } {
    const target = this.pendingPromotion?.to;
    if (!target) return { left: '0%', top: '0%' };

    const file = target.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = Number(target[1]) - 1;
    const visibleFile = this.side === 'WHITE' ? file : 7 - file;
    const visibleRank = this.side === 'WHITE' ? 7 - rank : rank;
    return {
      left: `${visibleFile * 12.5}%`,
      top: visibleRank < 4 ? '0%' : '50%',
    };
  }

  protected selectPromotion(piece: PromotionPiece): void {
    const pendingPromotion = this.pendingPromotion;
    const matching = pendingPromotion?.moves.find((move) => move.promotion === piece);
    if (!pendingPromotion || !matching) {
      this.resetPendingMoveState();
      this.ground?.set(this.config());
      this.sounds.play('error');
      this.cdr.markForCheck();
      return;
    }

    this.commitMove(matching, piece);
  }

  private commitMove(matching: VerboseMove, promotion: PromotionPiece | undefined): void {
    const from = matching.from as Key;
    const to = matching.to as Key;
    const uci = from + to + (matching.promotion || '');
    this.game.move({ from, to, promotion });
    this.pendingMove = uci;
    this.pendingPromotion = null;
    this.sounds.play(matching.captured ? 'capture' : 'move');
    this.ground?.set(this.config());
    this.cdr.markForCheck();
    this.move.emit(uci);
  }

  private playExternalMoveSound(changes: SimpleChanges): void {
    if (!changes['fen'] || changes['fen'].firstChange) return;
    if (!this.lastMove || changes['fen'].currentValue === changes['fen'].previousValue) return;

    const lastMoveUci = `${this.lastMove.from}${this.lastMove.to}`;
    if (this.pendingMove && lastMoveUci === this.pendingMove.substring(0, 4)) return;

    const legalMoves = this.game.moves({ verbose: true }) as VerboseMove[];
    const matchingMoves = legalMoves.filter(
      (move) => move.from === this.lastMove?.from && move.to === this.lastMove?.to,
    );
    const nextFen = this.createGame(this.fen).fen();

    for (const matching of matchingMoves) {
      const preview = this.createGame(this.game.fen());
      try {
        preview.move({
          from: matching.from,
          to: matching.to,
          promotion: matching.promotion,
        });
      } catch {
        continue;
      }

      if (preview.fen() === nextFen) {
        this.sounds.play(matching.captured ? 'capture' : 'move');
        return;
      }
    }
  }

  private isBoardLocked(): boolean {
    return Boolean(this.pendingMove || this.pendingPromotion || !this.movable);
  }

  private resetPendingMoveState(): void {
    this.pendingMove = null;
    this.pendingPromotion = null;
  }

  private isPromotionPiece(piece: string | undefined): piece is PromotionPiece {
    return piece === 'q' || piece === 'r' || piece === 'b' || piece === 'n';
  }
}
