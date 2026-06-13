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

export async function updateLine(id: number, data: Partial<{ chapterId: number; name: string; sideToTrain: string; startingFen: string; tags: string | null; notes: string | null }>) {
  return prisma.line.update({ where: { id }, data });
}

export async function copyLineToChapter(
  sourceLineId: number,
  targetChapterId: number,
  name?: string,
) {
  return prisma.$transaction(async (transaction) => {
    const [source, targetChapter] = await Promise.all([
      transaction.line.findUnique({
        where: { id: sourceLineId },
        include: {
          moves: {
            orderBy: [{ plyNumber: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
          },
        },
      }),
      transaction.chapter.findUnique({
        where: { id: targetChapterId },
        select: { id: true },
      }),
    ]);
    if (!source || !targetChapter) return null;

    const copiedLine = await transaction.line.create({
      data: {
        chapterId: targetChapterId,
        name: name ?? `${source.name} (copy)`,
        sideToTrain: source.sideToTrain,
        startingFen: source.startingFen,
        tags: source.tags,
        notes: source.notes,
        passedCount: 0,
        failedCount: 0,
        totalAttempts: 0,
        lastTrainedAt: null,
      },
    });

    const newNodeIds = new Map<number, number>();
    const pendingNodes = [...source.moves];
    while (pendingNodes.length > 0) {
      let copiedInPass = 0;
      for (let index = 0; index < pendingNodes.length;) {
        const sourceNode = pendingNodes[index];
        const parentId = sourceNode.parentId === null
          ? null
          : newNodeIds.get(sourceNode.parentId);
        if (sourceNode.parentId !== null && parentId === undefined) {
          index += 1;
          continue;
        }

        const copiedNode = await transaction.moveNode.create({
          data: {
            lineId: copiedLine.id,
            parentId,
            plyNumber: sourceNode.plyNumber,
            fenBefore: sourceNode.fenBefore,
            fenAfter: sourceNode.fenAfter,
            moveUci: sourceNode.moveUci,
            moveSan: sourceNode.moveSan,
            moveNumber: sourceNode.moveNumber,
            colorToMoveBefore: sourceNode.colorToMoveBefore,
            side: sourceNode.side,
            isUserMove: sourceNode.isUserMove,
            isCorrectUserMove: sourceNode.isCorrectUserMove,
            comment: sourceNode.comment,
            annotation: sourceNode.annotation,
            branchLabel: sourceNode.branchLabel,
            branchWeight: sourceNode.branchWeight,
            sortOrder: sourceNode.sortOrder,
            timesSeen: 0,
            correctCount: 0,
            incorrectCount: 0,
            currentStreak: 0,
            lastSeenAt: null,
          },
        });
        newNodeIds.set(sourceNode.id, copiedNode.id);
        pendingNodes.splice(index, 1);
        copiedInPass += 1;
      }
      if (copiedInPass === 0) {
        throw new Error(`Could not resolve move tree parents for line ${sourceLineId}.`);
      }
    }

    return copiedLine;
  });
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
