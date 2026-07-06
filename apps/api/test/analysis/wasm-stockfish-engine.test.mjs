import assert from 'node:assert/strict';
import { WasmStockfishEngineService } from '../../dist/modules/analysis/wasm-stockfish-engine.service.js';

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
