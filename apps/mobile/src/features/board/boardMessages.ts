import { BoardArrow, BoardSide } from './types';

export type BoardInboundMessage = {
  type: 'setPosition';
  fen: string;
  side: BoardSide;
  lastMove?: { from: string; to: string } | null;
  arrows?: BoardArrow[];
  showCoordinates?: boolean;
  disabled?: boolean;
  positionVersion?: number;
};

export type BoardOutboundMessage =
  | { type: 'ready' }
  | { type: 'move'; uci: string }
  | { type: 'illegalMove'; from: string; to: string }
  | { type: 'error'; message: string };
