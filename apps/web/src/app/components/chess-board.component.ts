import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ChessgroundBoardComponent } from './chessground-board.component';
import { LegacyChessBoardComponent } from './legacy-chess-board.component';

export type ChessBoardImplementation = 'chessground' | 'legacy';

@Component({
  selector: 'app-chess-board',
  standalone: true,
  imports: [CommonModule, ChessgroundBoardComponent, LegacyChessBoardComponent],
  template: `
    <app-legacy-chess-board
      *ngIf="implementation === 'legacy'; else chessgroundBoard"
      [fen]="fen"
      [side]="side"
      [lastMove]="lastMove"
      [showCoordinates]="showCoordinates"
      (move)="move.emit($event)"
    ></app-legacy-chess-board>

    <ng-template #chessgroundBoard>
      <app-chessground-board
        [fen]="fen"
        [side]="side"
        [lastMove]="lastMove"
        [showCoordinates]="showCoordinates"
        (move)="move.emit($event)"
      ></app-chessground-board>
    </ng-template>
  `
})
export class ChessBoardComponent {
  @Input() implementation: ChessBoardImplementation = 'chessground';
  @Input() fen: string = '';
  @Input() side: 'WHITE' | 'BLACK' = 'WHITE';
  @Input() lastMove: { from: string; to: string } | null = null;
  @Input() showCoordinates = true;
  @Output() move = new EventEmitter<string>();
}
