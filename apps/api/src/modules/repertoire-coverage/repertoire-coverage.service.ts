import { Chess } from 'chess.js';
import { formatMoveSequence as domainFormatMoveSequence, normalizeFenForPosition } from 'chess-domain';
import { classifyCourseReviewGame, sideToMove } from './course-review.matcher';
import {
  getCoverageCourse,
  getCourseReviewCandidateGames,
  getCourseReviewLines,
  getCourseReviewPlies,
} from './repertoire-coverage.repository.prisma';
import {
  CourseGraphMove,
  CourseGraphPosition,
  CourseRepertoireGraph,
  CourseReviewConflict,
  CourseReviewGameResult,
  CourseReviewGroup,
  RepertoireColor,
} from './repertoire-coverage.types';

type ReviewLine = Awaited<ReturnType<typeof getCourseReviewLines>>[number];

function asColor(value: string | null): RepertoireColor | null {
  return value === 'WHITE' || value === 'BLACK' ? value : null;
}

function resultForUser(value: string | null): 'WIN' | 'DRAW' | 'LOSS' | null {
  return value === 'WIN' || value === 'DRAW' || value === 'LOSS' ? value : null;
}

function addLineRef(position: CourseGraphPosition, line: ReviewLine, nodeId?: number) {
  if (!position.lineRefs.some((ref) => ref.lineId === line.id && ref.nodeId === nodeId)) {
    position.lineRefs.push({ lineId: line.id, lineName: line.name, nodeId: nodeId ?? null });
  }
}

function formatMoveSequence(nodes: ReviewLine['moves'], nodeId: number): string {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const path: ReviewLine['moves'] = [];
  let current = nodesById.get(nodeId);
  const visited = new Set<number>();

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    path.push(current);
    current = current.parentId === null ? undefined : nodesById.get(current.parentId);
  }

  return domainFormatMoveSequence(
    path.reverse().map((node) => ({ san: node.moveSan, plyNumber: node.plyNumber })),
  );
}

export function buildCourseRepertoireGraph(lines: ReviewLine[]): CourseRepertoireGraph {
  const graph: CourseRepertoireGraph = { startPositions: new Set(), positions: new Map() };

  for (const line of lines) {
    const startKey = normalizeFenForPosition(line.startingFen || 'startpos');
    graph.startPositions.add(startKey);
    if (!graph.positions.has(startKey)) {
      graph.positions.set(startKey, {
        normalizedFen: startKey,
        sideToMove: sideToMove(startKey),
        lineRefs: [],
        userMoves: new Map(),
        opponentMoves: new Map(),
      });
    }
    addLineRef(graph.positions.get(startKey)!, line);

    for (const node of line.moves) {
      const key = normalizeFenForPosition(node.fenBefore);
      let position = graph.positions.get(key);
      if (!position) {
        position = {
          normalizedFen: key,
          sideToMove: asColor(node.colorToMoveBefore) ?? sideToMove(key),
          lineRefs: [],
          userMoves: new Map(),
          opponentMoves: new Map(),
        };
        graph.positions.set(key, position);
      }
      addLineRef(position, line, node.id);

      const moveMap =
        node.isUserMove && node.isCorrectUserMove ? position.userMoves : position.opponentMoves;
      let move = moveMap.get(node.moveUci);
      if (!move) {
        move = {
          moveUci: node.moveUci,
          moveSan: node.moveSan,
          fenAfter: node.fenAfter,
          normalizedFenAfter: normalizeFenForPosition(node.fenAfter),
          lineRefs: [],
        };
        moveMap.set(node.moveUci, move);
      }
      if (!move.lineRefs.some((ref) => ref.lineId === line.id && ref.nodeId === node.id)) {
        move.lineRefs.push({
          lineId: line.id,
          lineName: line.name,
          nodeId: node.id,
          moveSequenceSan: formatMoveSequence(line.moves, node.id),
        });
      }
    }
  }
  return graph;
}

export function getCourseReviewConflicts(graph: CourseRepertoireGraph): CourseReviewConflict[] {
  return [...graph.positions.values()]
    .filter((position) => position.userMoves.size > 1)
    .map((position) => ({
      normalizedFenBefore: position.normalizedFen,
      sideToMove: position.sideToMove,
      moves: [...position.userMoves.values()].map((move) => ({
        moveUci: move.moveUci,
        moveSan: move.moveSan,
        lineRefs: move.lineRefs,
      })),
    }));
}

function playedSan(result: CourseReviewGameResult): string | null {
  if (!result.normalizedFenBefore || !result.playedMoveUci) return null;
  try {
    const chess = new Chess(result.normalizedFenBefore);
    return (
      chess.move({
        from: result.playedMoveUci.slice(0, 2),
        to: result.playedMoveUci.slice(2, 4),
        promotion: result.playedMoveUci[4],
      })?.san ?? null
    );
  } catch {
    return null;
  }
}

