import assert from 'node:assert/strict';
import {
  chessComGameMatchesImportScope,
  normalizeChessComGame,
  planChessComImportWindows,
} from '../../dist/modules/account-imports/providers/chess-com/chess-com.provider.js';

const requestedFrom = new Date('2025-12-20T12:34:56.000Z');
const requestedTo = new Date('2026-02-05T06:00:00.000Z');
const windows = planChessComImportWindows({
  username: 'Alice',
  mode: 'INCREMENTAL_FORWARD',
  requestedFrom,
  requestedTo,
});

assert.deepEqual(windows.map((window) => window.key), ['2025-12', '2026-01', '2026-02']);
assert.equal(windows[0].from.toISOString(), requestedFrom.toISOString());
assert.equal(windows[0].to.toISOString(), '2026-01-01T00:00:00.000Z');
assert.equal(windows[1].from.toISOString(), '2026-01-01T00:00:00.000Z');
assert.equal(windows[1].to.toISOString(), '2026-02-01T00:00:00.000Z');
assert.equal(windows[2].from.toISOString(), '2026-02-01T00:00:00.000Z');
assert.equal(windows[2].to.toISOString(), requestedTo.toISOString());

const account = { id: 1, userId: 1, provider: 'CHESS_COM', username: 'Alice' };
const scope = { variant: 'STANDARD', speeds: ['BLITZ', 'RAPID'], rated: 'BOTH' };
const atInclusiveStart = normalizeChessComGame({
  uuid: 'inclusive-start',
  end_time: Math.floor(requestedFrom.getTime() / 1000),
  rated: true,
  time_class: 'rapid',
  rules: 'chess',
  white: { username: 'Alice', result: 'win' },
  black: { username: 'Bob', result: 'checkmated' },
}, account);
assert.equal(
  chessComGameMatchesImportScope(atInclusiveStart, scope, requestedFrom, windows[0].to),
  true,
  'the lower half-open boundary is inclusive at exact epoch-second precision',
);
