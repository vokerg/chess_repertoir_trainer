import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { normalizeFenForPosition } from 'chess-domain';
import { classifyLineCoverageGame } from '../../dist/modules/repertoire-coverage/repertoire-coverage.matcher.js';
import { lineUpdateChangesRepertoire } from '../../dist/modules/courses/line-repertoire-timestamp.service.js';

const game = {
  gameId: 1,
  provider: 'TEST',
  providerGameId: 'game-1',
  providerUrl: null,
  endedAt: new Date('2026-06-02T12:00:00Z'),
  importedAt: new Date('2026-06-02T12:01:00Z'),
  userColor: 'WHITE',
  opponentUsername: 'opponent',
  resultForUser: 'WIN',
};

function buildPlies(uciMoves) {
  const chess = new Chess();
  return uciMoves.map((moveUci, index) => {
    const normalizedFenBefore = normalizeFenForPosition(chess.fen());
    chess.move({ from: moveUci.slice(0, 2), to: moveUci.slice(2, 4), promotion: moveUci[4] });
    return { plyNumber: index + 1, moveUci, normalizedFenBefore };
  });
}

function buildNodes(uciMoves, sideToTrain = 'WHITE') {
  const chess = new Chess();
  return uciMoves.map((moveUci, index) => {
    const side = chess.turn() === 'w' ? 'WHITE' : 'BLACK';
    const move = chess.move({
      from: moveUci.slice(0, 2),
      to: moveUci.slice(2, 4),
      promotion: moveUci[4],
    });
    return {
      id: index + 1,
      parentId: index === 0 ? null : index,
      moveUci,
      moveSan: move.san,
      isUserMove: side === sideToTrain,
      isCorrectUserMove: side === sideToTrain,
    };
  });
}

function classify({
  lineMoves,
  gameMoves,
  sideToTrain = 'WHITE',
  normalizedStartFen = normalizeFenForPosition('startpos'),
  indexed = true,
  nodes,
}) {
  return classifyLineCoverageGame({
    game: { ...game, userColor: sideToTrain },
    plies: indexed ? buildPlies(gameMoves) : null,
    nodes: nodes ?? buildNodes(lineMoves, sideToTrain),
    normalizedStartFen,
    sideToTrain,
    indexed,
  });
}

assert.equal(
  classify({ lineMoves: ['e2e4', 'c7c5', 'g1f3'], gameMoves: ['e2e4', 'c7c5', 'g1f3'] }).status,
  'MATCHED_LINE',
);

const userDeviation = classify({
  lineMoves: ['e2e4', 'c7c5', 'g1f3'],
  gameMoves: ['e2e4', 'c7c5', 'b1c3'],
});
assert.equal(userDeviation.status, 'USER_DEVIATION');
assert.equal(userDeviation.playedMoveUci, 'b1c3');
assert.deepEqual(userDeviation.expectedMoveUcis, ['g1f3']);

const opponentUncovered = classify({
  lineMoves: ['e2e4', 'c7c5', 'g1f3'],
  gameMoves: ['e2e4', 'e7e5'],
});
assert.equal(opponentUncovered.status, 'OPPONENT_UNCOVERED');
assert.equal(opponentUncovered.playedMoveUci, 'e7e5');

assert.equal(classify({ lineMoves: ['e2e4'], gameMoves: ['e2e4', 'c7c5'] }).status, 'LINE_ENDED');
assert.equal(
  classify({
    lineMoves: ['e2e4'],
    gameMoves: ['e2e4'],
    normalizedStartFen: '8/8/8/8/8/8/8/K6k w - -',
  }).status,
  'NOT_REACHED',
);
assert.equal(
  classify({ lineMoves: ['e2e4', 'c7c5'], gameMoves: ['e2e4', 'c7c5'], sideToTrain: 'BLACK' })
    .status,
  'MATCHED_LINE',
);

const multiNodes = buildNodes(['e2e4', 'c7c5', 'g1f3']);
multiNodes.push({
  ...multiNodes[2],
  id: 4,
  moveUci: 'b1c3',
  moveSan: 'Nc3',
  isCorrectUserMove: true,
});
assert.equal(
  classify({ lineMoves: [], gameMoves: ['e2e4', 'c7c5', 'b1c3'], nodes: multiNodes }).status,
  'MATCHED_LINE',
);

assert.equal(
  classify({ lineMoves: ['e2e4'], gameMoves: [], indexed: false }).status,
  'UNINDEXED_GAME',
);

assert.equal(
  lineUpdateChangesRepertoire({ startingFen: 'startpos', sideToTrain: 'WHITE' }, {}),
  false,
);
assert.equal(
  lineUpdateChangesRepertoire(
    { startingFen: 'startpos', sideToTrain: 'WHITE' },
    { startingFen: 'startpos' },
  ),
  false,
);
assert.equal(
  lineUpdateChangesRepertoire(
    { startingFen: 'startpos', sideToTrain: 'WHITE' },
    { startingFen: 'custom' },
  ),
  true,
);
assert.equal(
  lineUpdateChangesRepertoire(
    { startingFen: 'startpos', sideToTrain: 'WHITE' },
    { sideToTrain: 'BLACK' },
  ),
  true,
);

console.log('repertoire coverage tests passed');
