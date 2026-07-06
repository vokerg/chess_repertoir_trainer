import { parentPort } from 'node:worker_threads';

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
  const createStockfish = require('stockfish') as (flavor?: string) => Promise<StockfishJsEngine>;
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
