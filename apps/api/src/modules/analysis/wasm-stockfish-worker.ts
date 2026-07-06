import { parentPort } from 'node:worker_threads';

const MISSING_STOCKFISH_PACKAGE_ERROR = 'WASM Stockfish engine is not installed. Add stockfish to apps/api dependencies or use STOCKFISH_ENGINE=local.';

interface StockfishJsEngine {
  listener?: (line: string) => void;
  sendCommand(command: string): void;
  terminate?: () => void;
}

interface WorkerCommandMessage {
  type: 'command';
  command: string;
}

const port = parentPort;
if (!port) {
  throw new Error('WASM Stockfish worker must run inside a worker thread');
}
const workerPort = port;

let engine: StockfishJsEngine | null = null;

async function init(): Promise<void> {
  let createStockfish: (flavor?: string) => Promise<StockfishJsEngine>;
  try {
    createStockfish = require('stockfish') as (flavor?: string) => Promise<StockfishJsEngine>;
  } catch (error: unknown) {
    if (isMissingStockfishPackageError(error)) {
      throw new Error(MISSING_STOCKFISH_PACKAGE_ERROR);
    }
    throw error;
  }

  engine = await createStockfish('lite-single');
  engine.listener = (line) => {
    workerPort.postMessage({ type: 'line', line });
  };
  workerPort.postMessage({ type: 'ready' });
}

workerPort.on('message', (message: WorkerCommandMessage) => {
  if (message.type !== 'command') return;
  if (message.command === 'quit') {
    engine?.sendCommand('quit');
    engine?.terminate?.();
    process.exit(0);
  }
  engine?.sendCommand(message.command);
});

init().catch((error: unknown) => {
  workerPort.postMessage({
    type: 'error',
    error: error instanceof Error ? error.message : String(error),
  });
});

function isMissingStockfishPackageError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as NodeJS.ErrnoException & { requireStack?: string[] };
  return candidate.code === 'MODULE_NOT_FOUND' && candidate.message?.includes("'stockfish'");
}
