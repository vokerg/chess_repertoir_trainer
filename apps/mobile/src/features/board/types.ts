export type BoardSide = 'WHITE' | 'BLACK';

export type BoardArrow = {
  from: string;
  to: string;
  brush?: 'green' | 'red' | 'blue' | string;
};

export type ChessBoardProps = {
  fen: string;
  side: BoardSide;
  lastMove?: { from: string; to: string } | null;
  arrows?: BoardArrow[];
  showCoordinates?: boolean;
  sound?: boolean;
  disabled?: boolean;
  positionVersion?: number;
  onMove?: (uci: string) => void;
};
