import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createInterface, Interface } from 'node:readline';
import { parentPort } from 'node:worker_threads';

const MISSING_STOCKFISH_PACKAGE_ERROR = 'WASM Stockfish engine is not installed. Add stockfish to apps/api dependencies or use STOCKFISH_ENGINE=local.';

interface WorkerCommandMessage {
  type: 'command';
  command: string;
}

const port = parentPort;
if (!port) {
  throw new Error('WASM Stockfish worker must run inside a worker thread');
}
const workerPort = port;

let engineProcess: ChildProcessWithoutNullStreams | null = null;
let stdout: Interface | null = null;

async function init(): Promise<void> {
  let enginePath: string;
  try {
    enginePath = resolveStockfishEnginePath();
  } catch (error: unknown) {
    if (isMissingStockfishPackageError(error)) {
      throw new Error(MISSING_STOCKFISH_PACKAGE_ERROR);
    }
    throw error;
  }

  const child = spawn(process.execPath, [enginePath], {
    stdio: 'pipe',
    windowsHide: true,
  });
  engineProcess = child;
  stdout = createInterface({ input: child.stdout });
  stdout.on('line', (line) => {
    workerPort.postMessage({ type: 'line', line });
  });
  child.stderr.on('data', (chunk) => {
    workerPort.postMessage({ type: 'line', line: String(chunk).trim() });
  });
  child.on('error', (error) => {
    workerPort.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
    });
  });
  child.on('exit', (code, signal) => {
    engineProcess = null;
    stdout?.close();
    stdout = null;
    if (code === 0 || signal === 'SIGTERM') return;
    workerPort.postMessage({
      type: 'error',
      error: `WASM Stockfish process exited with code ${code ?? 'null'} and signal ${signal ?? 'null'}`,
    });
  });

  await new Promise<void>((resolve, reject) => {
    child.once('spawn', resolve);
    child.once('error', reject);
  });
  workerPort.postMessage({ type: 'ready' });
}

workerPort.on('message', (message: WorkerCommandMessage) => {
  if (message.type !== 'command') return;
  if (message.command === 'quit') {
    sendCommand('quit');
    engineProcess?.kill();
    process.exit(0);
  }
  sendCommand(message.command);
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
  return candidate.code === 'MODULE_NOT_FOUND' && candidate.message?.includes('stockfish');
}

function resolveStockfishEnginePath(): string {
  const packageJsonPath = require.resolve('stockfish/package.json');
  const packageRoot = dirname(packageJsonPath);
  const buildVersion = require(packageJsonPath).buildVersion ?? '18';
  const enginePath = join(packageRoot, 'bin', `stockfish-${buildVersion}-lite-single.js`);
  if (!existsSync(enginePath)) {
    throw new Error(`Could not find npm Stockfish engine file at ${enginePath}`);
  }
  return enginePath;
}

function sendCommand(command: string): void {
  if (!engineProcess?.stdin.writable) {
    workerPort.postMessage({ type: 'error', error: 'WASM Stockfish process is not running' });
    return;
  }
  engineProcess.stdin.write(`${command}\n`);
}
