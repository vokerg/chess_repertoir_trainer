import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { normalizeFenForPosition } from 'chess-domain';
import { classifyCourseReviewGame } from '../../dist/modules/repertoire-coverage/course-review.matcher.js';
import {
  buildCourseRepertoireGraph,
  getCourseReviewConflicts,
} from '../../dist/modules/repertoire-coverage/repertoire-coverage.service.js';

const game = {
  gameId: 1,
  provider: 'TEST',
  providerGameId: 'game-1',
  providerUrl: null,
  endedAt: new Date('2026-06-07T12:00:00Z'),
  userColor: 'BLACK',
  opponentUsername: 'opponent',
  resultForUser: 'WIN',
};

function buildPlies(uciMoves, startingFen = 'startpos') {
  const chess = startingFen === 'startpos' ? new Chess() : new Chess(startingFen);
  return uciMoves.map((moveUci, index) => {
    const normalizedFenBefore = normalizeFenForPosition(chess.fen());
    chess.move({ from: moveUci.slice(0, 2), to: moveUci.slice(2, 4), promotion: moveUci[4] });
    return { plyNumber: index + 1, moveUci, normalizedFenBefore };
  });
}

function makeLine(id, name, sideToTrain, uciMoves) {
  const chess = new Chess();
  const moves = uciMoves.map((moveUci, index) => {
    const fenBefore = chess.fen();
    const colorToMoveBefore = chess.turn() === 'w' ? 'WHITE' : 'BLACK';
    const move = chess.move({
      from: moveUci.slice(0, 2),
      to: moveUci.slice(2, 4),
      promotion: moveUci[4],
    });
    return {
      id: id * 100 + index + 1,
      lineId: id,
      parentId: index ? id * 100 + index : null,
      plyNumber: index + 1,
      fenBefore,
      fenAfter: chess.fen(),
      moveUci,
      moveSan: move.san,
      colorToMoveBefore,
      isUserMove: colorToMoveBefore === sideToTrain,
      isCorrectUserMove: colorToMoveBefore === sideToTrain,
    };
  });
  return { id, chapterId: 1, name, sideToTrain, startingFen: 'startpos', moves };
}

function classify(graph, gameMoves, options = {}) {
  return classifyCourseReviewGame({
    game: { ...game, userColor: options.sideToTrain ?? game.userColor },
    indexed: options.indexed ?? true,
    plies: options.indexed === false ? null : buildPlies(gameMoves, options.startingFen),
    graph,
    sideToTrain: options.sideToTrain ?? 'BLACK',
  });
}

const siblingGraph = buildCourseRepertoireGraph([
  makeLine(1, 'Sicilian d6', 'WHITE', ['e2e4', 'c7c5', 'g1f3', 'd7d6']),
  makeLine(2, 'Sicilian Nc6', 'WHITE', ['e2e4', 'c7c5', 'g1f3', 'b8c6']),
]);
assert.equal(
  classify(siblingGraph, ['e2e4', 'c7c5', 'g1f3', 'd7d6'], { sideToTrain: 'WHITE' }).status,
  'GAME_ENDED_INSIDE_REPERTOIRE',
);
assert.equal(
  classify(siblingGraph, ['e2e4', 'c7c5', 'g1f3', 'b8c6'], { sideToTrain: 'WHITE' }).status,
  'GAME_ENDED_INSIDE_REPERTOIRE',
);

const blackGraph = buildCourseRepertoireGraph([makeLine(3, 'Sicilian', 'BLACK', ['e2e4', 'c7c5'])]);
const deviation = classify(blackGraph, ['e2e4', 'e7e5']);
assert.equal(deviation.status, 'MY_DEVIATION');
assert.equal(deviation.expectedMoveUci, 'c7c5');
assert.equal(deviation.playedMoveUci, 'e7e5');

const whiteGraph = buildCourseRepertoireGraph([makeLine(4, 'English', 'WHITE', ['c2c4', 'e7e5'])]);
const uncovered = classifyCourseReviewGame({
  game: { ...game, userColor: 'WHITE' },
  indexed: true,
  plies: buildPlies(['g1f3']),
  graph: whiteGraph,
  sideToTrain: 'WHITE',
});
assert.equal(uncovered.status, 'MY_DEVIATION');

const opponentGraph = buildCourseRepertoireGraph([
  makeLine(5, 'English response', 'BLACK', ['c2c4', 'e7e5']),
]);
const opponentUncovered = classify(opponentGraph, ['g1f3']);
assert.equal(opponentUncovered.status, 'OPPONENT_UNCOVERED');
assert.equal(opponentUncovered.playedMoveUci, 'g1f3');

assert.equal(classify(blackGraph, ['e2e4', 'c7c5', 'g1f3']).status, 'REPERTOIRE_ENDED');
assert.equal(classify(blackGraph, ['e2e4', 'c7c5']).status, 'GAME_ENDED_INSIDE_REPERTOIRE');

const conflictGraph = buildCourseRepertoireGraph([
  makeLine(6, 'Sicilian', 'BLACK', ['e2e4', 'c7c5']),
  makeLine(7, 'Open game', 'BLACK', ['e2e4', 'e7e5']),
]);
const conflict = classify(conflictGraph, ['e2e4', 'c7c5']);
assert.equal(conflict.status, 'COURSE_CONFLICT');
const conflicts = getCourseReviewConflicts(conflictGraph);
assert.equal(conflicts.length, 1);
assert.deepEqual(
  new Set(conflicts[0].moves.map((move) => move.moveUci)),
  new Set(['c7c5', 'e7e5']),
);
assert.deepEqual(
  new Set(conflicts[0].moves.flatMap((move) => move.lineRefs.map((ref) => ref.lineName))),
  new Set(['Sicilian', 'Open game']),
);
assert.deepEqual(
  new Set(conflicts[0].moves.flatMap((move) => move.lineRefs.map((ref) => ref.moveSequenceSan))),
  new Set(['1. e4 c5', '1. e4 e5']),
);

assert.equal(classify(blackGraph, [], { indexed: false }).status, 'UNINDEXED_GAME');

const customStart = '8/8/8/8/8/8/P7/K6k w - - 0 1';
const customLine = makeLine(8, 'Custom', 'WHITE', []);
customLine.startingFen = customStart;
const customGraph = buildCourseRepertoireGraph([customLine]);
assert.equal(classify(customGraph, ['e2e4']).status, 'OUT_OF_SCOPE');

console.log('Course review matcher tests passed.');
