import type { LocalBatchStockfishAnalysisConfig } from './batch-analysis.config';
import { LocalStockfishEngineService } from './local-stockfish-engine.service';
import type { StockfishEngine } from './stockfish-engine';
import { WasmStockfishEngineService } from './wasm-stockfish-engine.service';

export function createStockfishEngine(config: LocalBatchStockfishAnalysisConfig): StockfishEngine {
  if (config.engine === 'wasm') {
    return new WasmStockfishEngineService({
      timeoutMs: config.timeoutMs,
    });
  }

  return new LocalStockfishEngineService({
    stockfishPath: config.stockfishPath,
    timeoutMs: config.timeoutMs,
  });
}
