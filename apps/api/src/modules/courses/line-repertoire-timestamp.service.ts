import { Prisma, PrismaClient } from '@prisma/client';

export function lineUpdateChangesRepertoire(
  current: { startingFen: string; sideToTrain: string },
  update: { startingFen?: string; sideToTrain?: string },
): boolean {
  return (
    (update.startingFen !== undefined && update.startingFen !== current.startingFen) ||
    (update.sideToTrain !== undefined && update.sideToTrain !== current.sideToTrain)
  );
}

export async function touchLineRepertoireUpdatedAt(
  prismaOrTx: PrismaClient | Prisma.TransactionClient,
  lineId: number,
  at: Date = new Date(),
): Promise<void> {
  await prismaOrTx.line.update({
    where: { id: lineId },
    data: { repertoireUpdatedAt: at },
  });
}
