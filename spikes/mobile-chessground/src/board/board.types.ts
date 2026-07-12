export type BoardOrientation = 'white' | 'black';

export type BoardArrow = {
  from: string;
  to: string;
  brush?: string;
};

export type BoardMoveEvent = {
  eventId: string;
  uci: string;
  emittedAt: number;
};

export type BoardReadyEvent = {
  instanceId: string;
  initializationCount: number;
  readyAt: number;
};

export type BoardErrorEvent = {
  code: string;
  message: string;
  occurredAt: number;
};

export type ChessgroundBoardProps = {
  fen: string;
  orientation: BoardOrientation;
  lastMove: [string, string] | null;
  arrows: BoardArrow[];
  coordinates: boolean;
  movable: boolean;
  positionVersion: number;
  size: number;
  onMove: (event: BoardMoveEvent) => Promise<void>;
  onReady: (event: BoardReadyEvent) => Promise<void>;
  onError: (event: BoardErrorEvent) => Promise<void>;
};
