import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import { createInterface, Interface } from 'node:readline';
import { StorePositionAnalysisInput, StoredEngineLine } from './analysis.types';

interface PendingLineWaiter {
  test: (line: string) => boolean;
  resolve: () => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
}

interface ActiveAnalysis {
  fen: string;
  activeColor: 'w' | 'b';
  multipv: number;
  lines: Map<number, StoredEngineLine>;
  resolve: (value: StorePositionAnalysisInput) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
}

export interface LocalStockfishEngineOptions {
  stockfishPath: string;
  timeoutMs: number;
}

export interface EngineAnalyzeOptions {
  depth: number;
  multipv: number;
}

export class LocalStockfishEngineService {
  private process: ChildProcessWithoutNullStreams | null = null;
  private stdout: Interface | null = null;
  private waiters: PendingLineWaiter[] = [];
  private activeAnalysis: ActiveAnalysis | null = null;
  private stderrBuffer = '';

  constructor(private readonly options: LocalStockfishEngineOptions) {}

  async init(): Promise<void> {
    if (this.process) return;

    const child = spawn(this.options.stockfishPath, [], { stdio: 'pipe' });
    this.process = child;
    this.stdout = createInterface({ input: child.stdout });
    this.stdout.on('line', (line) => this.handleLine(line.trim()));
    child.stderr.on('data', (chunk) => {
      this.stderrBuffer += chunk.toString();
    });
    child.on('exit', (code, signal) => {
      const reason = `Local Stockfish exited with code ${code ?? 'null'} and signal ${signal ?? 'null'}`;
      this.rejectAll(new Error(reason));
    });
    child.on('error', (err) => this.rejectAll(err));

    this.send('uci');
    await this.waitForLine((line) => line === 'uciok');
    this.send('setoption name UCI_AnalyseMode value true');
    this.send('setoption name Threads value 1');
    this.send('setoption name Hash value 64');
    await this.ready();
  }

  async analyzePosition(fen: string, options: EngineAnalyzeOptions): Promise<StorePositionAnalysisInput> {
    await this.init();
    if (this.activeAnalysis) {
      throw new Error('Local Stockfish analysis is already running');
    }

    const activeColor = activeColorFromFen(fen);
    const multipv = Math.max(1, Math.min(3, options.multipv || 1));
    this.send(`setoption name MultiPV value ${multipv}`);
    await this.ready();

    return new Promise<StorePositionAnalysisInput>((resolve, reject) => {
      const timer = setTimeout(() => {
        const err = new Error(`Local Stockfish analysis timed out after ${this.options.timeoutMs}ms`);
        this.activeAnalysis = null;
        reject(err);
      }, this.options.timeoutMs);

      this.activeAnalysis = {
        fen,
        activeColor,
        multipv,
        lines: new Map<number, StoredEngineLine>(),
        resolve,
        reject,
        timer,
      };

      this.send(`position fen ${toEngineFen(fen)}`);
      this.send(`go depth ${Math.max(1, options.depth)}`);
    });
  }

  dispose(): void {
    const child = this.process;
    this.process = null;
    this.stdout?.close();
    this.stdout = null;
    this.rejectAll(new Error('Local Stockfish disposed'));
    if (child && !child.killed) {
      child.kill();
    }
  }

  private ready(): Promise<void> {
    this.send('isready');
    return this.waitForLine((line) => line === 'readyok');
  }

