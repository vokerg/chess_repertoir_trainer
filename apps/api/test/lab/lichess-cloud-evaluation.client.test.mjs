import assert from 'node:assert/strict';
import { cloudEvaluationResponseSchema } from '@chess-trainer/contracts/lab';
import {
  createLichessCloudEvaluationClient,
  LichessCloudEvaluationError,
  parseCloudEvaluationFen,
} from '../../dist/modules/lab/cloud-evaluation/lichess-cloud-evaluation.client.js';

const initial = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const castleFen = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
const payload = {
  depth: 24,
  knodes: 10023,
  pvs: [
    { moves: 'e2e4 e7e5 g1f3', cp: 35 },
    { moves: 'd2d4 d7d5', cp: 18 },
    { moves: 'e2e5', cp: 99 }, // Illegal PV is never exposed to the cache.
    { moves: 'g1f3 g8f6', cp: 12 },
  ],
};

{
  let requested;
  const client = createLichessCloudEvaluationClient({
    fetchImpl: async (input, init) => {
      requested = new URL(input);
      assert.equal(init.headers.Accept, 'application/json');
      assert.equal(init.headers.Authorization, undefined);
      assert.ok(init.signal);
      return new Response(JSON.stringify(payload), { status: 200 });
    },
  });
  const result = await client.fetchPosition(initial);
  assert.equal(requested.origin, 'https://lichess.org');
  assert.equal(requested.pathname, '/api/cloud-eval');
  assert.equal(requested.searchParams.get('fen'), initial);
  assert.equal(requested.searchParams.get('multiPv'), '3');
  assert.deepEqual(result, {
    source: 'LICHESS_CLOUD',
    depth: 24,
    knodes: 10023,
    positionAnalysis: {
      fen: initial,
      normalizedFen: initial.split(' ').slice(0, 4).join(' '),
      bestMoveUci: 'e2e4',
      bestScoreCpWhite: 35,
      bestMateWhite: null,
      persistenceMode: 'rich',
      lines: [
        { multipv: 1, depth: 24, moveUci: 'e2e4', scoreCpWhite: 35, pvUci: ['e2e4', 'e7e5', 'g1f3'] },
        { multipv: 2, depth: 24, moveUci: 'd2d4', scoreCpWhite: 18, pvUci: ['d2d4', 'd7d5'] },
        { multipv: 3, depth: 24, moveUci: 'g1f3', scoreCpWhite: 12, pvUci: ['g1f3', 'g8f6'] },
      ],
    },
  });
  assert.deepEqual(cloudEvaluationResponseSchema.parse(result), result);
  assert.equal('id' in result.positionAnalysis, false);
  assert.equal('positionId' in result.positionAnalysis, false);
}

{
  const client = createLichessCloudEvaluationClient({
    fetchImpl: async () => new Response(JSON.stringify({
      depth: 30, knodes: 500, pvs: [{ moves: 'e1h1', mate: 3 }],
    }), { status: 200 }),
  });
  const result = await client.fetchPosition(castleFen);
  assert.equal(result.positionAnalysis.bestMoveUci, 'e1g1');
  assert.deepEqual(result.positionAnalysis.lines[0].pvUci, ['e1g1']);
  assert.equal(result.positionAnalysis.bestMateWhite, 3);
  assert.equal(result.positionAnalysis.bestScoreCpWhite, null);
}

{
  const client = createLichessCloudEvaluationClient({
    fetchImpl: async () => new Response(JSON.stringify({
      depth: 19, knodes: 330, pvs: [{ moves: 'e7e5', cp: -17 }],
    }), { status: 200 }),
  });
  const blackToMove = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
  const result = await client.fetchPosition(blackToMove);
  assert.equal(result.positionAnalysis.bestScoreCpWhite, -17, 'Lichess scores already use White POV');
  assert.equal(parseCloudEvaluationFen(blackToMove.split(' ').slice(0, 4).join(' ')).normalizedFen,
    blackToMove.split(' ').slice(0, 4).join(' '));
}

{
  const client = createLichessCloudEvaluationClient({
    fetchImpl: async () => new Response(JSON.stringify({ error: 'Not found' }), { status: 404 }),
  });
  assert.deepEqual(await client.fetchPosition(initial), {
    source: 'LICHESS_CLOUD', depth: null, knodes: null, positionAnalysis: null,
  });
}

{
  let now = 1_000;
  let requests = 0;
  const client = createLichessCloudEvaluationClient({
    nowMs: () => now,
    fetchImpl: async () => {
      requests += 1;
      return new Response('{}', { status: 429 });
    },
  });
  await assert.rejects(client.fetchPosition(initial),
    (error) => error instanceof LichessCloudEvaluationError && error.statusCode === 429);
  await assert.rejects(client.fetchPosition(initial),
    (error) => error instanceof LichessCloudEvaluationError && error.statusCode === 429);
  assert.equal(requests, 1, 'cooldown blocks repeated external requests');
  now += 60_000;
  await assert.rejects(client.fetchPosition(initial), (error) => error.statusCode === 429);
  assert.equal(requests, 2);
}

{
  let active = 0;
  let peak = 0;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let requests = 0;
  const client = createLichessCloudEvaluationClient({
    fetchImpl: async () => {
      requests += 1;
      active += 1;
      peak = Math.max(peak, active);
      if (requests === 1) await gate;
      active -= 1;
      return new Response(JSON.stringify(payload), { status: 200 });
    },
  });
  const a = client.fetchPosition(initial);
  const b = client.fetchPosition(initial);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(peak, 1);
  release();
  await Promise.all([a, b]);
  assert.equal(peak, 1, 'external calls stay serialized');
}

{
  const client = createLichessCloudEvaluationClient({
    fetchImpl: async () => new Response(JSON.stringify({
      depth: 15, knodes: 20, pvs: [{ moves: 'e2e5', cp: 10 }],
    }), { status: 200 }),
  });
  await assert.rejects(client.fetchPosition(initial),
    (error) => error instanceof LichessCloudEvaluationError
      && error.message.includes('no valid engine lines'));
}

{
  const client = createLichessCloudEvaluationClient({
    fetchImpl: async () => new Response('not JSON', { status: 200 }),
  });
  await assert.rejects(client.fetchPosition(initial),
    (error) => error instanceof LichessCloudEvaluationError
      && error.message.includes('invalid JSON'));
}

assert.throws(() => parseCloudEvaluationFen('not a fen'));
console.log('Lichess cloud evaluation mapping, errors and throttling tests passed.');