function groupResults(results: CourseReviewGameResult[], status: CourseReviewGroup['status']) {
  const groups = new Map<string, CourseReviewGroup>();
  for (const result of results.filter((item) => item.status === status)) {
    if (!result.normalizedFenBefore || !result.sideToMove || !result.playedMoveUci) continue;
    const key = `${status}:${result.normalizedFenBefore}:${result.playedMoveUci}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        status,
        normalizedFenBefore: result.normalizedFenBefore,
        sideToMove: result.sideToMove,
        playedMoveUci: result.playedMoveUci,
        playedSan: playedSan(result),
        moveSequenceSan: result.moveSequenceSan,
        expectedMoveUci: result.expectedMoveUci,
        expectedMoveUcis: result.expectedMoveUcis,
        expectedMoveSans: result.expectedMoveSans,
        count: 0,
        results: { win: 0, draw: 0, loss: 0, unknown: 0 },
        examples: [],
      };
      groups.set(key, group);
    }
    group.count += 1;
    const outcome = result.resultForUser?.toLowerCase() as 'win' | 'draw' | 'loss' | undefined;
    if (outcome) group.results[outcome] += 1;
    else group.results.unknown += 1;
    if (group.examples.length < 10) {
      group.examples.push({
        gameId: result.gameId,
        provider: result.provider,
        providerGameId: result.providerGameId,
        providerUrl: result.providerUrl,
        endedAt: result.endedAt,
        opponentUsername: result.opponentUsername,
        resultForUser: result.resultForUser,
        plyNumber: result.plyNumber,
      });
    }
  }
  return [...groups.values()].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return (b.examples[0]?.endedAt ?? '').localeCompare(a.examples[0]?.endedAt ?? '');
  });
}

export const CourseReviewService = {
  calculate: async (
    courseId: number,
    input: { from: Date; to?: Date; limit: number; offset: number; minCoveredPlies: number },
  ) => {
    const course = await getCoverageCourse(courseId);
    if (!course) return null;
    const lines = await getCourseReviewLines(courseId);
    const sides = new Set(lines.map((line) => asColor(line.sideToTrain)).filter(Boolean));
    const sideToTrain = sides.size === 1 ? ([...sides][0] as RepertoireColor) : null;
    const hasMixedSides = sides.size > 1;
    const graph = buildCourseRepertoireGraph(lines);
    const conflicts = getCourseReviewConflicts(graph);
    const games = await getCourseReviewCandidateGames({
      from: input.from,
      to: input.to,
      limit: input.limit,
      offset: input.offset,
      sideToTrain,
    });
    const plies = await getCourseReviewPlies(
      games.filter((game) => game.plyIndexedAt).map((game) => game.id),
    );
    const pliesByGameId = new Map<number, typeof plies>();
    for (const ply of plies) {
      const grouped = pliesByGameId.get(ply.importedGameId) ?? [];
      grouped.push(ply);
      pliesByGameId.set(ply.importedGameId, grouped);
    }

    const results = games.map((game) =>
      classifyCourseReviewGame({
        game: {
          gameId: game.id,
          provider: game.provider,
          providerGameId: game.providerGameId,
          providerUrl: game.providerUrl,
          endedAt: game.endedAt,
          userColor: asColor(game.userColor),
          opponentUsername: game.opponentUsername,
          resultForUser: resultForUser(game.resultForUser),
        },
        indexed: game.plyIndexedAt !== null,
        plies: (pliesByGameId.get(game.id) ?? []).map((ply) => ({
          plyNumber: ply.plyNumber,
          moveUci: ply.moveUci,
          normalizedFenBefore: ply.position.normalizedFen,
        })),
        graph,
        sideToTrain,
        minCoveredPlies: input.minCoveredPlies,
      }),
    );
    const count = (status: CourseReviewGameResult['status']) =>
      results.filter((result) => result.status === status).length;
    const unindexedGames = count('UNINDEXED_GAME');
    const outOfScopeGames = count('OUT_OF_SCOPE');

    return {
      course: {
        ...course,
        sideToTrain,
        hasMixedSides,
        lineCount: lines.length,
        moveCount: lines.reduce((sum, line) => sum + line.moves.length, 0),
      },
      filters: {
        from: input.from.toISOString(),
        to: input.to?.toISOString() ?? null,
        limit: input.limit,
        offset: input.offset,
        minCoveredPlies: input.minCoveredPlies,
      },
      summary: {
        gamesChecked: results.length,
        indexedGames: results.length - unindexedGames,
        inScopeGames: results.length - unindexedGames - outOfScopeGames,
        outOfScopeGames,
        gameEndedInsideRepertoire: count('GAME_ENDED_INSIDE_REPERTOIRE'),
        repertoireEnded: count('REPERTOIRE_ENDED'),
        myDeviations: count('MY_DEVIATION'),
        opponentUncovered: count('OPPONENT_UNCOVERED'),
        unindexedGames,
        courseConflicts: count('COURSE_CONFLICT'),
      },
      conflicts,
      myDeviations: groupResults(results, 'MY_DEVIATION'),
      opponentUncovered: groupResults(results, 'OPPONENT_UNCOVERED'),
      pagination: { limit: input.limit, offset: input.offset, returnedGames: results.length },
    };
  },
};
