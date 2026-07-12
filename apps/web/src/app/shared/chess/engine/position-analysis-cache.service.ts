import { Injectable, OnDestroy } from '@angular/core';
import { Chess } from 'chess.js';
import {
  effectiveScoreCpWhite,
  firstUciMove,
  scoreFromSideToMoveToWhite,
  scoreFromWhiteToSideToMove,
  shapePositionAnalysisForStorage,
} from 'chess-domain';
import { BehaviorSubject, firstValueFrom, Subscription } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { EngineAnalysis, EngineLine, StockfishAnalysisService } from './stockfish-analysis.service';

export const COMPACT_GAME_ANALYSIS_DEPTH = 12;
export const RICH_INTERACTIVE_ANALYSIS_DEPTH = 18;
export const RICH_INTERACTIVE_CACHE_MIN_DEPTH = 17;
export const DEFAULT_INTERACTIVE_MULTIPV = 3;
export const COMPACT_GAME_MULTIPV = 1;

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

export type PositionAnalysisPersistenceMode = 'compact' | 'rich';
export type PositionAnalysisCacheRequirement = 'best-eval' | 'lines';

interface PositionAnalysisStoreRequest {
  fen: string;
  bestMoveUci?: string | null;
  bestScoreCpWhite?: number | null;
  bestMateWhite?: number | null;
  lines?: PositionAnalysisLine[];
  persistenceMode?: PositionAnalysisPersistenceMode;
}

export interface CachedPositionAnalysisOptions {
  depth?: number;
  requiredDepth?: number;
  multipv?: number;
  pvMoveLimit?: number;
  seedPosition?: PositionAnalysisCache | null;
  keepAlive?: boolean;
  persistMode?: 'await' | 'background';
  persistenceMode?: PositionAnalysisPersistenceMode;
  cacheRequirement?: PositionAnalysisCacheRequirement;
}

export interface PositionAnalysisSeedCandidate {
  normalizedFen?: string | null;
  positionAnalysis?: (Omit<PositionAnalysisCache, 'lines'> & { lines?: PositionAnalysisLine[] }) | null;
}

export { firstUciMove } from 'chess-domain';

function defaultRequiredDepth(depth: number, cacheRequirement: PositionAnalysisCacheRequirement): number {
  return cacheRequirement === 'lines' && depth >= RICH_INTERACTIVE_ANALYSIS_DEPTH
    ? RICH_INTERACTIVE_CACHE_MIN_DEPTH
    : depth;
}

@Injectable({ providedIn: 'root' })
export class PositionAnalysisCacheService implements OnDestroy {
  private static readonly bulkSaveChunkSize = 25;
  private readonly emptyState: EngineAnalysis = { fen: '', running: false, ready: false, error: null, bestMove: null, lines: [] };
  private readonly stateSubject = new BehaviorSubject<EngineAnalysis>(this.emptyState);
  private readonly stockfishSub: Subscription;
  private readonly memoryCache = new Map<string, PositionAnalysisCache>();
  private readonly knownRemoteMisses = new Set<string>();
  private requestSeq = 0;
  private inflightInteractiveSaveRequestId: number | null = null;
  private pendingInteractiveSave: {
    requestId: number;
    fen: string;
    multipv: number;
    requiredDepth: number;
    cacheRequirement: PositionAnalysisCacheRequirement;
    persistenceMode: PositionAnalysisPersistenceMode;
  } | null = null;
  private readonly pendingBulkSaves = new Map<string, { positionAnalysis: PositionAnalysisCache; persistenceMode: PositionAnalysisPersistenceMode }>();
  private inflightBulkSave: Promise<void> | null = null;

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

  analyzeInteractiveRichPosition(
    fen: string,
    options: { seedPosition?: PositionAnalysisCache | null } = {},
  ): void {
    this.analyze(fen, {
      depth: RICH_INTERACTIVE_ANALYSIS_DEPTH,
      requiredDepth: RICH_INTERACTIVE_CACHE_MIN_DEPTH,
      multipv: DEFAULT_INTERACTIVE_MULTIPV,
      seedPosition: options.seedPosition,
      persistenceMode: 'rich',
      cacheRequirement: 'lines',
    });
  }

