import { Chess } from 'chess.js';
import type {
  CourseExtensionCandidate,
  CourseExtensionCandidatesQuery,
  CourseExtensionCandidatesResponse,
  CourseExtensionLineRef,
} from '@chess-trainer/contracts/lab';
import {
  buildRepertoireGraph,
  formatPathToNode,
  normalizeFenForPosition,
  sideToMoveFromFen,
} from 'chess-domain';
import type { RepertoireLineInput } from 'chess-domain';
import {
  getCoverageCourse,
  getCourseReviewLines,
} from '../../repertoire-coverage/repertoire-coverage.repository.prisma';
import {
  findCourseExtensionCandidatePlies,
  findCourseExtensionPositions,
} from './course-extension-candidates.repository.prisma';
import type { CourseExtensionCandidatePlyRow } from './course-extension-candidates.repository.prisma';

type CourseColor = 'WHITE' | 'BLACK';
type CourseReviewLine = Awaited<ReturnType<typeof getCourseReviewLines>>[number];

export interface CourseTerminalPosition {
  normalizedFen: string;
  sideToMove: CourseColor;
  userColor: CourseColor;
  lineRefs: CourseExtensionLineRef[];
}

function asColor(value: string | null): CourseColor | null {
  return value === 'WHITE' || value === 'BLACK' ? value : null;
}

function oppositeColor(color: CourseColor): CourseColor {
  return color === 'WHITE' ? 'BLACK' : 'WHITE';
}

function domainLine(line: CourseReviewLine, sideToTrain: CourseColor): RepertoireLineInput {
  return {
    ...line,
    sideToTrain,
  };
}

export function collectCourseTerminalPositions(lines: CourseReviewLine[]): CourseTerminalPosition[] {
  const result = new Map<string, CourseTerminalPosition>();

  for (const userColor of ['WHITE', 'BLACK'] as const) {
    const sideLines = lines.filter((line) => (asColor(line.sideToTrain) ?? 'WHITE') === userColor);
    if (sideLines.length === 0) continue;
    const graph = buildRepertoireGraph(sideLines.map((line) => domainLine(line, userColor)));

    for (const line of sideLines) {
      const parentIds = new Set(
        line.moves
          .map((move) => move.parentId)
          .filter((parentId): parentId is number => parentId !== null),
      );
      for (const leaf of line.moves.filter((move) => !parentIds.has(move.id))) {
        if (!leaf.isUserMove || !leaf.isCorrectUserMove) continue;
        const normalizedFen = normalizeFenForPosition(leaf.fenAfter);
        const existingPosition = graph.positions.get(normalizedFen);
        if (existingPosition && (existingPosition.userMoves.size > 0 || existingPosition.opponentMoves.size > 0)) {
          continue;
        }

        const sideToMove = sideToMoveFromFen(leaf.fenAfter);
        if (sideToMove !== oppositeColor(userColor)) continue;
        const key = `${userColor}:${normalizedFen}`;
        let terminal = result.get(key);
        if (!terminal) {
          terminal = { normalizedFen, sideToMove, userColor, lineRefs: [] };
          result.set(key, terminal);
        }
        if (!terminal.lineRefs.some((ref) => ref.lineId === line.id && ref.nodeId === leaf.id)) {
          terminal.lineRefs.push({
            lineId: line.id,
            lineName: line.name,
            chapterId: line.chapterId,
            nodeId: leaf.id,
            moveSequenceSan: formatPathToNode(line.moves, leaf.id),
          });
        }
      }
    }
  }

  return [...result.values()].sort((left, right) => {
    const leftSequence = left.lineRefs[0]?.moveSequenceSan ?? '';
    const rightSequence = right.lineRefs[0]?.moveSequenceSan ?? '';
    return leftSequence.localeCompare(rightSequence);
  });
}

type MutableCandidate = CourseExtensionCandidate & {
  gameIds: Set<number>;
};

function moveDetails(normalizedFen: string, moveUci: string): { moveSan: string | null; fenAfter: string | null } {
  try {
    const parts = normalizedFen.trim().split(/\s+/);
    const chess = new Chess(parts.length === 4 ? `${normalizedFen} 0 1` : normalizedFen);
    const move = chess.move({
      from: moveUci.slice(0, 2),
      to: moveUci.slice(2, 4),
      promotion: moveUci[4],
    });
    return move ? { moveSan: move.san, fenAfter: chess.fen() } : { moveSan: null, fenAfter: null };
  } catch {
    return { moveSan: null, fenAfter: null };
  }
}

