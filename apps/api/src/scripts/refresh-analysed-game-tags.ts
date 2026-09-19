import 'dotenv/config';
import prisma from '../prisma';
import { GameTaggingService } from '../modules/imported-games/game-tagging.service';

const BATCH_SIZE = 100;

const apply = process.argv.includes('--apply');
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.slice('--limit='.length)) : null;

function sameCodes(left: readonly number[] | null | undefined, right: readonly number[]) {
  const normalizedLeft = [...(left ?? [])].sort((a, b) => a - b);
  if (normalizedLeft.length !== right.length) return false;
  return normalizedLeft.every((code, index) => code === right[index]);
}

async function countAnalysedGames() {
  return prisma.importedGame.count({
    where: {
      analysisRuns: {
        some: { status: 'COMPLETED' },
      },
    },
  });
}

async function main() {
  const totalAnalysedGames = await countAnalysedGames();
  const totalToProcess = limit === null ? totalAnalysedGames : Math.min(totalAnalysedGames, limit);

  console.log(`Analysed games found: ${totalAnalysedGames}`);
  if (limit !== null) console.log(`Limit: ${limit}`);

  if (!apply) {
    console.log('Dry run only. Re-run with --apply to refresh tags.');
    return;
  }

  let lastId = 0;
  let processed = 0;
  let changed = 0;
  let unchanged = 0;
  const failures: Array<{ id: number; error: string }> = [];

  while (processed < totalToProcess) {
    const remaining = totalToProcess - processed;
    const games = await prisma.importedGame.findMany({
      where: {
        id: { gt: lastId },
        analysisRuns: {
          some: { status: 'COMPLETED' },
        },
      },
      orderBy: { id: 'asc' },
      take: Math.min(BATCH_SIZE, remaining),
      select: {
        id: true,
        userId: true,
        tagCodes: true,
      },
    });

    if (!games.length) break;

    for (const game of games) {
      lastId = game.id;

      try {
        const result = await GameTaggingService.refreshOne(game.userId, game.id);
        if (sameCodes(game.tagCodes, result.tagCodes)) unchanged += 1;
        else changed += 1;
      } catch (error) {
        failures.push({
          id: game.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      processed += 1;
      if (processed % 25 === 0 || processed === totalToProcess) {
        console.log(`Processed ${processed}/${totalToProcess} games; changed ${changed}, unchanged ${unchanged}, failed ${failures.length}`);
      }
    }
  }

  console.log(`Tag refresh complete. Processed ${processed}; changed ${changed}; unchanged ${unchanged}; failed ${failures.length}.`);
  if (failures.length) {
    for (const failure of failures.slice(0, 20)) {
      console.error(`Game ${failure.id} failed: ${failure.error}`);
    }
    if (failures.length > 20) console.error(`...and ${failures.length - 20} more failures.`);
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
