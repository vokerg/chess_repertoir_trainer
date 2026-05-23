import prisma from '../prisma';

export async function getNodeById(id: number) {
  return prisma.moveNode.findUnique({ where: { id } });
}

export async function getChildrenOfParent(lineId: number, parentId: number | null) {
  return prisma.moveNode.findMany({ where: { lineId, parentId }, orderBy: { sortOrder: 'asc' } });
}

export async function createMoveNode(data: any) {
  return prisma.moveNode.create({ data });
}

export async function updateMoveNode(id: number, data: any) {
  return prisma.moveNode.update({ where: { id }, data });
}

export async function deleteNodeAndSubtree(id: number) {
  // Deleting a node will cascade to its children due to onDelete: Cascade
  return prisma.moveNode.delete({ where: { id } });
}

export async function existsCorrectUserMove(lineId: number, parentId: number | null) {
  const count = await prisma.moveNode.count({
    where: {
      lineId,
      parentId,
      isUserMove: true,
      isCorrectUserMove: true,
    },
  });
  return count > 0;
}