export type OpeningBookEntry = {
  eco: string;
  name: string;
  pgn: string;
  uci: string;
  epd: string;
  ply: number;
};

export type OpeningLookupSource = 'ECO' | 'FEN' | 'MOVES';

export type OpeningMatch = OpeningBookEntry & {
  source: OpeningLookupSource;
};

