import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import {
  applyLichessPuzzleUciMove,
  LichessPuzzleRoundLogicError,
  parseStoredLichessPuzzleMoveAttempts,
  resolveLichessPuzzleLastMoveUci,
} from '../../dist/modules/lichess-puzzles/lichess-puzzle-round.logic.js';

const position = new Chess();
position.move('e4');
position.move('e5');

{
  const fen = applyLichessPuzzleUciMove(position.fen(), 'g1f3');
  const expected = new Chess(position.fen());
  expected.move('Nf3');
  assert.equal(fen, expected.fen());
}

assert.throws(
  () => applyLichessPuzzleUciMove(position.fen(), 'e1e3'),
  (error) => error instanceof LichessPuzzleRoundLogicError
    && error.code === 'ILLEGAL_MOVE',
);

{
  const attempts = parseStoredLichessPuzzleMoveAttempts([{
    moveUci: 'g1f3',
    expectedMoveUci: 'g1f3',
    correct: true,
    fenBefore: position.fen(),
    fenAfter: 'after-user-move',
    forcedMoveUci: 'b8c6',
    attemptedAt: '2026-07-29T05:00:00.000Z',
  }]);

  assert.equal(attempts.length, 1);
  assert.equal(resolveLichessPuzzleLastMoveUci(2, attempts, 'e7e5'), 'b8c6');
}

assert.throws(
  () => parseStoredLichessPuzzleMoveAttempts([{ moveUci: 'g1f3' }]),
  (error) => error instanceof LichessPuzzleRoundLogicError
    && error.code === 'INVALID_STATE',
);
