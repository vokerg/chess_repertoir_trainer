import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import {
  LichessPuzzlePositionError,
  reconstructLichessPuzzlePosition,
} from '../../dist/modules/lichess-puzzles/lichess-puzzle-position.js';

{
  const position = reconstructLichessPuzzlePosition('1. e4 e5', 3);
  const expected = new Chess();
  expected.move('e4');
  expected.move('e5');

  assert.equal(position.startFen, expected.fen());
  assert.equal(position.lastMoveUci, 'e7e5');
  assert.equal(position.sideToMove, 'WHITE');
}

{
  const position = reconstructLichessPuzzlePosition('1. e4 e5 2. Nf3', 4);
  assert.equal(position.lastMoveUci, 'g1f3');
  assert.equal(position.sideToMove, 'BLACK');
}

{
  const officialApiPgn = 'e4 e6 Nf3 d5 e5 c5 c3 Qb6 d4 cxd4 cxd4 Nc6 Be2 Bb4+ Nc3 Nge7 O-O O-O a3 Bxc3 bxc3 Na5 Be3 Qb2 Qa4 Qxe2 Qxa5 b6 Qb4 Nc6 Qd6 Na5 a4 Rac8 Qc6 Nxe3 fxe3 Qxe3+ Kh1 Ba6 Rfe1 Qf2 a5 Rfd8 Qd6 bxa5 Qxa7 Be2 Ng5 Ra8 Qe7 Re8 Qc7 Rec8 Qb7 Ba6 Qe7 Rxc3 Reb1 Rc2 Rg1 Rb2 Rxa5 Rc8 Rxa6';
  const position = reconstructLichessPuzzlePosition(officialApiPgn, 66);

  assert.equal(position.lastMoveUci, 'a5a6');
  assert.equal(position.sideToMove, 'BLACK');
}

assert.throws(
  () => reconstructLichessPuzzlePosition('1. e4 e5', 2),
  (error) => error instanceof LichessPuzzlePositionError && /expects 1 PGN plies, received 2/.test(error.message),
);

assert.throws(
  () => reconstructLichessPuzzlePosition('', 1),
  (error) => error instanceof LichessPuzzlePositionError && /PGN is empty/.test(error.message),
);
