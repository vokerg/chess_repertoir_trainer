import { Injectable, OnDestroy } from '@angular/core';
import { Chess } from 'chess.js';
import { BehaviorSubject, firstValueFrom, Subscription } from 'rxjs';
import { ApiService } from './api.service';
import { EngineAnalysis, EngineLine, StockfishAnalysisService } from './stockfish-analysis.service';

export interface PositionAnalysisLine {
  multipv?: number;
  depth?: number;
  moveUci?: string | null;
  scoreCpWhite?: number | null;
  mateWhite?: number | null;
  pvUci?: string[];
}

export interface PositionAnalysisCache {
  id?: number | null;
  positionId?: number | null;
  fen?: string | null;
  normalizedFen?: string | null;
  bestMoveUci?: string | null;
  bestScoreCpWhite?: number | null;
  bestMateWhite?: number | null;
  lines: PositionAnalysisLine[];
  fromCache?: boolean;
}

interface PositionAnalysisResponse {
  positionAnalysis: PositionAnalysisCache | null;
}

export interface CachedPositionAnalysisOptions {
  depth?: number;
  multipv?: number;
  seedPosition?: PositionAnalysisCache | null;
  keepAlive?: boolean;
}

export interface PositionAnalysisSeedCandidate {
  normalizedFen?: string | null;
  positionAnalysis?: PositionAnalysisCache | null;
}

@Injectable({ providedIn: 'root' })
export class PositionAnalysisCacheService implements OnDestroy {
  private readonly emptyState: EngineAnalysis = { fen: '', running: false, ready: false, error: null, bestMove: null, lines: [] };
  private readonly stateSubject = new BehaviorSubject<EngineAnalysis>(this.emptyState);
  private readonly stockfishSub: Subscription;
  private readonly memoryCache = new Map<string, PositionAnalysisCache>();
  private requestSeq = 0;
  private pendingInteractiveSave: { fen: string; multipv: number } | null = null;

  readonly state$ = this.stateSubject.asObservable();

  constructor(
    private api: ApiService,
    private stockfish: StockfishAnalysisService,
  ) {
    this.stockfishSub = this.stockfish.state$.subscribe((analysis) => {
      this.emit(analysis);
      this.maybePersistInteractiveAnalysis(analysis);
    });
  }

  ngOnDestroy() {
    this.stockfishSub.unsubscribe();
    this.shutdownWorker();
  }

  analyze(fen: string, options: CachedPositionAnalysisOptions = {}): void {
    void this.analyzeForUi(fen, options);
  }

  async getOrAnalyzePosition(fen: string, options: CachedPositionAnalysisOptions = {}): Promise<PositionAnalysisCache> {
    const depth = options.depth ?? 12;
    const multipv = options.multipv ?? 3;
    const seed = this.usablePosition(options.seedPosition, fen);
    if (seed) {
      this.rememberPosition(fen, seed);
      return seed;
    }

    const memoryCached = this.memoryPosition(fen);
    if (memoryCached) return memoryCached;

    const cached = this.usablePosition(await this.lookupPosition(fen), fen);
    if (cached) {
      this.rememberPosition(fen, cached);
      return cached;
    }

    const fallbackSeed = options.seedPosition;
    const analysis = await this.stockfish.analyzeOnce(fen, {
      depth,
      multipv,
      keepAlive: options.keepAlive,
      seedBestMove: this.bestMoveFromPosition(this.usablePosition(fallbackSeed, fen)),
      seedLines: this.toEngineLines(this.usablePosition(fallbackSeed, fen), fen),
    });
    return this.storePositionAnalysis(fen, analysis, multipv);
  }

  stop(): void {
    this.persistPendingAnalysis(this.stateSubject.value, true);
    this.requestSeq += 1;
    this.pendingInteractiveSave = null;
    this.stockfish.stop();
  }

  shutdownWorker(): void {
    this.persistPendingAnalysis(this.stateSubject.value, true);
    this.requestSeq += 1;
    this.pendingInteractiveSave = null;
    this.stockfish.shutdownWorker();
  }