function resultForUser(value: string | null): 'WIN' | 'DRAW' | 'LOSS' | null {
  return value === 'WIN' || value === 'DRAW' || value === 'LOSS' ? value : null;
}

export function groupCourseExtensionCandidates(
  terminals: CourseTerminalPosition[],
  rows: CourseExtensionCandidatePlyRow[],
  minGames: number,
): {
  items: CourseExtensionCandidate[];
  gamesMatched: number;
  continuationsFound: number;
} {
  const terminalsByKey = new Map(
    terminals.map((terminal) => [`${terminal.userColor}:${terminal.normalizedFen}`, terminal]),
  );
  const groups = new Map<string, MutableCandidate>();
  const matchedGameIds = new Set<number>();

  for (const row of rows) {
    const userColor = asColor(row.importedGame.userColor);
    if (!userColor) continue;
    const terminal = terminalsByKey.get(`${userColor}:${row.position.normalizedFen}`);
    if (!terminal) continue;

    const key = `${userColor}:${terminal.normalizedFen}:${row.moveUci}`;
    let group = groups.get(key);
    if (!group) {
      const details = moveDetails(terminal.normalizedFen, row.moveUci);
      group = {
        key,
        normalizedFen: terminal.normalizedFen,
        sideToMove: terminal.sideToMove,
        userColor,
        moveUci: row.moveUci,
        moveSan: details.moveSan,
        fenAfter: details.fenAfter,
        count: 0,
        results: { win: 0, draw: 0, loss: 0, unknown: 0 },
        lineRefs: terminal.lineRefs,
        examples: [],
        gameIds: new Set<number>(),
      };
      groups.set(key, group);
    }
    if (group.gameIds.has(row.importedGameId)) continue;

    group.gameIds.add(row.importedGameId);
    matchedGameIds.add(row.importedGameId);
    group.count += 1;
    const outcome = resultForUser(row.importedGame.resultForUser);
    if (outcome === 'WIN') group.results.win += 1;
    else if (outcome === 'DRAW') group.results.draw += 1;
    else if (outcome === 'LOSS') group.results.loss += 1;
    else group.results.unknown += 1;
    group.examples.push({
      gameId: row.importedGame.id,
      provider: row.importedGame.provider,
      providerGameId: row.importedGame.providerGameId,
      providerUrl: row.importedGame.providerUrl,
      endedAt: row.importedGame.endedAt?.toISOString() ?? null,
      opponentUsername: row.importedGame.opponentUsername,
      resultForUser: outcome,
      plyNumber: row.plyNumber,
    });
  }

  const continuationsFound = groups.size;
  const items = [...groups.values()]
    .filter((group) => group.count >= minGames)
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;
      return (left.lineRefs[0]?.moveSequenceSan ?? '').localeCompare(
        right.lineRefs[0]?.moveSequenceSan ?? '',
      );
    })
    .map(({ gameIds: _gameIds, ...group }) => ({
      ...group,
      examples: [...group.examples]
        .sort((left, right) => (right.endedAt ?? '').localeCompare(left.endedAt ?? ''))
        .slice(0, 10),
    }));

  return { items, gamesMatched: matchedGameIds.size, continuationsFound };
}

export async function getCourseExtensionCandidates(
  userId: number,
  query: CourseExtensionCandidatesQuery,
): Promise<CourseExtensionCandidatesResponse | null> {
  const course = await getCoverageCourse(userId, query.courseId);
  if (!course) return null;
  const lines = await getCourseReviewLines(userId, query.courseId);
  const terminals = collectCourseTerminalPositions(lines);
  const positions = await findCourseExtensionPositions(
    [...new Set(terminals.map((terminal) => terminal.normalizedFen))],
  );
  const rows = await findCourseExtensionCandidatePlies(
    userId,
    positions.map((position) => position.id),
  );
  const grouped = groupCourseExtensionCandidates(terminals, rows, query.minGames);

  return {
    course: {
      ...course,
      description: course.description ?? null,
      lineCount: lines.length,
    },
    filters: query,
    summary: {
      terminalPositions: terminals.length,
      gamesMatched: grouped.gamesMatched,
      continuationsFound: grouped.continuationsFound,
      qualifyingContinuations: grouped.items.length,
    },
    items: grouped.items,
  };
}
