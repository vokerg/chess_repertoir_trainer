import prisma from '../../prisma';

const importedGameForOpeningAssignmentSelect = {
  id: true,
  pgn: true,
  openingEco: true,
  openingName: true,
} as const;

export type ImportedGameForOpeningAssignment = {
  id: number;
  pgn: string | null;
  openingEco: string | null;
  openingName: string | null;
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

  return prisma.$transaction(async (tx) => {
    if (Object.keys(data).length > 0) {
      await tx.importedGame.updateMany({
        where: {
          id: importedGameId,
          ...(data.openingEco ? { openingEco: null } : {}),
          ...(data.openingName ? { openingName: null } : {}),
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
