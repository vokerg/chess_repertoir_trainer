import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

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
  lines: Map<number, EngineLine>;
}

@Injectable({ providedIn: 'root' })
export class StockfishAnalysisService implements OnDestroy {
  private worker: Worker | null = null;
  private ready = false;
  private runSeq = 0;
  private currentRun: PendingRun | null = null;

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
    this.worker?.terminate();
    this.worker = null;
  }

  analyze(fen: string, options: { depth?: number; multipv?: number } = {}) {
    const depth = options.depth ?? 12;
    const multipv = options.multipv ?? 3;
    const runId = ++this.runSeq;

    this.ensureWorker();
    if (!this.worker) {
      this.emit({ fen, running: false, ready: false, error: 'Stockfish worker could not be loaded.', bestMove: null, lines: [] });
      return;
    }

    this.currentRun = { id: runId, fen, depth, multipv, lines: new Map<number, EngineLine>() };
    this.emit({ fen, running: true, ready: this.ready, error: null, bestMove: null, lines: [] });

    this.post('stop');
    this.post('ucinewgame');
    this.post(`setoption name MultiPV value ${multipv}`);
    this.post(`position fen ${fen}`);
    this.post(`go depth ${depth}`);
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
      this.worker = new Worker('/assets/stockfish/stockfish-18-lite-single.js');
      this.worker.onmessage = (event) => this.zone.run(() => this.handleMessage(String(event.data ?? '')));
      this.worker.onerror = () => this.zone.run(() => {
        const state = this.stateSubject.value;
        this.emit({ ...state, running: false, ready: false, error: 'Stockfish failed to start.' });
      });
      this.post('uci');
      this.post('isready');
    } catch {
      this.worker = null;
    }
  }

  private post(command: string) {
    this.worker?.postMessage(command);
  }

  private handleMessage(message: string) {
    if (message === 'uciok' || message === 'readyok') {
      this.ready = true;
      this.emit({ ...this.stateSubject.value, ready: true });
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
      this.emit({ ...state, running: false, bestMove });
      this.currentRun = null;
    }
  }

  private parseInfo(message: string): EngineLine | null {
    const tokens = message.split(/\s+/);
    const depthIndex = tokens.indexOf('depth');
    const pvIndex = tokens.indexOf('pv');
    const scoreIndex = tokens.indexOf('score');
    if (depthIndex < 0 || pvIndex < 0 || scoreIndex < 0) return null;

    const multipvIndex = tokens.indexOf('multipv');
    const multipv = multipvIndex >= 0 ? Number(tokens[multipvIndex + 1]) || 1 : 1;
    const depth = Number(tokens[depthIndex + 1]) || 0;
    const scoreKind = tokens[scoreIndex + 1];
    const scoreValue = Number(tokens[scoreIndex + 2]);
    const pv = tokens.slice(pvIndex + 1).filter(Boolean);

    const line: EngineLine = { multipv, depth, pv };
    if (scoreKind === 'cp') line.scoreCp = scoreValue;
    if (scoreKind === 'mate') line.mate = scoreValue;
    return line;
  }

  private emit(state: EngineAnalysis) {
    this.stateSubject.next(state);
  }
}