  isUsablePosition(position?: PositionAnalysisCache | null): position is PositionAnalysisCache {
    return !!this.usablePosition(position);
  }

  seedForFen(fen: string, candidates: PositionAnalysisSeedCandidate[] = []): PositionAnalysisCache | null {
    const normalizedFen = this.normalizeFenForPosition(fen);
    return candidates.find((candidate) =>
      candidate.normalizedFen === normalizedFen && this.isUsablePosition(candidate.positionAnalysis)
    )?.positionAnalysis ?? null;
  }

  mapPositionAnalysis(position: PositionAnalysisCache, requestedFen: string): EngineAnalysis {
    return {
      fen: requestedFen,
      running: false,
      ready: true,
      error: null,
      bestMove: this.bestMoveFromPosition(position),
      lines: this.toEngineLines(position, requestedFen),
    };
  }

  bestMoveFromPosition(position?: PositionAnalysisCache | null): string | null {
    return position?.bestMoveUci ?? position?.lines?.[0]?.moveUci ?? position?.lines?.[0]?.pvUci?.[0] ?? null;
  }

  effectiveScoreCpWhite(scoreCpWhite?: number | null, mateWhite?: number | null): number | null {
    if (typeof scoreCpWhite === 'number') return scoreCpWhite;
    if (typeof mateWhite !== 'number') return null;
    const sign = mateWhite >= 0 ? 1 : -1;
    return sign * (30000 - Math.min(1000, Math.abs(mateWhite) * 100));
  }

  private async analyzeForUi(fen: string, options: CachedPositionAnalysisOptions): Promise<void> {
    const depth = options.depth ?? 12;
    const multipv = options.multipv ?? 3;
    const requestId = ++this.requestSeq;

    this.persistPendingAnalysis(this.stateSubject.value, true);
    this.pendingInteractiveSave = null;
    this.stockfish.stop();
    this.emit({ fen, running: false, ready: false, error: null, bestMove: null, lines: [] });

    const seed = this.usablePosition(options.seedPosition, fen);
    if (seed) {
      this.rememberPosition(fen, seed);
      this.emit(this.mapPositionAnalysis(seed, fen));
      return;
    }

    const memoryCached = this.memoryPosition(fen);
    if (memoryCached) {
      this.emit(this.mapPositionAnalysis(memoryCached, fen));
      return;
    }

    const cached = this.usablePosition(await this.lookupPosition(fen), fen);
    if (requestId !== this.requestSeq) return;
    if (cached) {
      this.rememberPosition(fen, cached);
      this.emit(this.mapPositionAnalysis(cached, fen));
      return;
    }

    this.pendingInteractiveSave = { fen, multipv };
    const fallbackSeed = this.usablePosition(options.seedPosition, fen);
    this.stockfish.analyze(fen, {
      depth,
      multipv,
      seedBestMove: this.bestMoveFromPosition(fallbackSeed),
      seedLines: this.toEngineLines(fallbackSeed, fen),
    });
  }

  private async lookupPosition(fen: string): Promise<PositionAnalysisCache | null> {
    try {
      const encodedFen = encodeURIComponent(fen);
      const response = await firstValueFrom(this.api.get<PositionAnalysisResponse>(`/position-analysis?fen=${encodedFen}`));
      return response.positionAnalysis;
    } catch {
      return null;
    }
  }

  private async storePositionAnalysis(fen: string, analysis: EngineAnalysis, multipv: number): Promise<PositionAnalysisCache> {
    const body = this.cacheFromAnalysis(fen, analysis, multipv);
    this.rememberPosition(fen, body);
    const response = await firstValueFrom(this.api.post<PositionAnalysisResponse>('/position-analysis/store', body));
    if (!response.positionAnalysis) throw new Error('Position analysis was not stored.');
    this.rememberPosition(fen, response.positionAnalysis);
    return response.positionAnalysis;
  }

  private maybePersistInteractiveAnalysis(analysis: EngineAnalysis): void {
    this.persistPendingAnalysis(analysis, false);
  }

