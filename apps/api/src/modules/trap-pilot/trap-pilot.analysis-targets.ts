import { Chess } from 'chess.js';
import type { TrapPilotRecord } from './trap-pilot.types';
import type { TrapEngineAnalysisTarget } from './trap-pilot.evidence';

const UCI_MOVE_PATTERN = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

function createChess(fen?: string): Chess {
  if (!fen || fen === 'startpos') return new Chess();
  const parts = fen.trim().split(/\s+/);
  return new Chess(parts.length === 4 ? `${fen} 0 1` : fen);
}

function playUciMove(chess: Chess, moveUci: string): void {
  if (!UCI_MOVE_PATTERN.test(moveUci)) throw new Error(`Invalid UCI move ${moveUci}`);
  try {
    const played = chess.move({
      from: moveUci.slice(0, 2),
      to: moveUci.slice(2, 4),
      promotion: moveUci.slice(4, 5) || undefined,
    });
    if (!played) throw new Error(`Illegal UCI move ${moveUci}`);
  } catch (error) {
    throw new Error(
      error instanceof Error ? `Could not play ${moveUci}: ${error.message}` : `Could not play ${moveUci}`,
    );
  }
}

function replay(chess: Chess, movesUci: readonly string[]): void {
  for (const moveUci of movesUci) playUciMove(chess, moveUci);
}

export function deriveTrapEngineAnalysisTargets(record: TrapPilotRecord): TrapEngineAnalysisTarget[] {
  const setupRoute = record.trigger.setupRoutes[0];
  if (!setupRoute) throw new Error(`Record ${record.id} has no setup route.`);

  const trigger = createChess();
  replay(trigger, setupRoute.movesUci);
  const triggerFen = trigger.fen();
  const targets: TrapEngineAnalysisTarget[] = [
    {
      role: 'TRIGGER',
      referenceId: 'trigger',
      fen: triggerFen,
    },
  ];

  const responsePositions = new Map<string, string>();
  for (const response of record.temptingResponses) {
    const chess = createChess(triggerFen);
    replay(chess, response.movesUci);
    responsePositions.set(response.id, chess.fen());
    targets.push({
      role: 'AFTER_TEMPTING_RESPONSE',
      referenceId: response.id,
      fen: chess.fen(),
    });
  }

  for (const [index, punishment] of record.punishments.entries()) {
    const responseFen = responsePositions.get(punishment.againstResponseId);
    if (!responseFen) throw new Error(`Punishment references unknown response ${punishment.againstResponseId}.`);
    const firstMove = punishment.lineUci[0];
    if (!firstMove) throw new Error(`Punishment ${index} for ${record.id} has no moves.`);
    const chess = createChess(responseFen);
    playUciMove(chess, firstMove);
    targets.push({
      role: 'AFTER_FIRST_PUNISHMENT',
      referenceId: `${punishment.againstResponseId}:${index}`,
      fen: chess.fen(),
    });
  }

  for (const defense of record.safeDefenses) {
    const chess = createChess(triggerFen);
    playUciMove(chess, defense.moveUci);
    targets.push({
      role: 'AFTER_SAFE_DEFENSE',
      referenceId: defense.moveUci,
      fen: chess.fen(),
    });
  }

  return targets;
}
