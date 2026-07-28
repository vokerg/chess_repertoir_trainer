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
        pgn: '1. e4 e5 2. Nf3 Nc6',
        rated: true,
        clock: '5+0',
      },
      puzzle: {
        id: 'puzzle-1',
        initialPly: 1,
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
