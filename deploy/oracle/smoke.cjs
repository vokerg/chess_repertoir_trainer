// Runs inside the built ARM64 image without database credentials or production I/O.
const assert = require('node:assert/strict');
const { WasmStockfishEngineService } = require('/workspace/apps/api/dist/modules/analysis/wasm-stockfish-engine.service.js');
assert.equal(process.arch, 'arm64');
const engine = new WasmStockfishEngineService({ timeoutMs: 30000 });
(async () => {
  try {
    const result = await engine.analyzePosition('8/8/8/8/8/8/4K3/6k1 w - - 0 1', { depth: 1, multipv: 1 });
    assert.match(result.bestMoveUci, /^[a-h][1-8][a-h][1-8][qrbn]?$/);
    assert.ok(result.lines.length > 0);
    console.log('ARM64 image and real WASM Stockfish smoke check passed');
  } finally {
    engine.dispose();
  }
})().catch(() => {
  console.error('ARM64 image smoke check failed');
  process.exitCode = 1;
});
