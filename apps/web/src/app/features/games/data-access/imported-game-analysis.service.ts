import { Injectable, signal } from '@angular/core';
import { Chess } from 'chess.js';
import { firstValueFrom } from 'rxjs';
import { classifyPly } from 'chess-domain';
import { ApiService } from '../../../services/api.service';
import { EngineAnalysis, EngineLine, StockfishAnalysisService } from '../../../services/stockfish-analysis.service';
import { ImportedGameDetail, ImportedGamePly, PositionAnalysisCache, PositionAnalysisLine, UserColor } from './games.models';

interface PositionAnalysisResponse {
  positionAnalysis: PositionAnalysisCache | null;
}

interface AnalysisRunResponse {
  run?: unknown;
}

export interface ImportedGameAnalysisProgress {
  running: boolean;
  gameId: number | null;
  currentPly: number;
  totalPlies: number;
  message: string | null;
  error: string | null;
}

interface PlyAnalysisPatch {
  plyNumber: number;
  scoreLossCp: number | null;
  classificationCode: number | null;
}

@Injectable({ providedIn: 'root' })
export class ImportedGameAnalysisService {
  readonly progress = signal<ImportedGameAnalysisProgress>({
    running: false,
    gameId: null,
    currentPly: 0,
    totalPlies: 0,
    message: null,
    error: null,
  });

  constructor(
    private api: ApiService,
    private stockfish: StockfishAnalysisService,
  ) {}

  async analyzeGame(gameId: number, force = false): Promise<AnalysisRunResponse> {
    const game = await firstValueFrom(this.api.get<ImportedGameDetail>(`/imported-games/${gameId}`));
    const plies = game.plies || [];
    if (!plies.length) throw new Error('This game has no indexed plies. Index plies before analysing.');

    this.progress.set({
      running: true,
      gameId,
      currentPly: 0,
      totalPlies: plies.length,
      message: force ? 'Clearing previous analysis...' : 'Preparing analysis...',
      error: null,
    });

    try {
      if (force) {
        await firstValueFrom(this.api.post(`/imported-games/${gameId}/plies/analysis/clear`, {}));
      }

      const updates: PlyAnalysisPatch[] = [];
      const seenPositions = new Set<string>();

      for (let index = 0; index < plies.length; index += 1) {
        const ply = plies[index];
        this.progress.set({
          running: true,
          gameId,
          currentPly: index + 1,
          totalPlies: plies.length,
          message: `Analysing ply ${index + 1} of ${plies.length}`,
          error: null,
        });

        const update = await this.analyzePly(ply);
        updates.push(update);
        seenPositions.add(ply.normalizedFen);
      }

      await firstValueFrom(this.api.patch(`/imported-games/${gameId}/plies/analysis`, { plies: updates }));
      const run = await firstValueFrom(this.api.post<AnalysisRunResponse>(`/imported-games/${gameId}/analysis-runs`, {
        positionsDone: seenPositions.size,
      }));

      this.progress.set({
        running: false,
        gameId,
        currentPly: plies.length,
        totalPlies: plies.length,
        message: 'Analysis complete',
        error: null,
      });
      return run;
    } catch (error) {
      const message = readError(error, 'Could not analyse imported game.');
      this.progress.set({
        ...this.progress(),
        running: false,
        error: message,
        message: null,
      });
      throw error;
    }
  }

  private async analyzePly(ply: ImportedGamePly): Promise<PlyAnalysisPatch> {
    const beforeFen = ply.normalizedFen;
    const side = sideToMove(beforeFen);
    const legalMoves = legalMoveCount(beforeFen);
    const position = await this.getCompletePositionAnalysis(beforeFen, ply.positionAnalysis);
    const bestMoveUci = position.bestMoveUci ?? position.lines[0]?.moveUci ?? position.lines[0]?.pvUci?.[0] ?? null;
    const bestScoreCpWhite = this.effectiveScoreCpWhite(position.bestScoreCpWhite, position.bestMateWhite);
    const playedScoreCpWhite = await this.playedMoveScoreCpWhite(beforeFen, ply.moveUci, position);
    const scoreLossCp = this.scoreLossCp(side, bestScoreCpWhite, playedScoreCpWhite);
    const classificationCode = classifyPly({
      moveUci: ply.moveUci,
      bestMoveUci,
      scoreLossCp,
      isForced: legalMoves <= 1,
    });

    return {
      plyNumber: ply.plyNumber,
      scoreLossCp,
      classificationCode,
    };
  }

  private async getCompletePositionAnalysis(fen: string, seed?: PositionAnalysisCache | null): Promise<PositionAnalysisCache> {
    if (this.isComplete(seed)) return seed;

    const cached = await this.lookupPosition(fen);
    if (this.isComplete(cached)) return cached;

    const analysis = await this.stockfish.analyzeOnce(fen, {
      depth: 12,
      multipv: 3,
      seedBestMove: this.bestMoveFromPosition(cached) ?? this.bestMoveFromPosition(seed) ?? null,
      seedLines: this.toEngineLines(cached || seed, fen),
    });
    return this.storePositionAnalysis(fen, analysis);
  }

  private async lookupPosition(fen: string): Promise<PositionAnalysisCache | null> {
    const encodedFen = encodeURIComponent(fen);
    const response = await firstValueFrom(this.api.get<PositionAnalysisResponse>(`/position-analysis?fen=${encodedFen}`));
    return response.positionAnalysis;
  }

