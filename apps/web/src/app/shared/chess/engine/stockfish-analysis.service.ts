import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { parseUciInfoLine } from 'chess-domain';
import { BehaviorSubject, Subscription } from 'rxjs';

export interface EngineLine {
  multipv: number;
  depth: number;
  scoreCp?: number;
  mate?: number;
  pv: string[];
}

export interface EngineAnalysis {
  fen: string;
  running: boolean;
  ready: boolean;
  error?: string | null;
  bestMove?: string | null;
  lines: EngineLine[];
}

interface PendingRun {
  id: number;
  fen: string;
  depth: number;
  multipv: number;
  pvMoveLimit?: number;
  keepAlive: boolean;
  started: boolean;
  lines: Map<number, EngineLine>;
}

@Injectable({ providedIn: 'root' })
export class StockfishAnalysisService implements OnDestroy {
  private worker: Worker | null = null;
  private ready = false;
  private runSeq = 0;
  private currentRun: PendingRun | null = null;
  private startupTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly stateSubject = new BehaviorSubject<EngineAnalysis>({
    fen: '',
    running: false,
    ready: false,
    error: null,
    bestMove: null,
    lines: [],
  });

  readonly state$ = this.stateSubject.asObservable();

  constructor(private zone: NgZone) {}

  ngOnDestroy() {
    this.stop();
    this.resetWorker();
  }

  analyze(fen: string, options: { depth?: number; multipv?: number; pvMoveLimit?: number; seedBestMove?: string | null; seedLines?: EngineLine[]; keepAlive?: boolean } = {}) {
    const depth = options.depth ?? 12;
    const multipv = options.multipv ?? 3;
    const pvMoveLimit = options.pvMoveLimit;
    const keepAlive = options.keepAlive ?? false;
    const runId = ++this.runSeq;

    // The asm.js engine appears to become unstable across repeated searches,
    // so interactive single-position analysis keeps using fresh workers. Batch
    // game analysis can opt into one worker per batch to avoid repeated script loads.
    if (!keepAlive) {
      this.resetWorker();
    } else {
      this.post('stop');
    }
    this.currentRun = { id: runId, fen, depth, multipv, pvMoveLimit, keepAlive, started: false, lines: new Map<number, EngineLine>() };
    this.emit({
      fen,
      running: true,
      ready: false,
      error: null,
      bestMove: options.seedBestMove ?? null,
      lines: options.seedLines ?? [],
    });

    this.ensureWorker();
    if (!this.worker) {
      this.emit({ fen, running: false, ready: false, error: 'Stockfish worker could not be loaded.', bestMove: null, lines: [] });
      return;
    }
    if (this.ready) {
      this.startCurrentRun();
    }
  }

