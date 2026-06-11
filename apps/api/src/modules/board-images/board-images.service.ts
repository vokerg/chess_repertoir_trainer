import { Chess } from 'chess.js';

export interface BoardImageInput {
  fen: string;
  pov?: 'white' | 'black';
  turn?: 'none' | 'auto' | 'white' | 'black';
}

export class BoardImageValidationError extends Error {}

export interface BoardImageResult {
  url: string;
  fen: string;
  normalizedFen: string;
  pov: 'white' | 'black';
  turn: 'none' | 'white' | 'black';
}

export class BoardImagesService {
  static buildBoardImageUrl(input: BoardImageInput): BoardImageResult {
    let chess: Chess;
    try {
      chess = input.fen === 'startpos' ? new Chess() : new Chess(input.fen);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid FEN';
      throw new BoardImageValidationError(`Invalid FEN: ${message}`);
    }

    const normalizedFen = chess.fen();
    const pov = input.pov ?? 'white';
    const requestedTurn = input.turn ?? 'none';
    const turn = requestedTurn === 'auto'
      ? (normalizedFen.split(' ')[1] === 'b' ? 'black' : 'white')
      : requestedTurn;
    const baseUrl = (process.env['CHESSVISION_FEN2IMAGE_BASE_URL'] || 'https://fen2image.chessvision.ai')
      .replace(/\/+$/, '');
    const url = new URL(`${baseUrl}/${normalizedFen.replace(/ /g, '_')}`);
    url.searchParams.set('pov', pov);
    if (turn !== 'none') url.searchParams.set('turn', turn);

    return {
      url: url.toString(),
      fen: input.fen,
      normalizedFen,
      pov,
      turn,
    };
  }
}
