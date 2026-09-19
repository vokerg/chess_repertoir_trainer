import prisma from '../../prisma';

const importedGameForOpeningAssignmentSelect = {
  id: true,
  pgn: true,
  openingEco: true,
  openingName: true,
  openingProvenance: true,
} as const;

export type ImportedGameForOpeningAssignment = {
  id: number;
  pgn: string | null;
  openingEco: string | null;
  openingName: string | null;
  openingProvenance: string;
};

export async function getImportedGameForOpeningAssignment(
  userId: number,
  importedGameId: number,
): Promise<ImportedGameForOpeningAssignment | null> {
  return prisma.importedGame.findFirst({
    where: { id: importedGameId, userId },
    select: importedGameForOpeningAssignmentSelect,
  });
}

export async function updateImportedGameOpeningIfMissing(
  importedGameId: number,
  opening: { openingEco?: string; openingName?: string },
) {
  const data = {
    ...(opening.openingEco ? { openingEco: opening.openingEco } : {}),
    ...(opening.openingName ? { openingName: opening.openingName } : {}),
  };
  const missingWhere = {
    ...(data.openingEco ? { openingEco: null } : {}),
    ...(data.openingName ? { openingName: null } : {}),
  };

  return prisma.$transaction(async (tx) => {
    if (Object.keys(data).length > 0) {
      // NONE proves there was no provider/historical opening before this local
      // assignment. Partial provider/legacy values retain their provenance even
      // when the local book fills the other field.
      await tx.importedGame.updateMany({
        where: {
          id: importedGameId,
          openingProvenance: 'NONE',
          ...missingWhere,
        },
        data: {
          ...data,
          openingProvenance: 'LOCAL_BOOK',
        },
      });
      await tx.importedGame.updateMany({
        where: {
          id: importedGameId,
          openingProvenance: { not: 'NONE' },
          ...missingWhere,
        },
        data,
      });
    }

    return tx.importedGame.findUniqueOrThrow({
      where: { id: importedGameId },
      select: importedGameForOpeningAssignmentSelect,
    });
  });
}