  analyzeOnce(
    fen: string,
    options: { depth?: number; multipv?: number; pvMoveLimit?: number; seedBestMove?: string | null; seedLines?: EngineLine[]; timeoutMs?: number; keepAlive?: boolean } = {},
  ): Promise<EngineAnalysis> {
    const depth = options.depth ?? 12;
    const multipv = options.multipv ?? 3;
    const timeoutMs = options.timeoutMs ?? Math.max(10000, depth * 2500);

    return new Promise((resolve, reject) => {
      let settled = false;
      let subscription: Subscription | null = null;
      this.analyze(fen, {
        depth,
        multipv,
        pvMoveLimit: options.pvMoveLimit,
        seedBestMove: options.seedBestMove,
        seedLines: options.seedLines,
        keepAlive: options.keepAlive,
      });

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        subscription?.unsubscribe();
        this.stop();
        reject(new Error('Stockfish analysis timed out.'));
      }, timeoutMs);

      const finish = (callback: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        subscription?.unsubscribe();
        callback();
      };

      subscription = this.state$.subscribe((analysis) => {
        if (analysis.fen !== fen) return;
        if (analysis.error) {
          finish(() => reject(new Error(analysis.error || 'Stockfish analysis failed.')));
          return;
        }
        if (!analysis.running && (analysis.bestMove || analysis.lines.length > 0)) {
          finish(() => resolve(analysis));
        }
      });
      if (settled) subscription.unsubscribe();
    });
  }

  shutdownWorker() {
    this.stop();
    this.resetWorker();
  }

  stop() {
    this.post('stop');
    const state = this.stateSubject.value;
    this.currentRun = null;
    this.emit({ ...state, running: false });
  }

  private ensureWorker() {
    if (this.worker) return;
    try {
      const assetBase = `${window.location.origin}/assets/stockfish/`;
      const workerUrl = `${assetBase}bin/stockfish-18-asm.js`;

      this.ready = false;
      this.worker = new Worker(workerUrl);
      this.worker.onmessage = (event) => this.zone.run(() => this.handleMessage(String(event.data ?? '')));
      this.worker.onerror = (event) => this.zone.run(() => {
        const state = this.stateSubject.value;
        const detail = event.message ? ` ${event.message}` : '';
        this.emit({ ...state, running: false, ready: false, error: `Stockfish failed to start.${detail}` });
      });
      this.startupTimer = setTimeout(() => {
        this.zone.run(() => {
          if (!this.ready) {
            const state = this.stateSubject.value;
            this.emit({ ...state, running: false, ready: false, error: 'Stockfish did not become ready in time.' });
            this.resetWorker();
          }
        });
      }, 4000);
      this.post('uci');
      this.post('isready');
    } catch (error: any) {
      const state = this.stateSubject.value;
      this.emit({ ...state, running: false, ready: false, error: `Stockfish worker could not be created. ${error?.message ?? ''}`.trim() });
      this.resetWorker();
    }
  }

  private post(command: string) {
    this.worker?.postMessage(command);
  }

  private handleMessage(message: string) {
    if (message.startsWith('error ')) {
      const state = this.stateSubject.value;
      this.emit({ ...state, running: false, ready: false, error: `Stockfish failed to start. ${message.slice(6)}` });
      this.resetWorker();
      return;
    }

    if (message === 'uciok' || message === 'readyok') {
      if (this.startupTimer) {
        clearTimeout(this.startupTimer);
        this.startupTimer = null;
      }
      this.ready = true;
      this.emit({ ...this.stateSubject.value, ready: true });
      this.startCurrentRun();
      return;
    }

    if (message.startsWith('info ')) {
      const parsed = this.parseInfo(message);
      if (!parsed || !this.currentRun) return;
      this.currentRun.lines.set(parsed.multipv, parsed);
      const lines = [...this.currentRun.lines.values()].sort((a, b) => a.multipv - b.multipv);
      this.emit({ ...this.stateSubject.value, lines });
      return;
    }

    if (message.startsWith('bestmove ')) {
      const bestMove = message.split(/\s+/)[1] || null;
      const state = this.stateSubject.value;
      const keepAlive = this.currentRun?.keepAlive ?? false;
      this.emit({ ...state, running: false, bestMove });
      this.currentRun = null;
      if (!keepAlive) this.resetWorker();
    }
  }

  private parseInfo(message: string): EngineLine | null {
    const parsed = parseUciInfoLine(message, { pvMoveLimit: this.currentRun?.pvMoveLimit });
    if (!parsed) return null;

    const line: EngineLine = {
      multipv: parsed.multipv,
      depth: parsed.depth ?? 0,
      pv: parsed.pvUci,
    };
    if (parsed.scoreCp !== undefined) line.scoreCp = parsed.scoreCp;
    if (parsed.mate !== undefined) line.mate = parsed.mate;
    return line;
  }

  private emit(state: EngineAnalysis) {
    this.stateSubject.next(state);
  }

  private startCurrentRun() {
    if (!this.worker || !this.currentRun || this.currentRun.started) return;
    const { fen, depth, multipv } = this.currentRun;
    this.currentRun.started = true;
    this.post('stop');
    this.post('ucinewgame');
    this.post(`setoption name MultiPV value ${multipv}`);
    this.post(`position fen ${fen}`);
    this.post(`go depth ${depth}`);
  }

  private resetWorker() {
    if (this.startupTimer) {
      clearTimeout(this.startupTimer);
      this.startupTimer = null;
    }
    this.worker?.terminate();
    this.worker = null;
    this.ready = false;
  }
}
