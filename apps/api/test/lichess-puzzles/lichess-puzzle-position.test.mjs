import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import {
  LichessPuzzlePositionError,
  reconstructLichessPuzzlePosition,
} from '../../dist/modules/lichess-puzzles/lichess-puzzle-position.js';

{
  const position = reconstructLichessPuzzlePosition('1. e4 e5 2. Nf3 Nc6', 1);
  const expected = new Chess();
  expected.move('e4');
  expected.move('e5');

  assert.equal(position.startFen, expected.fen());
  assert.equal(position.lastMoveUci, 'e7e5');
  assert.equal(position.sideToMove, 'WHITE');
}

{
  const position = reconstructLichessPuzzlePosition('1. e4 e5 2. Nf3 Nc6', 2);
  assert.equal(position.lastMoveUci, 'g1f3');
  assert.equal(position.sideToMove, 'BLACK');
}

assert.throws(
  () => reconstructLichessPuzzlePosition('1. e4 e5', 2),
  (error) => error instanceof LichessPuzzlePositionError && /outside the 2-ply game PGN/.test(error.message),
);

assert.throws(
  () => reconstructLichessPuzzlePosition('', 0),
  (error) => error instanceof LichessPuzzlePositionError && /PGN is empty/.test(error.message),
);
