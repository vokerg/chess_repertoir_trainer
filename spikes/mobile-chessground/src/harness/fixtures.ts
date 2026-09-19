import type { BoardArrow, BoardOrientation } from '../board/board.types';

export type BoardScenario = {
  id: string;
  label: string;
  description: string;
  fen: string;
  orientation: BoardOrientation;
  lastMove?: [string, string] | null;
  arrows?: BoardArrow[];
  movable?: boolean;
  suggestedMove?: string;
};

export const BOARD_SCENARIOS: BoardScenario[] = [
  {
    id: 'start-white',
    label: 'Start · White',
    description: 'White orientation, legal destinations, drag and tap-to-move.',
    fen: 'startpos',
    orientation: 'white',
    suggestedMove: 'e2e4',
  },
  {
    id: 'start-black',
    label: 'Start · Black',
    description: 'Black orientation with the same starting position.',
    fen: 'startpos',
    orientation: 'black',
    suggestedMove: 'e2e4',
  },
  {
    id: 'capture',
    label: 'Capture',
    description: 'White pawn on e4 can capture the black pawn on d5.',
    fen: '8/8/8/3p4/4P3/8/8/4K2k w - - 0 1',
    orientation: 'white',
    suggestedMove: 'e4d5',
  },
  {
    id: 'castle',
    label: 'Castling',
    description: 'Both white castling moves are legal.',
    fen: 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1',
    orientation: 'white',
    arrows: [
      { from: 'e1', to: 'g1', brush: 'green' },
      { from: 'e1', to: 'c1', brush: 'blue' },
    ],
    suggestedMove: 'e1g1',
  },
  {
    id: 'en-passant',
    label: 'En passant',
    description: 'White can play e5xd6 en passant.',
    fen: '8/8/8/3pP3/8/8/8/4K2k w - d6 0 1',
    orientation: 'white',
    suggestedMove: 'e5d6',
  },
  {
    id: 'promotion-white',
    label: 'Promotion · White',
    description: 'Promote on a8 and test queen, rook, bishop, and knight.',
    fen: '7k/P7/8/8/8/8/8/7K w - - 0 1',
    orientation: 'white',
    suggestedMove: 'a7a8q',
  },
  {
    id: 'promotion-black',
    label: 'Promotion · Black',
    description: 'Black orientation and all four promotion choices on a1.',
    fen: '7k/8/8/8/8/8/p7/7K b - - 0 1',
    orientation: 'black',
    suggestedMove: 'a2a1q',
  },
  {
    id: 'check',
    label: 'Check highlight',
    description: 'Black starts in check from the white rook.',
    fen: '4k3/8/8/8/8/8/4R3/4K3 b - - 0 1',
    orientation: 'black',
  },
  {
    id: 'arrows',
    label: 'Arrows',
    description: 'Automatic arrows and last-move highlighting.',
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    orientation: 'white',
    lastMove: ['e7', 'e5'],
    arrows: [
      { from: 'g1', to: 'f3', brush: 'green' },
      { from: 'f1', to: 'c4', brush: 'blue' },
    ],
    suggestedMove: 'g1f3',
  },
  {
    id: 'disabled',
    label: 'Disabled board',
    description: 'No selection, drag, tap, or move event should be possible.',
    fen: 'startpos',
    orientation: 'white',
    movable: false,
  },
];

export function findScenario(id: string): BoardScenario {
  return BOARD_SCENARIOS.find((scenario) => scenario.id === id) ?? BOARD_SCENARIOS[0]!;
}
