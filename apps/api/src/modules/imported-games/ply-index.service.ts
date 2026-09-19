import { Chess } from 'chess.js';
import { normalizeFenForPosition } from 'chess-domain';
import { positionKeyForNormalizedFen } from '../positions/position-key';
import {
  clearPlyRowsForGame,
  countPlyRowsForGame,
  getImportedGameForPlyIndex,
  ImportedGamePlyCreateInput,
  markPlyIndexFailure,
  replacePlyRowsForGame,
} from './ply-index.repository.prisma';

export type PlyIndexStatus = 'INDEXED' | 'ALREADY_INDEXED' | 'FAILED';

export interface ImportedGamePlyIndexResult {
  importedGameId: number;
  status: PlyIndexStatus;
  pliesIndexed?: number;
  plyIndexedAt?: Date | null;
  error?: string;
}

function toUci(move: any): string {
  return `${move.from}${move.to}${move.promotion ?? ''}`;
}

function parsePlyRows(importedGameId: number, pgn: string): ImportedGamePlyCreateInput[] {
  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
  } catch {
    throw new Error('Could not parse imported game PGN');
  }

  const history = chess.history({ verbose: true }) as any[];
  return history.map((move, index) => {
    const plyNumber = index + 1;
    if (!move.before || !move.after) {
      throw new Error('Could not reconstruct move positions from imported game PGN');
    }

    const normalizedFen = normalizeFenForPosition(move.before);

    return {
      importedGameId,
      plyNumber,
      normalizedFen,
      positionKey: positionKeyForNormalizedFen(normalizedFen),
      moveUci: toUci(move),
    };
  });
}

export const ImportedGamePlyIndexService = {
  indexOne: async (userId: number, importedGameId: number, options: { force?: boolean } = {}): Promise<ImportedGamePlyIndexResult> => {
    const game = await getImportedGameForPlyIndex(userId, importedGameId);
    if (!game) throw new Error('Imported game not found');

    if (game.plyIndexedAt && !options.force) {
      return {
        importedGameId,
        status: 'ALREADY_INDEXED',
        pliesIndexed: await countPlyRowsForGame(importedGameId),
        plyIndexedAt: game.plyIndexedAt,
      };
    }

    if (options.force || game.plyIndexError) {
      await clearPlyRowsForGame(importedGameId);
    }

    if (!game.pgn) {
      const message = 'Imported game has no PGN to index';
      await markPlyIndexFailure(importedGameId, message);
      return { importedGameId, status: 'FAILED', error: message };
    }

    try {
      const rows = parsePlyRows(importedGameId, game.pgn);
      const result = await replacePlyRowsForGame(importedGameId, rows);
      return {
        importedGameId,
        status: 'INDEXED',
        pliesIndexed: result.pliesIndexed,
        plyIndexedAt: result.plyIndexedAt,
      };
    } catch (err: any) {
      const message = err?.message ?? String(err);
      await markPlyIndexFailure(importedGameId, message);
      return { importedGameId, status: 'FAILED', error: message };
    }
  },
};
