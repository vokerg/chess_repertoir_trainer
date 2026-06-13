import {
  listLines,
  createLine,
  getLineById,
  updateLine,
  deleteLine,
  getLineMoveNodes,
  copyLineToChapter,
} from '../repositories/lineRepository';
import { buildMoveTreeFromNodes } from '../utils/move-tree-builder';

export const LineService = {
  list: async (chapterId: number) => listLines(chapterId),
  create: async (chapterId: number, data: { name: string; sideToTrain: string; startingFen: string; tags?: string | null; notes?: string | null }) =>
    createLine(chapterId, data),
  get: async (id: number) => getLineById(id),
  update: async (id: number, data: Partial<{ chapterId: number; name: string; sideToTrain: string; startingFen: string; tags: string | null; notes: string | null }>) =>
    updateLine(id, data),
  copy: async (sourceLineId: number, targetChapterId: number, name?: string) =>
    copyLineToChapter(sourceLineId, targetChapterId, name),
  delete: async (id: number) => deleteLine(id),
  getMoveTree: async (lineId: number) => {
    const line = await getLineById(lineId);
    if (!line) return null;
    const nodes = await getLineMoveNodes(lineId);
    return buildMoveTreeFromNodes(nodes, line);
  },
};
