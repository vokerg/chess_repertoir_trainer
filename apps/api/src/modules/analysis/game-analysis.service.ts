import { Chess } from 'chess.js';
import { CurrentUserService } from '../../services/currentUserService';
import { StockfishEngine } from './engine/stockfish-engine';
import { PositionAnalysisService } from './position-analysis.service';
import {
  completeGameAnalysisRun,
  createGameAnalysisRun,
  createGameMoveAnalysis,
  failGameAnalysisRun,
  getExistingGameAnalysis,
  getImportedGameForAnalysis,
} from './analysis.repository.prisma';
import { MoveClassification, ParsedGameMove } from './analysis.types';

function toUci(move: any): string {
  return `${move.from}${move.to}${move.promotion ?? ''}`;
}

function parsePgnMoves(pgn: string): ParsedGameMove[] {
  const chess = new Chess();
  const loaded = chess.loadPgn(pgn);
  if (!loaded) throw new Error('Could not parse imported game PGN');

  const history = chess.history({ verbose: true }) as any[];
  return history.map((move, index) => {
    const plyNumber = index + 1;
    return {
      plyNumber,
      moveNumber: Math.ceil(plyNumber / 2),
      side: move.color === 'b' ? 'BLACK' : 'WHITE',
      fenBefore: move.before,
      fenAfter: move.after,
      playedMoveUci: toUci(move),
      playedMoveSan: move.san,
    };
  });
}

function emptySummary() {
  return {
    totalMoves: 0,
    white: { BEST: 0, GOOD: 0, INACCURACY: 0, MISTAKE: 0, BLUNDER: 0 },
    black: { BEST: 0, GOOD: 0, INACCURACY: 0, MISTAKE: 0, BLUNDER: 0 },
    criticalPlyNumbers: [] as number[],
  };
}

function addToSummary(summary: ReturnType<typeof emptySummary>, move: ParsedGameMove, classification?: string) {
  summary.totalMoves += 1;
  const bucket = move.side === 'WHITE' ? summary.white : summary.black;
  if (classification && classification in bucket) {
    bucket[classification as MoveClassification] += 1;
  }
  if (classification === 'MISTAKE' || classification === 'BLUNDER') {
    summary.criticalPlyNumbers.push(move.plyNumber);
  }
}

export const GameAnalysisService = {
  analyzeImportedGame: async (importedGameId: number, options: { depth: number; multipv: number }) => {
    await CurrentUserService.getOrCreate();

    const engineName = StockfishEngine.engineName;
    const engineVersion = StockfishEngine.engineVersion();
    const existing = await getExistingGameAnalysis(importedGameId, {
      depth: options.depth,
      multipv: options.multipv,
      engineName,
      engineVersion,
    });

    if (existing) {
      return { reusedExisting: true, run: existing };
    }

    const game = await getImportedGameForAnalysis(importedGameId);
    if (!game) throw new Error('Imported game not found');
    if (!game.pgn) throw new Error('Imported game has no PGN to analyze');

    const moves = parsePgnMoves(game.pgn);
    if (moves.length === 0) throw new Error('Imported game PGN has no moves to analyze');

    const run = await createGameAnalysisRun({
      importedGameId,
      depth: options.depth,
      multipv: options.multipv,
      engineName,
      engineVersion,
      positionsTotal: moves.length,
    });

    const summary = emptySummary();
    let positionsDone = 0;

    try {
      for (const move of moves) {
        const position = await PositionAnalysisService.analyzePosition({
          fen: move.fenBefore,
          playedMoveUci: move.playedMoveUci,
          depth: options.depth,
          multipv: options.multipv,
        });

        await createGameMoveAnalysis({
          analysisRunId: run.id,
          importedGameId,
          positionAnalysisId: position.id,
          plyNumber: move.plyNumber,
          moveNumber: move.moveNumber,
          side: move.side,
          fenBefore: move.fenBefore,
          fenAfter: move.fenAfter,
          playedMoveUci: move.playedMoveUci,
          playedMoveSan: move.playedMoveSan,
          classification: position.classification,
          scoreLossCp: position.scoreLossCp,
        });

        positionsDone += 1;
        addToSummary(summary, move, position.classification);
      }

      const completed = await completeGameAnalysisRun(run.id, summary, positionsDone);
      return { reusedExisting: false, run: completed };
    } catch (err: any) {
      await failGameAnalysisRun(run.id, err?.message ?? String(err), positionsDone);
      throw err;
    }
  },
};