  private async storePositionAnalysis(fen: string, analysis: EngineAnalysis): Promise<PositionAnalysisCache> {
    const body = {
      fen,
      bestMoveUci: analysis.bestMove || analysis.lines[0]?.pv?.[0] || undefined,
      bestScoreCpWhite: this.scoreFromSideToMoveToWhite(analysis.lines[0]?.scoreCp, fen),
      bestMateWhite: this.scoreFromSideToMoveToWhite(analysis.lines[0]?.mate, fen),
      lines: analysis.lines.slice(0, 3).map((line) => this.toBackendEngineLine(line, fen)),
    };
    const response = await firstValueFrom(this.api.post<PositionAnalysisResponse>('/position-analysis/store', body));
    if (!response.positionAnalysis) throw new Error('Position analysis was not stored.');
    return response.positionAnalysis;
  }

  private async playedMoveScoreCpWhite(fen: string, moveUci: string, position: PositionAnalysisCache): Promise<number | null> {
    const matchingLine = position.lines.find((line) => (line.moveUci ?? line.pvUci?.[0]) === moveUci);
    if (matchingLine) return this.effectiveScoreCpWhite(matchingLine.scoreCpWhite, matchingLine.mateWhite);

    const bestMoveUci = position.bestMoveUci ?? position.lines[0]?.moveUci ?? position.lines[0]?.pvUci?.[0] ?? null;
    if (bestMoveUci === moveUci) {
      return this.effectiveScoreCpWhite(position.bestScoreCpWhite, position.bestMateWhite);
    }

    const afterFen = this.fenAfterMove(fen, moveUci);
    if (!afterFen) return null;
    const afterPosition = await this.getCompletePositionAnalysis(afterFen, null);
    return this.effectiveScoreCpWhite(afterPosition.bestScoreCpWhite, afterPosition.bestMateWhite);
  }

  private isComplete(position?: PositionAnalysisCache | null): position is PositionAnalysisCache {
    return !!position && !!(position.bestMoveUci || position.lines?.[0]?.moveUci || position.lines?.[0]?.pvUci?.[0]) && (position.lines?.length ?? 0) >= 1;
  }

  private bestMoveFromPosition(position?: PositionAnalysisCache | null): string | null {
    return position?.bestMoveUci ?? position?.lines?.[0]?.moveUci ?? position?.lines?.[0]?.pvUci?.[0] ?? null;
  }

  private toBackendEngineLine(line: EngineLine, fen: string): PositionAnalysisLine {
    return {
      multipv: line.multipv,
      depth: line.depth,
      moveUci: line.pv[0] || undefined,
      scoreCpWhite: this.scoreFromSideToMoveToWhite(line.scoreCp, fen),
      mateWhite: this.scoreFromSideToMoveToWhite(line.mate, fen),
      pvUci: line.pv,
    };
  }

  private toEngineLines(position: PositionAnalysisCache | null | undefined, fen: string): EngineLine[] {
    if (!position?.lines?.length) return [];
    return position.lines.map((line, index) => ({
      multipv: line.multipv ?? index + 1,
      depth: line.depth ?? 0,
      scoreCp: this.scoreFromWhiteToSideToMove(line.scoreCpWhite ?? undefined, fen),
      mate: this.scoreFromWhiteToSideToMove(line.mateWhite ?? undefined, fen),
      pv: line.pvUci ?? (line.moveUci ? [line.moveUci] : []),
    }));
  }

  private scoreLossCp(side: UserColor, bestCpWhite: number | null, playedCpWhite: number | null): number | null {
    if (bestCpWhite === null || playedCpWhite === null) return null;
    const best = side === 'WHITE' ? bestCpWhite : -bestCpWhite;
    const played = side === 'WHITE' ? playedCpWhite : -playedCpWhite;
    return clampSmallInt(Math.max(0, Math.round(best - played)));
  }

  private effectiveScoreCpWhite(scoreCpWhite?: number | null, mateWhite?: number | null): number | null {
    if (typeof scoreCpWhite === 'number') return scoreCpWhite;
    if (typeof mateWhite !== 'number') return null;
    const sign = mateWhite >= 0 ? 1 : -1;
    return sign * (30000 - Math.min(1000, Math.abs(mateWhite) * 100));
  }

  private scoreFromWhiteToSideToMove(value: number | undefined, fen: string): number | undefined {
    if (value === undefined) return undefined;
    return fen.split(/\s+/)[1] === 'b' ? -value : value;
  }

  private scoreFromSideToMoveToWhite(value: number | undefined, fen: string): number | undefined {
    if (value === undefined) return undefined;
    return fen.split(/\s+/)[1] === 'b' ? -value : value;
  }

  private fenAfterMove(fen: string, moveUci: string): string | null {
    try {
      const chess = new Chess(fen);
      const move = chess.move({
        from: moveUci.slice(0, 2),
        to: moveUci.slice(2, 4),
        promotion: moveUci.slice(4, 5) || undefined,
      });
      return move ? chess.fen() : null;
    } catch {
      return null;
    }
  }
}

function sideToMove(fen: string): UserColor {
  return fen.split(/\s+/)[1] === 'b' ? 'BLACK' : 'WHITE';
}

function legalMoveCount(fen: string): number {
  try {
    return new Chess(fen).moves().length;
  } catch {
    return 0;
  }
}

function clampSmallInt(value: number): number {
  return Math.max(0, Math.min(32767, value));
}

function readError(err: unknown, fallback: string): string {
  if (typeof err === 'object' && err !== null) {
    const maybeHttp = err as { error?: { message?: string; error?: string }; message?: string };
    return maybeHttp.error?.message || maybeHttp.error?.error || maybeHttp.message || fallback;
  }
  return fallback;
}
