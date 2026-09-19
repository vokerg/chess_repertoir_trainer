import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import {
  courseExtensionCandidateGameFilters,
  courseExtensionCandidatesQuerySchema,
} from '../../dist/modules/lab/course-extension-candidates/course-extension-candidates.schema.js';
import {
  collectCourseExtensionCoverage,
  collectCourseTerminalPositions,
  groupCourseExtensionCandidates,
} from '../../dist/modules/lab/course-extension-candidates/course-extension-candidates.service.js';

const parsedQuery = courseExtensionCandidatesQuerySchema.parse({
  courseId: '21',
  minGames: '4',
  providers: 'LICHESS',
  speedCategory: 'blitz,rapid',
  from: '2026-04-01T00:00:00.000Z',
  to: '2026-07-01T23:59:59.999Z',
});
assert.equal(parsedQuery.courseId, 21);
assert.equal(parsedQuery.minGames, 4);
assert.deepEqual(parsedQuery.providers, ['LICHESS']);
assert.deepEqual(parsedQuery.speedCategory, ['blitz', 'rapid']);
assert.ok(parsedQuery.from instanceof Date);
assert.ok(parsedQuery.to instanceof Date);
assert.deepEqual(courseExtensionCandidateGameFilters(parsedQuery), {
  providers: ['LICHESS'],
  speedCategory: ['blitz', 'rapid'],
  from: new Date('2026-04-01T00:00:00.000Z'),
  to: new Date('2026-07-01T23:59:59.999Z'),
});

function buildLine({ id, chapterId, name, sideToTrain, moves }) {
  const chess = new Chess();
  const nodes = [];
  let parentId = null;
  for (const [index, moveInput] of moves.entries()) {
    const fenBefore = chess.fen();
    const colorToMoveBefore = chess.turn() === 'w' ? 'WHITE' : 'BLACK';
    const move = chess.move(moveInput);
    assert.ok(move, `move ${moveInput} must be legal`);
    const nodeId = id * 100 + index + 1;
    nodes.push({
      id: nodeId,
      lineId: id,
      parentId,
      plyNumber: index,
      fenBefore,
      fenAfter: chess.fen(),
      moveUci: `${move.from}${move.to}${move.promotion ?? ''}`,
      moveSan: move.san,
      colorToMoveBefore,
      isUserMove: colorToMoveBefore === sideToTrain,
      isCorrectUserMove: colorToMoveBefore === sideToTrain,
    });
    parentId = nodeId;
  }
  return { id, chapterId, name, sideToTrain, startingFen: new Chess().fen(), moves: nodes };
}

const uncoveredLine = buildLine({
  id: 1,
  chapterId: 10,
  name: 'Open Sicilian',
  sideToTrain: 'WHITE',
  moves: ['e4', 'c5', 'Nf3'],
});
const coveredTransposition = buildLine({
  id: 2,
  chapterId: 10,
  name: 'Covered continuation',
  sideToTrain: 'WHITE',
  moves: ['d4', 'd5', 'c4', 'e6', 'Nc3'],
});
const coveredContinuation = buildLine({
  id: 3,
  chapterId: 10,
  name: 'Covered continuation branch',
  sideToTrain: 'WHITE',
  moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6'],
});

const terminals = collectCourseTerminalPositions([
  uncoveredLine,
  coveredTransposition,
  coveredContinuation,
]);
assert.equal(terminals.length, 1, 'positions covered by another course branch are excluded');
assert.equal(terminals[0].lineRefs[0].lineName, 'Open Sicilian');
assert.equal(terminals[0].sideToMove, 'BLACK');

const terminalFen = terminals[0].normalizedFen;
function row(gameId, resultForUser, endedAt, moveUci = 'd7d6') {
  return {
    positionId: 1,
    importedGameId: gameId,
    plyNumber: 3,
    moveUci,
    position: { normalizedFen: terminalFen },
    importedGame: {
      id: gameId,
      provider: 'LICHESS',
      providerGameId: `game-${gameId}`,
      providerUrl: null,
      endedAt: new Date(endedAt),
      userColor: 'WHITE',
      opponentUsername: `opponent-${gameId}`,
      resultForUser,
    },
  };
}

const grouped = groupCourseExtensionCandidates(
  terminals,
  [
    row(1, 'WIN', '2026-07-01T00:00:00.000Z'),
    row(1, 'WIN', '2026-07-01T00:00:00.000Z'),
    row(2, 'LOSS', '2026-07-02T00:00:00.000Z'),
    row(3, 'DRAW', '2026-07-03T00:00:00.000Z'),
    row(4, null, '2026-07-04T00:00:00.000Z', 'b8c6'),
  ],
  3,
);
assert.equal(grouped.gamesMatched, 4);
assert.equal(grouped.continuationsFound, 2);
assert.equal(grouped.items.length, 1);
assert.equal(grouped.items[0].count, 3, 'a game is counted once per continuation');
assert.deepEqual(grouped.items[0].results, { win: 1, draw: 1, loss: 1, unknown: 0 });
assert.equal(grouped.items[0].moveSan, 'd6');
assert.equal(grouped.items[0].examples[0].gameId, 3, 'examples are newest first');

const transpositionTerminal = buildLine({
  id: 4,
  chapterId: 10,
  name: 'Slav terminal',
  sideToTrain: 'WHITE',
  moves: ['d4', 'd5', 'c4', 'c6', 'e3', 'Bf5', 'Nc3', 'e6', 'Nf3'],
});
const transpositionReply = buildLine({
  id: 5,
  chapterId: 10,
  name: 'Slav covered reply',
  sideToTrain: 'WHITE',
  moves: ['d4', 'd5', 'c4', 'c6', 'e3', 'Nf6', 'Nc3', 'Bf5', 'Nf3', 'e6', 'Nh4'],
});
const transpositionCoverage = collectCourseExtensionCoverage([
  transpositionTerminal,
  transpositionReply,
]);
const reportedTerminal = transpositionCoverage.terminals.find(
  (terminal) => terminal.lineRefs[0]?.lineName === 'Slav terminal',
);
assert.ok(reportedTerminal, 'the move-order branch still produces a terminal position');

const transpositionResult = groupCourseExtensionCandidates(
  [reportedTerminal],
  [
    {
      ...row(5, 'WIN', '2026-07-05T00:00:00.000Z', 'g8f6'),
      position: { normalizedFen: reportedTerminal.normalizedFen },
    },
    {
      ...row(6, 'LOSS', '2026-07-06T00:00:00.000Z', 'a7a6'),
      position: { normalizedFen: reportedTerminal.normalizedFen },
    },
  ],
  1,
  transpositionCoverage.coveredUserReplyPositions,
);
assert.equal(
  transpositionResult.items.length,
  1,
  'continuations that transpose into a covered user reply are excluded',
);
assert.equal(transpositionResult.items[0].moveUci, 'a7a6', 'genuinely uncovered moves remain');
assert.equal(transpositionResult.continuationsFound, 1);
assert.equal(transpositionResult.gamesMatched, 1);

console.log('Course extension candidate tests passed.');
