import { OpeningStruggleItem, OpeningStrugglesMode } from '../data-access/opening-struggles.models';
import { Chess } from 'chess.js';

export function lineLabel(item: OpeningStruggleItem): string {
  return formatNumberedSan(item.movesSan?.length ? item.movesSan : movesSan(item.movesUci));
}

export function positionBeforeMoveLabel(item: OpeningStruggleItem): string {
  const moves = item.movesSan?.length ? item.movesSan : movesSan(item.movesUci);
  return moves.length > 1 ? formatNumberedSan(moves.slice(0, -1)) : 'Starting position';
}

export function repeatedMoveLabel(item: OpeningStruggleItem): string {
  const moves = item.movesSan?.length ? item.movesSan : movesSan(item.movesUci);
  return moves.at(-1) ?? item.movesUci.at(-1) ?? '-';
}

export function analysisQueryParams(
  item: OpeningStruggleItem,
  mode: OpeningStrugglesMode,
): Record<string, string | number> {
  if (mode === 'repeatedMistakes') {
    const beforePly = item.ply - 1;
    const params: Record<string, string | number> = {
      fen: fenAfterMoves(item.movesUci.slice(0, -1)),
    };
    if (item.analysisGameId !== null && beforePly > 0) {
      params['gameId'] = item.analysisGameId;
      params['ply'] = beforePly;
    }
    return params;
  }

  const params: Record<string, string | number> = {
    fen: terminalFen(item),
    ply: item.ply,
  };
  if (item.analysisGameId !== null) params['gameId'] = item.analysisGameId;
  return params;
}

export function wdlLabel(item: Pick<OpeningStruggleItem, 'wins' | 'draws' | 'losses'>): string {
  return `${item.wins}-${item.draws}-${item.losses}`;
}

export function userColorLabel(item: Pick<OpeningStruggleItem, 'userColor'>): string {
  return item.userColor === 'WHITE' ? 'White' : 'Black';
}

export function percentLabel(value: number | null): string {
  return value === null ? '-' : `${value.toFixed(1)}%`;
}

export function evalLabel(value: number | null): string {
  if (value === null) return '-';
  const pawns = (value / 100).toFixed(2);
  return value > 0 ? `+${pawns}` : pawns;
}

function movesSan(movesUci: readonly string[]): string[] {
  const chess = new Chess();
  return movesUci.map((uci) => {
    try {
      const move = chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.slice(4, 5) || undefined,
      });
      return move?.san || uci;
    } catch {
      return uci;
    }
  });
}

function formatNumberedSan(moves: readonly string[]): string {
  const parts: string[] = [];
  for (let index = 0; index < moves.length; index += 2) {
    const moveNumber = index / 2 + 1;
    const blackMove = moves[index + 1] ? ` ${moves[index + 1]}` : '';
    parts.push(`${moveNumber}. ${moves[index]}${blackMove}`);
  }
  return parts.join(' ');
}

function terminalFen(item: OpeningStruggleItem): string {
  if (item.afterPositionNormalizedFen) return item.afterPositionNormalizedFen;
  return fenAfterMoves(item.movesUci);
}

export function courseCoverageLabel(item: OpeningStruggleItem): string {
  const coverage = item.courseCoverage;
  const courses = coverage.courses.map((course) => course.name).join(', ');
  const courseSuffix = courses ? ` Course${coverage.courses.length === 1 ? '' : 's'}: ${courses}.` : '';
  const deviationMove = coverage.deviationPly === null
    ? null
    : moveLabelAtPly(item, coverage.deviationPly);
  const expected = coverage.expectedMoveSans.length
    ? ` Expected: ${coverage.expectedMoveSans.join(' or ')}.`
    : '';
  if (coverage.status === 'COVERED') {
    return `Covered by courses through the full line.${courseSuffix}`;
  }
  if (coverage.status === 'MY_DEVIATION') {
    return `Your move${deviationMove ? ` ${deviationMove}` : ''} leaves the course.${expected}${courseSuffix}`;
  }
  if (coverage.status === 'OPPONENT_UNCOVERED') {
    return `The opponent move${deviationMove ? ` ${deviationMove}` : ''} is not covered.${expected}${courseSuffix}`;
  }
  if (coverage.status === 'REPERTOIRE_ENDED') {
    return `The stored repertoire ends before${deviationMove ? ` ${deviationMove}` : ' this line ends'}.${courseSuffix}`;
  }
  return 'Not covered by courses.';
}

export function courseCoverageStatusLabel(item: OpeningStruggleItem): string {
  const labels = {
    COVERED: 'Covered',
    MY_DEVIATION: 'Your deviation',
    OPPONENT_UNCOVERED: 'Opponent move uncovered',
    REPERTOIRE_ENDED: 'Repertoire ended',
    NOT_COVERED: 'Not covered',
  } as const;
  return labels[item.courseCoverage.status];
}

function moveLabelAtPly(item: OpeningStruggleItem, ply: number): string | null {
  const moves = item.movesSan?.length ? item.movesSan : movesSan(item.movesUci);
  const move = moves[ply - 1];
  if (!move) return null;
  const moveNumber = Math.ceil(ply / 2);
  return ply % 2 === 1 ? `${moveNumber}. ${move}` : `${moveNumber}... ${move}`;
}

function fenAfterMoves(movesUci: readonly string[]): string {
  const chess = new Chess();
  for (const uci of movesUci) {
    try {
      chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.slice(4, 5) || undefined,
      });
    } catch {
      break;
    }
  }
  return chess.fen();
}
