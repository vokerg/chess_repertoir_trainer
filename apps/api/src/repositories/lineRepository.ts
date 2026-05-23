import prisma from '../prisma';

export async function listLines(chapterId: number) {
  return prisma.line.findMany({ where: { chapterId }, orderBy: { id: 'asc' } });
}

export async function createLine(chapterId: number, data: { name: string; sideToTrain: string; startingFen: string; tags?: string | null; notes?: string | null }) {
  return prisma.line.create({ data: { chapterId, ...data } });
}

export async function getLineById(id: number) {
  return prisma.line.findUnique({ where: { id } });
}

export async function updateLine(id: number, data: Partial<{ name: string; sideToTrain: string; startingFen: string; tags: string | null; notes: string | null }>) {
  return prisma.line.update({ where: { id }, data });
}

export async function deleteLine(id: number) {
  return prisma.line.delete({ where: { id } });
}

/**
 * Fetch all move nodes for a line and return as a flat array sorted by parentId, plyNumber, and sortOrder.
 */
export async function getLineMoveNodes(lineId: number) {
  return prisma.moveNode.findMany({ where: { lineId }, orderBy: [{ parentId: 'asc', }, { sortOrder: 'asc' }] });
}