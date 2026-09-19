import { Chess } from 'chess.js';
import { OpeningLookupService } from '../../services/opening-book/openingLookupService';
import {
  getImportedGameForOpeningAssignment,
  updateImportedGameOpeningIfMissing,
} from './game-opening-assignment.repository.prisma';

export type OpeningAssignmentStatus = 'ASSIGNED' | 'SKIPPED' | 'FAILED';

export interface OpeningAssignmentResult {
  importedGameId: number;
  status: OpeningAssignmentStatus;
  openingEco?: string | null;
  openingName?: string | null;
  reason?: string;
}

function toUci(move: any): string {
  return `${move.from}${move.to}${move.promotion ?? ''}`;
}

function uciMovesFromPgn(pgn: string): string[] | null {
  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
  } catch {
    return null;
  }

  return (chess.history({ verbose: true }) as any[]).map(toUci);
}

export const GameOpeningAssignmentService = {
  assignMissingOpening: async (userId: number, importedGameId: number): Promise<OpeningAssignmentResult> => {
    const game = await getImportedGameForOpeningAssignment(userId, importedGameId);
    if (!game) throw new Error('Imported game not found');

    if (game.openingEco && game.openingName) {
      return {
        importedGameId: game.id,
        status: 'SKIPPED',
        openingEco: game.openingEco,
        openingName: game.openingName,
        reason: 'OPENING_ALREADY_PRESENT',
      };
    }

    if (!game.pgn?.trim()) {
      return {
        importedGameId: game.id,
        status: 'SKIPPED',
        reason: 'PGN_MISSING',
      };
    }

    const uciMoves = uciMovesFromPgn(game.pgn);
    if (!uciMoves) {
      return {
        importedGameId: game.id,
        status: 'FAILED',
        reason: 'PGN_PARSE_FAILED',
      };
    }

    const match = OpeningLookupService.lookupByMoves(uciMoves);
    if (!match) {
      return {
        importedGameId: game.id,
        status: 'SKIPPED',
        reason: 'NO_OPENING_MATCH',
      };
    }

    const nextOpeningEco = game.openingEco ?? match.eco;
    const nextOpeningName = game.openingName ?? match.name;

    const updated = await updateImportedGameOpeningIfMissing(game.id, {
      openingEco: game.openingEco ? undefined : nextOpeningEco,
      openingName: game.openingName ? undefined : nextOpeningName,
    });

    if (updated.openingEco !== nextOpeningEco || updated.openingName !== nextOpeningName) {
      return {
        importedGameId: updated.id,
        status: 'SKIPPED',
        openingEco: updated.openingEco,
        openingName: updated.openingName,
        reason: 'OPENING_ALREADY_PRESENT',
      };
    }

    return {
      importedGameId: updated.id,
      status: 'ASSIGNED',
      openingEco: updated.openingEco,
      openingName: updated.openingName,
    };
  },
};
