import { Injectable, signal } from '@angular/core';
import { Chess } from 'chess.js';
import { firstValueFrom } from 'rxjs';
import { classifyPly } from 'chess-domain';
import { ApiService } from '../../../services/api.service';
import { PositionAnalysisCacheService } from '../../../services/position-analysis-cache.service';
import { ImportedGameDetail, ImportedGamePly, PositionAnalysisCache, UserColor } from './games.models';

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

const MAX_PERSISTED_SCORE_LOSS_CP = 300;

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
    private positionAnalysis: PositionAnalysisCacheService,
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
    } finally {
      this.positionAnalysis.shutdownWorker();
    }
  }

  private async analyzePly(ply: ImportedGamePly): Promise<PlyAnalysisPatch> {
    const beforeFen = ply.normalizedFen;
    const side = sideToMove(beforeFen);
    const legalMoves = legalMoveCount(beforeFen);
    const position = await this.getGamePositionAnalysis(beforeFen, ply.positionAnalysis);
    const bestMoveUci = position.bestMoveUci ?? position.lines[0]?.moveUci ?? position.lines[0]?.pvUci?.[0] ?? null;
    const bestScoreCpWhite = this.positionAnalysis.effectiveScoreCpWhite(position.bestScoreCpWhite, position.bestMateWhite);
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

  private async getGamePositionAnalysis(fen: string, seed?: PositionAnalysisCache | null): Promise<PositionAnalysisCache> {
    return this.positionAnalysis.getOrAnalyzePosition(fen, {
      depth: 12,
      multipv: 1,
      keepAlive: true,
      seedPosition: seed,
    });
  }

  private async playedMoveScoreCpWhite(fen: string, moveUci: string, position: PositionAnalysisCache): Promise<number | null> {
    const matchingLine = position.lines.find((line) => (line.moveUci ?? line.pvUci?.[0]) === moveUci);
    if (matchingLine) return this.positionAnalysis.effectiveScoreCpWhite(matchingLine.scoreCpWhite, matchingLine.mateWhite);

    const bestMoveUci = position.bestMoveUci ?? position.lines[0]?.moveUci ?? position.lines[0]?.pvUci?.[0] ?? null;
    if (bestMoveUci === moveUci) {
      return this.positionAnalysis.effectiveScoreCpWhite(position.bestScoreCpWhite, position.bestMateWhite);
    }

    const afterFen = this.fenAfterMove(fen, moveUci);
    if (!afterFen) return null;
    const afterPosition = await this.getGamePositionAnalysis(afterFen, null);
    return this.positionAnalysis.effectiveScoreCpWhite(afterPosition.bestScoreCpWhite, afterPosition.bestMateWhite);
  }

  private scoreLossCp(side: UserColor, bestCpWhite: number | null, playedCpWhite: number | null): number | null {
    if (bestCpWhite === null || playedCpWhite === null) return null;
    const best = side === 'WHITE' ? bestCpWhite : -bestCpWhite;
    const played = side === 'WHITE' ? playedCpWhite : -playedCpWhite;
    const loss = Math.max(0, Math.round(best - played));
    // Mate scores are represented as large synthetic centipawn values. Cap the
    // persisted loss so one mating swing does not dominate whole-game accuracy.
    return clampSmallInt(Math.min(MAX_PERSISTED_SCORE_LOSS_CP, loss));
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
