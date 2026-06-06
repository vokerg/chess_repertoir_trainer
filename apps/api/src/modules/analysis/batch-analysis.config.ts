function readPositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readBoolean(value: string | undefined): boolean {
  return value === 'true' || value === '1' || value === 'yes';
}

export interface LocalBatchStockfishAnalysisConfig {
  enabled: boolean;
  stockfishPath: string;
  depth: number;
  multipv: number;
  timeoutMs: number;
}

export function isLocalBatchStockfishAnalysisEnabled(): boolean {
  return readBoolean(process.env['LOCAL_BATCH_STOCKFISH_ANALYSIS_ENABLED']);
}

export function getLocalBatchStockfishAnalysisConfig(): LocalBatchStockfishAnalysisConfig {
  return {
    enabled: isLocalBatchStockfishAnalysisEnabled(),
    stockfishPath: process.env['STOCKFISH_PATH'] || 'stockfish',
    depth: readPositiveInt(
      process.env['STOCKFISH_ANALYSIS_DEPTH'] || process.env['ANALYSIS_DEFAULT_DEPTH'],
      12,
    ),
    multipv: 1,
    timeoutMs: readPositiveInt(
      process.env['STOCKFISH_ANALYSIS_TIMEOUT_MS'] || process.env['ANALYSIS_TIMEOUT_MS'],
      15_000,
    ),
  };
}
