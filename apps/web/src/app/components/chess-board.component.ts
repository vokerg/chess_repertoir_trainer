import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { Chess } from 'chess.js';

@Component({
  selector: 'app-chess-board',
  standalone: true,
  template: `
    <div class="board-wrapper">
      <!-- File coordinates at top -->
      <div class="coord-row" *ngIf="showCoordinates">
        <div class="coord-cell"></div>
        <div *ngFor="let file of displayFiles" class="coord-cell">{{ file.toUpperCase() }}</div>
      </div>
      <!-- Board with rank coordinates -->
      <div class="board">
        <div *ngFor="let row of boardMatrix; let ri = index" class="board-row">
          <div class="coord-cell" *ngIf="showCoordinates">{{ displayRanks[ri] }}</div>
          <div *ngFor="let cell of row; let ci = index"
               class="square"
               [class.light]="(ri + ci) % 2 === 0"
               [class.dark]="(ri + ci) % 2 === 1"
               [class.selected]="selected === cell.square"
               [class.last]="lastMove && (cell.square === lastMove.from || cell.square === lastMove.to)"
               (click)="onSquareClick(cell.square)">
            <span class="piece">{{ getPieceChar(cell.piece) }}</span>
            <span *ngIf="legalSquares.includes(cell.square) && !cell.piece" class="dot"></span>
          </div>
        </div>
      </div>
      <!-- File coordinates at bottom -->
      <div class="coord-row" *ngIf="showCoordinates">
        <div class="coord-cell"></div>
        <div *ngFor="let file of displayFiles" class="coord-cell">{{ file.toUpperCase() }}</div>
      </div>
    </div>
  `,
  styles: [
    `
    .board-wrapper { display: inline-block; }
    .board { display: grid; grid-template-rows: repeat(8, 40px); border: 2px solid #333; }
    .board-row { display: grid; grid-template-columns: 16px repeat(8, 40px); }
    .coord-row { display: grid; grid-template-columns: 16px repeat(8, 40px); height: 16px; font-size: 12px; user-select: none; }
    .coord-cell { display: flex; align-items: center; justify-content: center; }
    .square { width: 40px; height: 40px; position: relative; display: flex; align-items: center; justify-content: center; font-size: 24px; cursor: pointer; }
    .light { background: #f0d9b5; }
    .dark { background: #b58863; }
    .selected { outline: 2px solid #ff0; }
    .last { box-shadow: inset 0 0 0 3px #ffa500; }
    .dot { position: absolute; width: 12px; height: 12px; border-radius: 50%; background: rgba(0,0,0,0.3); top: 50%; left: 50%; transform: translate(-50%, -50%); }
    .piece { position: relative; z-index: 2; }
    `
  ]
})
export class ChessBoardComponent implements OnInit, OnChanges {
  @Input() fen: string = '';
  @Input() side: 'WHITE' | 'BLACK' = 'WHITE';
  /**
   * Optionally pass the last move to highlight, as an object with from and to squares.
   */
  @Input() lastMove: { from: string; to: string } | null = null;
  /**
   * Show coordinate labels around the board (files and ranks).
   */
  @Input() showCoordinates = true;
  @Output() move = new EventEmitter<string>();
  game!: any;
  boardMatrix: any[] = [];
  selected: string | null = null;
  legalSquares: string[] = [];
  displayFiles: string[] = [];
  displayRanks: number[] = [];
  ngOnInit() {
    this.loadFen(this.fen);
  }
  ngOnChanges(changes: SimpleChanges) {
    if (changes['fen'] && !changes['fen'].firstChange) {
      this.loadFen(this.fen);
    }
    if (changes['side']) {
      this.updateCoordinateLabels();
      // reload board to adjust orientation
      this.loadFen(this.fen);
    }
  }
  updateCoordinateLabels() {
    // Determine file and rank display order based on orientation
    this.displayFiles = this.side === 'WHITE' ? ['a','b','c','d','e','f','g','h'] : ['h','g','f','e','d','c','b','a'];
    this.displayRanks = this.side === 'WHITE' ? [8,7,6,5,4,3,2,1] : [1,2,3,4,5,6,7,8];
  }
  loadFen(fen: string) {
    this.updateCoordinateLabels();
    try {
      this.game = new Chess(fen);
    } catch {
      this.game = new Chess();
    }
    this.boardMatrix = this.getBoardArray();
    // reset selection and legal squares but keep last move
    this.selected = null;
    this.legalSquares = [];
  }
  getBoardArray() {
    const board = [] as any[];
    const files = this.displayFiles;
    const ranks = this.displayRanks;
    for (const rank of ranks) {
      const row = [] as any[];
      for (const file of files) {
        const square = `${file}${rank}`;
        const piece = this.game.get(square);
        row.push({ square, piece });
      }
      board.push(row);
    }
    return board;
  }
  onSquareClick(square: string) {
    const turn = this.game.turn() === 'w' ? 'WHITE' : 'BLACK';
    // If a piece is selected and the clicked square is in legal moves, perform the move
    if (this.selected && this.legalSquares.includes(square)) {
      const from = this.selected;
      const to = square;
      const moveResult = this.game.move({ from, to, promotion: 'q' });
      if (moveResult) {
        const uci = from + to + (moveResult.promotion || '');
        this.move.emit(uci);
        // Record last move
        this.lastMove = { from, to };
      }
      // Clear selection and legal moves
      this.selected = null;
      this.legalSquares = [];
    } else {
      // Selecting a piece
      const piece = this.game.get(square);
      if (piece && ((turn === 'WHITE' && piece.color === 'w') || (turn === 'BLACK' && piece.color === 'b'))) {
        this.selected = square;
        // Compute legal moves for this piece
        const moves = this.game.moves({ square, verbose: true }) as any[];
        this.legalSquares = moves.map((m) => m.to);
      } else {
        // Clicking empty or opponent piece clears selection
        this.selected = null;
        this.legalSquares = [];
      }
    }
  }
  getPieceChar(piece: any) {
    if (!piece) return '';
    const type = piece.type;
    const isWhite = piece.color === 'w';
    const chars: any = {
      p: isWhite ? '♙' : '♟',
      r: isWhite ? '♖' : '♜',
      n: isWhite ? '♘' : '♞',
      b: isWhite ? '♗' : '♝',
      q: isWhite ? '♕' : '♛',
      k: isWhite ? '♔' : '♚',
    };
    return chars[type] || '';
  }
}