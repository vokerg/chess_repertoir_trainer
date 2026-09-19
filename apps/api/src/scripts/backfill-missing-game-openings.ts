import prisma from '../prisma';
import { GameOpeningAssignmentService } from '../modules/imported-games/game-opening-assignment.service';
import { isStandardImportedGameSpeed } from '../modules/imported-games/imported-game-workflow-eligibility';

async function main() {
  const games = await prisma.importedGame.findMany({
    where: {
      plyIndexedAt: { not: null },
      OR: [
        { openingEco: null },
        { openingName: null },
      ],
    },
    select: {
      id: true,
      userId: true,
      speedCategory: true,
    },
    orderBy: { id: 'asc' },
  });

  const candidates = games.filter((game) => isStandardImportedGameSpeed(game.speedCategory));
  let assigned = 0;
  let skipped = 0;
  let failed = 0;

  console.log(`Candidates found: ${candidates.length}`);

  for (const game of candidates) {
    try {
      const result = await GameOpeningAssignmentService.assignMissingOpening(game.userId, game.id);
      if (result.status === 'ASSIGNED') {
        assigned += 1;
      } else if (result.status === 'FAILED') {
        failed += 1;
        console.warn(`Failed #${game.id}: ${result.reason ?? 'UNKNOWN'}`);
      } else {
        skipped += 1;
        console.log(`Skipped #${game.id}: ${result.reason ?? 'UNKNOWN'}`);
      }
    } catch (error) {
      failed += 1;
      console.warn(`Failed #${game.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log(`Assigned: ${assigned}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
