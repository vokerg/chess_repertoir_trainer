import assert from 'node:assert/strict';
import {
  LichessPuzzlesClient,
  LichessPuzzlesClientError,
} from '../../dist/modules/lichess-puzzles/lichess-puzzles.client.js';

const batchPayload = {
  puzzles: [
    {
      game: {
        id: 'game-1',
        pgn: '1. e4 e5',
        rated: true,
        clock: '5+0',
      },
      puzzle: {
        id: 'puzzle-1',
        initialPly: 3,
        plays: 125,
        rating: 1600,
        solution: ['g1f3', 'b8c6'],
        themes: ['opening', 'short'],
      },
    },
  ],
  glicko: { rating: 1500 },
};

{
  const calls = [];
  const client = new LichessPuzzlesClient(async (input, init) => {
    calls.push({ input: String(input), init });
    return new Response(JSON.stringify(batchPayload), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }, 'https://lichess.test');

  const puzzles = await client.getBatch('token-1', {
    angle: 'mix',
    difficulty: 'harder',
    color: 'white',
    count: 1,
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].input, 'https://lichess.test/api/puzzle/batch/mix?nb=1&difficulty=harder&color=white');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer token-1');
  assert.equal(puzzles.length, 1);
  assert.equal(puzzles[0].providerPuzzleId, 'puzzle-1');
  assert.equal(puzzles[0].providerGameId, 'game-1');
  assert.equal(puzzles[0].lastMoveUci, 'e7e5');
  assert.equal(puzzles[0].sideToMove, 'WHITE');
  assert.deepEqual(puzzles[0].solutionUci, ['g1f3', 'b8c6']);
}

{
  const malformedMoveText = 'e4 e6 Nf3 d5 e5 c5 c3 Qb6 d4 cxd4 cxd4 Nc6 Be2 Bb4+ Nc3 Nge7 O-O O-O a3 Bxc3 bxc3 Na5 Be3 Qb2 Qa4 Qxe2 Qxa5 b6 Qb4 Nc6 Qd6 Na5 a4 Rac8 Qc6 Nxe3 fxe3 Qxe3+ Kh1 Ba6 Rfe1 Qf2 a5 Rfd8 Qd6 bxa5 Qxa7 Be2 Ng5 Ra8 Qe7 Re8 Qc7 Rec8 Qb7 Ba6 Qe7 Rxc3 Reb1 Rc2 Rg1 Rb2 Rxa5 Rc8 Rxa6';
  const malformedBatch = {
    puzzles: [{
      game: { id: 'game-broken', pgn: malformedMoveText, rated: true },
      puzzle: {
        id: 'puzzle-broken',
        initialPly: 66,
        plays: 837,
        rating: 2716,
        solution: ['g8g7', 'd5e5', 'f6e5'],
        themes: ['endgame', 'short'],
      },
    }],
  };
  const detailPayload = {
    game: { id: 'game-broken', pgn: malformedMoveText, rated: true },
    puzzle: {
      ...malformedBatch.puzzles[0].puzzle,
      fen: '5rk1/p4p2/5qpR/1R1Q4/3PK3/4P1P1/P1r2PP1/8 b - - 1 1',
      lastMove: 'f3e4',
    },
  };
  const calls = [];
  const client = new LichessPuzzlesClient(async (input) => {
    const url = String(input);
    calls.push(url);
    const payload = url.endsWith('/api/puzzle/puzzle-broken') ? detailPayload : malformedBatch;
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }, 'https://lichess.test');

  const puzzles = await client.getBatch('token-fallback');

  assert.deepEqual(calls, [
    'https://lichess.test/api/puzzle/batch/mix?nb=1',
    'https://lichess.test/api/puzzle/puzzle-broken',
  ]);
  assert.equal(puzzles[0].startFen, detailPayload.puzzle.fen);
  assert.equal(puzzles[0].lastMoveUci, 'f3e4');
  assert.equal(puzzles[0].sideToMove, 'BLACK');
}

{
  let requestBody = null;
  const client = new LichessPuzzlesClient(async (_input, init) => {
    requestBody = JSON.parse(init.body);
    return new Response(JSON.stringify({
      puzzles: [],
      rounds: [{ id: 'puzzle-1', win: true, ratingDiff: 7 }],
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }, 'https://lichess.test');

  const result = await client.submitBatch('token-2', 'mix', [
    { id: 'puzzle-1', win: true, rated: true },
  ]);

  assert.deepEqual(requestBody, {
    solutions: [{ id: 'puzzle-1', win: true, rated: true }],
  });
  assert.deepEqual(result.rounds, [{ id: 'puzzle-1', win: true, ratingDiff: 7 }]);
}

{
  const client = new LichessPuzzlesClient(async () => new Response(JSON.stringify({ error: 'rate limited' }), {
    status: 429,
    headers: { 'content-type': 'application/json' },
  }), 'https://lichess.test');

  await assert.rejects(
    () => client.getBatch('token'),
    (error) => error instanceof LichessPuzzlesClientError
      && error.statusCode === 429
      && /rate limited/.test(error.message),
  );
}

{
  const client = new LichessPuzzlesClient(async () => {
    throw new Error('fetch should not run');
  }, 'https://lichess.test');

  await assert.rejects(
    () => client.getBatch('token', { count: 2, color: 'black' }),
    (error) => error instanceof LichessPuzzlesClientError
      && error.statusCode === 400
      && /batch size of 1/.test(error.message),
  );
}