  private persistPendingAnalysis(analysis: EngineAnalysis, allowRunning: boolean): void {
    const pending = this.pendingInteractiveSave;
    if (!pending) return;
    if (analysis.fen !== pending.fen || analysis.error) return;
    if (analysis.running && !allowRunning) return;
    if (!analysis.lines.length && !analysis.bestMove) return;

    this.pendingInteractiveSave = null;
    this.storePositionAnalysis(pending.fen, analysis, pending.multipv).catch(() => {
      // The UI already has the engine result; cache persistence is best-effort.
    });
  }

  private memoryPosition(fen: string): PositionAnalysisCache | null {
    return this.memoryCache.get(this.normalizeFenForPosition(fen)) ?? null;
  }

  private rememberPosition(fen: string, position: PositionAnalysisCache): void {
    this.memoryCache.set(this.normalizeFenForPosition(fen), position);
  }

  private usablePosition(position?: PositionAnalysisCache | null, fen?: string): PositionAnalysisCache | null {
    if (!position) return null;
    if (fen && !this.positionMatchesFen(position, fen)) return null;
    const bestMove = this.bestMoveFromPosition(position);
    return bestMove || position.lines?.length ? position : null;
  }

  private positionMatchesFen(position: PositionAnalysisCache, fen: string): boolean {
    const expected = this.normalizeFenForPosition(fen);
    if (position.normalizedFen && position.normalizedFen !== expected) return false;
    if (position.fen && this.normalizeFenForPosition(position.fen) !== expected) return false;
    return true;
  }

  private cacheFromAnalysis(fen: string, analysis: EngineAnalysis, multipv: number): PositionAnalysisCache {
    return {
      fen,
      normalizedFen: this.normalizeFenForPosition(fen),
      bestMoveUci: analysis.bestMove || analysis.lines[0]?.pv?.[0] || undefined,
      bestScoreCpWhite: this.scoreFromSideToMoveToWhite(analysis.lines[0]?.scoreCp, fen),
      bestMateWhite: this.scoreFromSideToMoveToWhite(analysis.lines[0]?.mate, fen),
      lines: analysis.lines.slice(0, multipv).map((line) => this.toPositionAnalysisLine(line, fen)),
      fromCache: false,
    };
  }

  private toEngineLines(position: PositionAnalysisCache | null | undefined, fen: string): EngineLine[] {
    if (!position?.lines?.length) return [];
    return position.lines
      .map((line, index) => ({
        multipv: line.multipv ?? index + 1,
        depth: line.depth ?? 0,
        scoreCp: this.scoreFromWhiteToSideToMove(line.scoreCpWhite ?? undefined, fen),
        mate: this.scoreFromWhiteToSideToMove(line.mateWhite ?? undefined, fen),
        pv: line.pvUci ?? (line.moveUci ? [line.moveUci] : []),
      }))
      .filter((line) => line.pv.length);
  }

  private toPositionAnalysisLine(line: EngineLine, fen: string): PositionAnalysisLine {
    return {
      multipv: line.multipv,
      depth: line.depth,
      moveUci: line.pv[0] || undefined,
      scoreCpWhite: this.scoreFromSideToMoveToWhite(line.scoreCp, fen),
      mateWhite: this.scoreFromSideToMoveToWhite(line.mate, fen),
      pvUci: line.pv,
    };
  }

  private scoreFromWhiteToSideToMove(value: number | undefined, fen: string): number | undefined {
    if (value === undefined) return undefined;
    return fen.split(/\s+/)[1] === 'b' ? -value : value;
  }

  private scoreFromSideToMoveToWhite(value: number | undefined, fen: string): number | undefined {
    if (value === undefined) return undefined;
    return fen.split(/\s+/)[1] === 'b' ? -value : value;
  }

  private normalizeFenForPosition(fen: string): string {
    const chess = fen === 'startpos' ? new Chess() : new Chess(fen);
    const parts = chess.fen().split(/\s+/);
    return parts.slice(0, 4).join(' ');
  }

  private emit(state: EngineAnalysis): void {
    this.stateSubject.next(state);
  }
}
