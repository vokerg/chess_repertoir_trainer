import { extractAvailableSublines } from 'chess-domain';
import { buildMoveTreeFromNodes } from '../../utils/move-tree-builder';
import {
  getChapterById,
  getChapterLinesWithMoves,
  getCourseById,
  getCourseLinesWithMoves,
  getLineWithMoves,
} from './courses.repository.prisma';

export type SublineScope =
  | { type: 'LINE'; id: number }
  | { type: 'CHAPTER'; id: number }
  | { type: 'COURSE'; id: number };

export interface AvailableSublineDto {
  lineId: number;
  lineName: string;
  chapterId: number;
  chapterName: string;
  leafNodeId: number;
  moves: {
    nodeId: number;
    moveUci: string;
    moveSan: string;
    plyNumber: number;
    sortOrder: number;
  }[];
  moveText: string;
}

async function loadLines(userId: number, scope: SublineScope) {
  if (scope.type === 'LINE') {
    const line = await getLineWithMoves(userId, scope.id);
    return line ? [line] : null;
  }
  if (scope.type === 'CHAPTER') {
    if (!await getChapterById(userId, scope.id)) return null;
    return getChapterLinesWithMoves(userId, scope.id);
  }
  if (!await getCourseById(userId, scope.id)) return null;
  return getCourseLinesWithMoves(userId, scope.id);
}

export async function getAvailableSublineRows(userId: number, scope: SublineScope): Promise<AvailableSublineDto[] | null> {
  const lines = await loadLines(userId, scope);
  if (!lines) return null;

  return lines.flatMap((line) => {
    const tree = buildMoveTreeFromNodes(line.moves, line);
    return extractAvailableSublines(tree).map((subline) => ({
      lineId: line.id,
      lineName: line.name,
      chapterId: line.chapter.id,
      chapterName: line.chapter.name,
      leafNodeId: subline.leafNodeId,
      moves: subline.moves,
      moveText: subline.moves.map((move) => move.moveSan || move.moveUci).join(' '),
    }));
  });
}
