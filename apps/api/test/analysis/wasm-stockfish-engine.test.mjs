import assert from 'node:assert/strict';
import {
  resolveWasmStockfishWorkerConfig,
  WasmStockfishEngineService,
} from '../../dist/modules/analysis/wasm-stockfish-engine.service.js';

const compiledWorker = resolveWasmStockfishWorkerConfig(
  '/repo/apps/api/dist/modules/analysis/wasm-stockfish-engine.service.js',
  '/repo/apps/api/dist/modules/analysis',
);
assert.equal(compiledWorker.filename, '/repo/apps/api/dist/modules/analysis/wasm-stockfish-worker.js');
assert.deepEqual(compiledWorker.execArgv, []);

const devWorker = resolveWasmStockfishWorkerConfig(
  '/repo/apps/api/src/modules/analysis/wasm-stockfish-engine.service.ts',
  '/repo/apps/api/src/modules/analysis',
);
assert.equal(devWorker.filename, '/repo/apps/api/src/modules/analysis/wasm-stockfish-worker.ts');
assert.deepEqual(devWorker.execArgv, ['-r', 'ts-node/register/transpile-only']);

const engine = new WasmStockfishEngineService({
  timeoutMs: 30_000,
});

try {
  const result = await engine.analyzePosition('8/8/8/8/8/8/4K3/6k1 w - - 0 1', {
    depth: 1,
    multipv: 1,
  });

  assert.equal(result.fen, '8/8/8/8/8/8/4K3/6k1 w - - 0 1');
  assert.equal(typeof result.bestMoveUci, 'string');
  assert.match(result.bestMoveUci, /^[a-h][1-8][a-h][1-8][qrbn]?$/);
  assert.ok(Array.isArray(result.lines));
  assert.ok(result.lines.length >= 1);
  assert.equal(result.lines[0].moveUci, result.bestMoveUci);
  assert.ok(typeof result.lines[0].multipv === 'number' || result.lines[0].multipv === undefined);
  assert.ok(typeof result.lines[0].depth === 'number' || result.lines[0].depth === undefined);
  assert.ok(Array.isArray(result.lines[0].pvUci));
  assert.equal(typeof result.persistenceMode, 'undefined');
} finally {
  engine.dispose();
}

console.log('Passed WASM Stockfish depth-1 smoke check.');
