import { Injectable, OnDestroy } from '@angular/core';
import { Chess } from 'chess.js';
import { BehaviorSubject, firstValueFrom, Subscription } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
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

interface BulkPositionAnalysisResponse {
  positionAnalyses: PositionAnalysisCache[];
}

export interface CachedPositionAnalysisOptions {
  depth?: number;
  multipv?: number;
  pvMoveLimit?: number;
  seedPosition?: PositionAnalysisCache | null;
  keepAlive?: boolean;
  persistMode?: 'await' | 'background';
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
  private readonly knownRemoteMisses = new Set<string>();
  private requestSeq = 0;
  private pendingInteractiveSave: { fen: string; multipv: number } | null = null;
  private backgroundSaveQueue: Promise<void> = Promise.resolve();
  private pendingBackgroundSaveCount = 0;

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
    const persistMode = options.persistMode ?? 'await';
    const seed = this.usablePosition(options.seedPosition, fen, multipv);
    if (seed) {
      this.rememberPosition(fen, seed);
      return seed;
    }

    const memoryCached = this.memoryPosition(fen, multipv);
    if (memoryCached) return memoryCached;

    if (!this.isKnownRemoteMiss(fen)) {
      const cached = this.usablePosition(await this.lookupPosition(fen), fen, multipv);
      if (cached) {
        this.rememberPosition(fen, cached);
        return cached;
      }
    }