  private waitForLine(test: (line: string) => boolean): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiters = this.waiters.filter((waiter) => waiter.timer !== timer);
        reject(new Error(`Timed out waiting for local Stockfish response${this.stderrBuffer ? `: ${this.stderrBuffer}` : ''}`));
      }, this.options.timeoutMs);

      this.waiters.push({ test, resolve, reject, timer });
    });
  }

  private send(command: string): void {
    if (!this.process?.stdin.writable) {
      throw new Error('Local Stockfish process is not running');
    }
    this.process.stdin.write(`${command}\n`);
  }

  private handleLine(line: string): void {
    if (!line) return;

    for (const waiter of [...this.waiters]) {
      if (waiter.test(line)) {
        clearTimeout(waiter.timer);
        this.waiters = this.waiters.filter((candidate) => candidate !== waiter);
        waiter.resolve();
      }
    }

    if (line.startsWith('info ')) {
      this.captureInfoLine(line);
      return;
    }

    if (line.startsWith('bestmove ')) {
      this.finishAnalysis(line);
    }
  }

  private captureInfoLine(line: string): void {
    const active = this.activeAnalysis;
    if (!active) return;

    const parsed = parseInfoLine(line, active.activeColor);
    if (!parsed) return;

    const multipv = parsed.multipv ?? 1;
    const existing = active.lines.get(multipv);
    if (!existing || (parsed.depth ?? 0) >= (existing.depth ?? 0)) {
      active.lines.set(multipv, parsed);
    }
  }

  private finishAnalysis(bestMoveLine: string): void {
    const active = this.activeAnalysis;
    if (!active) return;

    clearTimeout(active.timer);
    this.activeAnalysis = null;

    const bestMove = bestMoveLine.split(/\s+/)[1];
    const lines = Array.from(active.lines.entries())
      .sort(([left], [right]) => left - right)
      .map(([, value]) => value)
      .slice(0, active.multipv);

    if (!lines.length && bestMove && bestMove !== '(none)') {
      lines.push({ multipv: 1, pvUci: [bestMove], moveUci: bestMove });
    }

    const bestLine = lines[0];
    active.resolve({
      fen: active.fen,
      bestMoveUci: bestLine?.moveUci ?? (bestMove !== '(none)' ? bestMove : undefined),
      bestScoreCpWhite: bestLine?.scoreCpWhite,
      bestMateWhite: bestLine?.mateWhite,
      lines,
    });
  }

  private rejectAll(err: Error): void {
    for (const waiter of this.waiters) {
      clearTimeout(waiter.timer);
      waiter.reject(err);
    }
    this.waiters = [];

    if (this.activeAnalysis) {
      clearTimeout(this.activeAnalysis.timer);
      this.activeAnalysis.reject(err);
      this.activeAnalysis = null;
    }
  }
}

function activeColorFromFen(fen: string): 'w' | 'b' {
  const active = fen.trim().split(/\s+/)[1];
  return active === 'b' ? 'b' : 'w';
}

function toEngineFen(fen: string): string {
  const parts = fen.trim().split(/\s+/);
  return parts.length >= 6 ? fen : `${parts.slice(0, 4).join(' ')} 0 1`;
}

function parseInfoLine(line: string, activeColor: 'w' | 'b'): StoredEngineLine | null {
  const tokens = line.split(/\s+/);
  const depth = numberAfter(tokens, 'depth');
  const multipv = numberAfter(tokens, 'multipv') ?? 1;
  const scoreIndex = tokens.indexOf('score');
  const pvIndex = tokens.indexOf('pv');
  if (scoreIndex < 0 || pvIndex < 0 || pvIndex >= tokens.length - 1) return null;

  const pvUci = tokens.slice(pvIndex + 1);
  const scoreKind = tokens[scoreIndex + 1];
  const scoreValue = Number.parseInt(tokens[scoreIndex + 2] ?? '', 10);
  if (!Number.isFinite(scoreValue)) return null;

  const lineResult: StoredEngineLine = {
    multipv,
    depth: depth ?? undefined,
    moveUci: pvUci[0],
    pvUci,
  };

  if (scoreKind === 'cp') {
    lineResult.scoreCpWhite = activeColor === 'w' ? scoreValue : -scoreValue;
  }
  if (scoreKind === 'mate') {
    lineResult.mateWhite = activeColor === 'w' ? scoreValue : -scoreValue;
  }

  return lineResult;
}

function numberAfter(tokens: string[], marker: string): number | null {
  const index = tokens.indexOf(marker);
  if (index < 0) return null;
  const parsed = Number.parseInt(tokens[index + 1] ?? '', 10);
  return Number.isFinite(parsed) ? parsed : null;
}