  getOrAnalyzeCompactGamePosition(
    fen: string,
    options: {
      seedPosition?: PositionAnalysisCache | null;
      keepAlive?: boolean;
    } = {},
  ): Promise<PositionAnalysisCache> {
    return this.getOrAnalyzePosition(fen, {
      depth: COMPACT_GAME_ANALYSIS_DEPTH,
      multipv: COMPACT_GAME_MULTIPV,
      pvMoveLimit: 1,
      seedPosition: options.seedPosition,
      keepAlive: options.keepAlive,
      persistMode: 'background',
      persistenceMode: 'compact',
      cacheRequirement: 'best-eval',
    });
  }

  private analyze(fen: string, options: CachedPositionAnalysisOptions = {}): void {
    void this.analyzeForUi(fen, options);
  }

  private async getOrAnalyzePosition(fen: string, options: CachedPositionAnalysisOptions = {}): Promise<PositionAnalysisCache> {
    const depth = options.depth ?? RICH_INTERACTIVE_ANALYSIS_DEPTH;
    const multipv = options.multipv ?? DEFAULT_INTERACTIVE_MULTIPV;
    const persistMode = options.persistMode ?? 'await';
    const persistenceMode = options.persistenceMode ?? 'rich';
    const cacheRequirement = options.cacheRequirement ?? (persistenceMode === 'compact' ? 'best-eval' : 'lines');
    const requiredDepth = options.requiredDepth ?? defaultRequiredDepth(depth, cacheRequirement);
    const seed = this.usablePosition(options.seedPosition, fen, multipv, requiredDepth, cacheRequirement);
    if (seed) {
      this.rememberPosition(fen, seed);
      return seed;
    }

    const memoryCached = this.memoryPosition(fen, multipv, requiredDepth, cacheRequirement);
    if (memoryCached) return memoryCached;

    if (!this.isKnownRemoteMiss(fen)) {
      const cached = this.usablePosition(await this.lookupPosition(fen), fen, multipv, requiredDepth, cacheRequirement);
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
      seedBestMove: this.bestMoveFromPosition(this.usablePosition(fallbackSeed, fen, multipv, requiredDepth, cacheRequirement)),
      seedLines: this.toEngineLines(this.usablePosition(fallbackSeed, fen, multipv, requiredDepth, 'lines'), fen),
    });
    return this.storePositionAnalysis(fen, analysis, multipv, persistMode, persistenceMode);
  }

  async flushPendingPositionAnalysisSaves(): Promise<void> {
    while (this.inflightBulkSave || this.pendingBulkSaves.size > 0) {
      if (this.inflightBulkSave) {
        await this.inflightBulkSave;
      } else {
        await this.flushOneBulkSaveChunk();
      }
    }
  }

  stop(): void {
    this.persistPendingAnalysis(this.stateSubject.value, true);
    this.requestSeq += 1;
    this.pendingInteractiveSave = null;
    this.inflightInteractiveSaveRequestId = null;
    this.stockfish.stop();
  }

  shutdownWorker(): void {
    this.persistPendingAnalysis(this.stateSubject.value, true);
    this.requestSeq += 1;
    this.pendingInteractiveSave = null;
    this.inflightInteractiveSaveRequestId = null;
    this.stockfish.shutdownWorker();
  }

  isUsablePosition(
    position?: PositionAnalysisCache | null,
    cacheRequirement: PositionAnalysisCacheRequirement = 'lines',
    requestedDepth = RICH_INTERACTIVE_ANALYSIS_DEPTH,
  ): position is PositionAnalysisCache {
    return !!this.usablePosition(position, undefined, 1, requestedDepth, cacheRequirement);
  }

  rememberSeedPositions(
    candidates: PositionAnalysisSeedCandidate[] = [],
    cacheRequirement: PositionAnalysisCacheRequirement = 'lines',
    requestedDepth = RICH_INTERACTIVE_ANALYSIS_DEPTH,
  ): void {
    for (const candidate of candidates) {
      const position = this.normalizeSeed(candidate.positionAnalysis);
      if (!candidate.normalizedFen || !this.isUsablePosition(position, cacheRequirement, requestedDepth)) continue;
      this.memoryCache.set(candidate.normalizedFen, position);
      this.knownRemoteMisses.delete(candidate.normalizedFen);
    }
  }

  async bulkLookupPositions(
    fens: string[],
    requestedMultipv = 1,
    options: { cacheRequirement?: PositionAnalysisCacheRequirement; requestedDepth?: number } = {},
  ): Promise<void> {
    const cacheRequirement = options.cacheRequirement ?? 'lines';
    const requestedDepth = options.requestedDepth ?? RICH_INTERACTIVE_ANALYSIS_DEPTH;
    const requestedNormalizedFens = this.deduplicateNormalizedFens(fens);
    const fensToLookup = requestedNormalizedFens.filter((fen) =>
      !this.memoryPosition(fen, requestedMultipv, requestedDepth, cacheRequirement) && !this.knownRemoteMisses.has(fen)
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

  seedForFen(
    fen: string,
    candidates: PositionAnalysisSeedCandidate[] = [],
    options: { cacheRequirement?: PositionAnalysisCacheRequirement; requestedDepth?: number } = {},
  ): PositionAnalysisCache | null {
    const normalizedFen = this.normalizeFenForPosition(fen);
    const cacheRequirement = options.cacheRequirement ?? 'lines';
    const requestedDepth = options.requestedDepth ?? RICH_INTERACTIVE_ANALYSIS_DEPTH;
    for (const candidate of candidates) {
      const position = this.normalizeSeed(candidate.positionAnalysis);
      if (candidate.normalizedFen === normalizedFen && this.isUsablePosition(position, cacheRequirement, requestedDepth)) return position;
    }
    return null;
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
    return firstUciMove(position?.bestMoveUci) ?? firstUciMove(position?.lines?.[0]?.moveUci) ?? firstUciMove(position?.lines?.[0]?.pvUci?.[0]);
  }

  effectiveScoreCpWhite(scoreCpWhite?: number | null, mateWhite?: number | null): number | null {
    return effectiveScoreCpWhite(scoreCpWhite, mateWhite);
  }

  private async analyzeForUi(fen: string, options: CachedPositionAnalysisOptions): Promise<void> {
    const depth = options.depth ?? RICH_INTERACTIVE_ANALYSIS_DEPTH;
    const multipv = options.multipv ?? DEFAULT_INTERACTIVE_MULTIPV;
    const persistenceMode = options.persistenceMode ?? 'rich';
    const cacheRequirement = options.cacheRequirement ?? (persistenceMode === 'compact' ? 'best-eval' : 'lines');
    const requiredDepth = options.requiredDepth ?? defaultRequiredDepth(depth, cacheRequirement);
    const requestId = ++this.requestSeq;

    this.persistPendingAnalysis(this.stateSubject.value, true);
    this.pendingInteractiveSave = null;
    this.inflightInteractiveSaveRequestId = null;
    this.stockfish.stop();
    this.emit({ fen, running: false, ready: false, error: null, bestMove: null, lines: [] });

    const seed = this.usablePosition(options.seedPosition, fen, multipv, requiredDepth, cacheRequirement);
    if (seed) {
      this.rememberPosition(fen, seed);
      this.emit(this.mapPositionAnalysis(seed, fen));
      return;
    }

    const memoryCached = this.memoryPosition(fen, multipv, requiredDepth, cacheRequirement);
    if (memoryCached) {
      this.emit(this.mapPositionAnalysis(memoryCached, fen));
      return;
    }

    const cached = this.usablePosition(await this.lookupPosition(fen), fen, multipv, requiredDepth, cacheRequirement);
    if (requestId !== this.requestSeq) return;
    if (cached) {
      this.rememberPosition(fen, cached);
      this.emit(this.mapPositionAnalysis(cached, fen));
      return;
    }

    this.pendingInteractiveSave = { requestId, fen, multipv, requiredDepth, cacheRequirement, persistenceMode };
    const fallbackSeed = this.usablePosition(options.seedPosition, fen, multipv, requiredDepth, cacheRequirement);
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
    persistenceMode: PositionAnalysisPersistenceMode = 'rich',
  ): Promise<PositionAnalysisCache> {
    const positionAnalysis = this.cacheFromAnalysis(fen, analysis, multipv);
    this.rememberPosition(fen, positionAnalysis);

    if (persistMode === 'background') {
      this.enqueueBackgroundSave(fen, positionAnalysis, persistenceMode);
      return positionAnalysis;
    }

    return this.persistPositionAnalysis(fen, positionAnalysis, persistenceMode);
  }

  private maybePersistInteractiveAnalysis(analysis: EngineAnalysis): void {
    this.persistPendingAnalysis(analysis, false);
  }

  private persistPendingAnalysis(analysis: EngineAnalysis, allowRunning: boolean): void {
    const pending = this.pendingInteractiveSave;
    if (!pending) return;
    if (analysis.fen !== pending.fen || analysis.error) return;
    if (analysis.running && (!allowRunning || pending.persistenceMode === 'rich')) return;
    if (!analysis.lines.length && !analysis.bestMove) return;
    if (this.inflightInteractiveSaveRequestId === pending.requestId) return;

    const candidate = this.cacheFromAnalysis(pending.fen, analysis, pending.multipv);
    if (!this.usablePosition(
      candidate,
      pending.fen,
      pending.multipv,
      pending.requiredDepth,
      pending.cacheRequirement,
    )) {
      return;
    }

    this.inflightInteractiveSaveRequestId = pending.requestId;
    this.persistPositionAnalysis(pending.fen, candidate, pending.persistenceMode)
      .then(() => {
        if (this.pendingInteractiveSave?.requestId === pending.requestId) {
          this.pendingInteractiveSave = null;
        }
      })
      .catch((error) => {
        console.warn('Interactive position-analysis save failed.', {
          fen: pending.fen,
          persistenceMode: pending.persistenceMode,
          error,
        });
      })
      .finally(() => {
        if (this.inflightInteractiveSaveRequestId === pending.requestId) {
          this.inflightInteractiveSaveRequestId = null;
        }
      });
  }

  private async persistPositionAnalysis(
    fen: string,
    positionAnalysis: PositionAnalysisCache,
    persistenceMode: PositionAnalysisPersistenceMode,
  ): Promise<PositionAnalysisCache> {
    const response = await firstValueFrom(this.api.post<PositionAnalysisResponse>(
      '/position-analysis/store',
      this.toStoreRequest(fen, positionAnalysis, persistenceMode),
    ));
    if (!response.positionAnalysis) throw new Error('Position analysis was not stored.');
    this.rememberPosition(fen, response.positionAnalysis);
    return response.positionAnalysis;
  }

  private enqueueBackgroundSave(
    fen: string,
    positionAnalysis: PositionAnalysisCache,
    persistenceMode: PositionAnalysisPersistenceMode,
  ): void {
    const normalizedFen = this.normalizeFenForPosition(fen);
    const existing = this.pendingBulkSaves.get(normalizedFen);
    if (existing?.persistenceMode === 'rich' && persistenceMode === 'compact') return;

    this.pendingBulkSaves.set(normalizedFen, {
      persistenceMode,
      positionAnalysis: {
        ...positionAnalysis,
        fen,
        normalizedFen,
      },
    });

    if (this.pendingBulkSaves.size >= PositionAnalysisCacheService.bulkSaveChunkSize) {
      this.triggerBackgroundBulkFlush();
    }
  }

  private triggerBackgroundBulkFlush(): void {
    if (this.inflightBulkSave) return;

    this.inflightBulkSave = (async () => {
      while (this.pendingBulkSaves.size >= PositionAnalysisCacheService.bulkSaveChunkSize) {
        await this.flushOneBulkSaveChunk();
      }
    })().finally(() => {
      this.inflightBulkSave = null;
    });
  }

  private async flushOneBulkSaveChunk(): Promise<void> {
    const items = Array.from(this.pendingBulkSaves.entries())
      .slice(0, PositionAnalysisCacheService.bulkSaveChunkSize)
      .map(([normalizedFen, item]) => ({ normalizedFen, ...item }));

    if (!items.length) return;

    for (const item of items) {
      this.pendingBulkSaves.delete(item.normalizedFen);
    }

    try {
      const stored = await this.persistPositionAnalysesBulk(items);
      for (const position of stored) {
        const fen = position.fen ?? position.normalizedFen;
        if (fen) this.rememberPosition(fen, position);
      }
    } catch (error) {
      console.warn('Background position-analysis bulk save failed.', { count: items.length, error });
    }
  }

  private async persistPositionAnalysesBulk(
    items: Array<{ positionAnalysis: PositionAnalysisCache; persistenceMode: PositionAnalysisPersistenceMode }>,
  ): Promise<PositionAnalysisCache[]> {
    const positions = items.map((item) =>
      this.toStoreRequest(
        item.positionAnalysis.fen ?? item.positionAnalysis.normalizedFen ?? '',
        item.positionAnalysis,
        item.persistenceMode,
      )
    );
    const response = await firstValueFrom(this.api.post<BulkPositionAnalysisResponse>('/position-analysis/bulk-store', {
      positions,
    }));
    return response.positionAnalyses ?? [];
  }

  private toStoreRequest(
    fen: string,
    positionAnalysis: PositionAnalysisCache,
    persistenceMode: PositionAnalysisPersistenceMode,
  ): PositionAnalysisStoreRequest {
    const shaped = shapePositionAnalysisForStorage({
      fen,
      bestMoveUci: this.bestMoveFromPosition(positionAnalysis),
      bestScoreCpWhite: positionAnalysis.bestScoreCpWhite,
      bestMateWhite: positionAnalysis.bestMateWhite,
      lines: positionAnalysis.lines.map((line) => ({
        multipv: line.multipv,
        depth: line.depth,
        moveUci: firstUciMove(line.moveUci) ?? undefined,
        scoreCpWhite: line.scoreCpWhite ?? undefined,
        mateWhite: line.mateWhite ?? undefined,
        pvUci: line.pvUci ?? [],
      })),
    }, persistenceMode);

    return {
      ...shaped,
      lines: shaped.lines ?? undefined,
    };
  }

  private memoryPosition(
    fen: string,
    requestedMultipv = 1,
    requestedDepth = RICH_INTERACTIVE_ANALYSIS_DEPTH,
    cacheRequirement: PositionAnalysisCacheRequirement = 'lines',
  ): PositionAnalysisCache | null {
    return this.usablePosition(this.memoryCache.get(this.normalizeFenForPosition(fen)), fen, requestedMultipv, requestedDepth, cacheRequirement);
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

  private usablePosition(
    position?: PositionAnalysisCache | null,
    fen?: string,
    requestedMultipv = 1,
    requestedDepth = RICH_INTERACTIVE_ANALYSIS_DEPTH,
    cacheRequirement: PositionAnalysisCacheRequirement = 'lines',
  ): PositionAnalysisCache | null {
    if (!position) return null;
    if (fen && !this.positionMatchesFen(position, fen)) return null;
    const bestMove = this.bestMoveFromPosition(position);
    if (cacheRequirement === 'best-eval') {
      return bestMove && this.effectiveScoreCpWhite(position.bestScoreCpWhite, position.bestMateWhite) !== null ? position : null;
    }
    if (!bestMove && !position.lines?.length) return null;
    return this.hasRequestedLines(position, requestedMultipv, requestedDepth, fen) ? position : null;
  }

  private normalizeSeed(position?: PositionAnalysisSeedCandidate['positionAnalysis']): PositionAnalysisCache | null {
    return position ? { ...position, lines: position.lines ?? [] } : null;
  }

  private hasRequestedLines(
    position: PositionAnalysisCache,
    requestedMultipv: number,
    requestedDepth: number,
    fen?: string,
  ): boolean {
    const requiredLines = this.requiredLineCount(requestedMultipv, fen);
    const lines = Array.isArray(position.lines) ? position.lines : [];
    if (lines.length < requiredLines) return false;
    const requestedLines = lines.slice(0, requiredLines);
    const bestLineDepth = requestedLines[0]?.depth;
    if (typeof bestLineDepth !== 'number' || bestLineDepth < requestedDepth) return false;
    return requestedLines.every((line) =>
      (firstUciMove(line.moveUci) || firstUciMove(line.pvUci?.[0])) &&
      typeof line.depth === 'number'
    );
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
      bestMoveUci: firstUciMove(analysis.bestMove) ?? firstUciMove(analysis.lines[0]?.pv?.[0]) ?? undefined,
      bestScoreCpWhite: scoreFromSideToMoveToWhite(analysis.lines[0]?.scoreCp, fen),
      bestMateWhite: scoreFromSideToMoveToWhite(analysis.lines[0]?.mate, fen),
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
        scoreCp: scoreFromWhiteToSideToMove(line.scoreCpWhite ?? undefined, fen),
        mate: scoreFromWhiteToSideToMove(line.mateWhite ?? undefined, fen),
        pv: line.pvUci ?? (line.moveUci ? [line.moveUci] : []),
      }))
      .filter((line) => line.pv.length);
  }

  private toPositionAnalysisLine(line: EngineLine, fen: string): PositionAnalysisLine {
    return {
      multipv: line.multipv,
      depth: line.depth,
      moveUci: firstUciMove(line.pv[0]) ?? undefined,
      scoreCpWhite: scoreFromSideToMoveToWhite(line.scoreCp, fen),
      mateWhite: scoreFromSideToMoveToWhite(line.mate, fen),
      pvUci: line.pv.map((move) => firstUciMove(move)).filter((move): move is string => move !== null),
    };
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