    const fallbackSeed = options.seedPosition;
    const analysis = await this.stockfish.analyzeOnce(fen, {
      depth,
      multipv,
      pvMoveLimit: options.pvMoveLimit,
      keepAlive: options.keepAlive,
      seedBestMove: this.bestMoveFromPosition(this.usablePosition(fallbackSeed, fen)),
      seedLines: this.toEngineLines(this.usablePosition(fallbackSeed, fen), fen),
    });
    return this.storePositionAnalysis(fen, analysis, multipv, persistMode);
  }

  async flushPendingPositionAnalysisSaves(): Promise<void> {
    while (this.pendingBackgroundSaveCount > 0) {
      await this.backgroundSaveQueue;
    }
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

  rememberSeedPositions(candidates: PositionAnalysisSeedCandidate[] = []): void {
    for (const candidate of candidates) {
      if (!candidate.normalizedFen || !this.isUsablePosition(candidate.positionAnalysis)) continue;
      this.memoryCache.set(candidate.normalizedFen, candidate.positionAnalysis);
      this.knownRemoteMisses.delete(candidate.normalizedFen);
    }
  }

  async bulkLookupPositions(fens: string[], requestedMultipv = 1): Promise<void> {
    const requestedNormalizedFens = this.deduplicateNormalizedFens(fens);
    const fensToLookup = requestedNormalizedFens.filter((fen) =>
      !this.memoryPosition(fen, requestedMultipv) && !this.knownRemoteMisses.has(fen)
    );
    if (!fensToLookup.length) return;

    try {
      const response = await firstValueFrom(this.api.post<BulkPositionAnalysisResponse>('/position-analysis/bulk-lookup', {
        fens: fensToLookup,
      }));
      const returnedNormalizedFens = new Set<string>();
      for (const position of response.positionAnalyses ?? []) {
        const normalizedFen = position.normalizedFen || (position.fen ? this.safeNormalizeFenForPosition(position.fen) : null);
        if (!normalizedFen) continue;
        this.memoryCache.set(normalizedFen, position);
        this.knownRemoteMisses.delete(normalizedFen);
        returnedNormalizedFens.add(normalizedFen);
      }

      for (const fen of fensToLookup) {
        if (!returnedNormalizedFens.has(fen)) this.knownRemoteMisses.add(fen);
      }
    } catch {
      // Keep the existing single-position lookup fallback if bulk preload fails.
    }
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

    const seed = this.usablePosition(options.seedPosition, fen, multipv);
    if (seed) {
      this.rememberPosition(fen, seed);
      this.emit(this.mapPositionAnalysis(seed, fen));
      return;
    }

    const memoryCached = this.memoryPosition(fen, multipv);
    if (memoryCached) {
      this.emit(this.mapPositionAnalysis(memoryCached, fen));
      return;
    }

    const cached = this.usablePosition(await this.lookupPosition(fen), fen, multipv);
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
      pvMoveLimit: options.pvMoveLimit,
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

  private async storePositionAnalysis(
    fen: string,
    analysis: EngineAnalysis,
    multipv: number,
    persistMode: 'await' | 'background' = 'await',
  ): Promise<PositionAnalysisCache> {
    const positionAnalysis = this.cacheFromAnalysis(fen, analysis, multipv);
    this.rememberPosition(fen, positionAnalysis);

    if (persistMode === 'background') {
      this.enqueueBackgroundSave(fen, positionAnalysis);
      return positionAnalysis;
    }

    return this.persistPositionAnalysis(fen, positionAnalysis);
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

  private async persistPositionAnalysis(fen: string, positionAnalysis: PositionAnalysisCache): Promise<PositionAnalysisCache> {
    const response = await firstValueFrom(this.api.post<PositionAnalysisResponse>('/position-analysis/store', positionAnalysis));
    if (!response.positionAnalysis) throw new Error('Position analysis was not stored.');
    this.rememberPosition(fen, response.positionAnalysis);
    return response.positionAnalysis;
  }

  private enqueueBackgroundSave(fen: string, positionAnalysis: PositionAnalysisCache): void {
    this.pendingBackgroundSaveCount += 1;
    this.backgroundSaveQueue = this.backgroundSaveQueue
      .catch(() => undefined)
      .then(async () => {
        try {
          await this.persistPositionAnalysis(fen, positionAnalysis);
        } catch (error) {
          console.warn('Background position-analysis save failed.', { fen, error });
        } finally {
          this.pendingBackgroundSaveCount -= 1;
        }
      });
  }

  private memoryPosition(fen: string, requestedMultipv = 1): PositionAnalysisCache | null {
    return this.usablePosition(this.memoryCache.get(this.normalizeFenForPosition(fen)), fen, requestedMultipv);
  }

  private rememberPosition(fen: string, position: PositionAnalysisCache): void {
    const normalizedFen = this.normalizeFenForPosition(fen);
    this.memoryCache.set(normalizedFen, position);
    this.knownRemoteMisses.delete(normalizedFen);
  }

  private isKnownRemoteMiss(fen: string): boolean {
    const normalizedFen = this.safeNormalizeFenForPosition(fen);
    return normalizedFen ? this.knownRemoteMisses.has(normalizedFen) : false;
  }

  private deduplicateNormalizedFens(fens: string[]): string[] {
    const normalizedFens = new Set<string>();
    for (const fen of fens) {
      const normalizedFen = this.safeNormalizeFenForPosition(fen);
      if (normalizedFen) normalizedFens.add(normalizedFen);
    }
    return Array.from(normalizedFens);
  }

  private usablePosition(position?: PositionAnalysisCache | null, fen?: string, requestedMultipv = 1): PositionAnalysisCache | null {
    if (!position) return null;
    if (fen && !this.positionMatchesFen(position, fen)) return null;
    const bestMove = this.bestMoveFromPosition(position);
    if (!bestMove && !position.lines?.length) return null;
    return this.hasRequestedLines(position, requestedMultipv, fen) ? position : null;
  }

  private hasRequestedLines(position: PositionAnalysisCache, requestedMultipv: number, fen?: string): boolean {
    const requiredLines = this.requiredLineCount(requestedMultipv, fen);
    const lines = Array.isArray(position.lines) ? position.lines : [];
    return lines.filter((line) => line.moveUci || line.pvUci?.[0]).length >= requiredLines;
  }

  private requiredLineCount(requestedMultipv: number, fen?: string): number {
    const requestedLines = Math.max(1, Math.min(3, Math.floor(requestedMultipv || 1)));
    if (!fen) return requestedLines;
    try {
      const legalMoves = new Chess(fen).moves().length;
      return Math.max(1, Math.min(requestedLines, legalMoves || requestedLines));
    } catch {
      return requestedLines;
    }
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

  private safeNormalizeFenForPosition(fen: string): string | null {
    try {
      return this.normalizeFenForPosition(fen);
    } catch {
      return null;
    }
  }

  private emit(state: EngineAnalysis): void {
    this.stateSubject.next(state);
  }
}
