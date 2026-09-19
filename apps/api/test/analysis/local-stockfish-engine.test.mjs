import assert from 'node:assert/strict';
import { LocalStockfishEngineService } from '../../dist/modules/analysis/local-stockfish-engine.service.js';

const engine = new LocalStockfishEngineService({
  stockfishPath: 'stockfish-executable-that-does-not-exist',
  timeoutMs: 1_000,
});

try {
  await assert.rejects(engine.init(), (err) => {
    assert.equal(err?.code, 'ENOENT');
    return true;
  });
} finally {
  engine.dispose();
}

console.log('Passed local Stockfish missing-executable check.');
