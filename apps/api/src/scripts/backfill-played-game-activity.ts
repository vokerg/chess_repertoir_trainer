import prisma from '../prisma';
import { PlayedGameActivityReconciliationService } from '../modules/activity-feed/played-game-activity.service';

interface Options {
  afterUserId: number;
  limit: number;
  userId: number | null;
}

function readInteger(value: string | undefined, name: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) throw new Error(`${name} must be an integer`);
  return parsed;
}

function parseOptions(argv: readonly string[]): Options {
  let afterUserId = 0;
  let limit = 25;
  let userId: number | null = null;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];
    if (argument === '--after-user-id') {
      afterUserId = readInteger(value, '--after-user-id');
      index += 1;
    } else if (argument === '--limit') {
      limit = readInteger(value, '--limit');
      index += 1;
    } else if (argument === '--user-id') {
      userId = readInteger(value, '--user-id');
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  if (afterUserId < 0) throw new Error('--after-user-id must be non-negative');
  if (limit < 1 || limit > 100) throw new Error('--limit must be between 1 and 100');
  if (userId !== null && userId < 1) throw new Error('--user-id must be positive');
  return { afterUserId, limit, userId };
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const userIds = options.userId === null
    ? await PlayedGameActivityReconciliationService.listBackfillUserIds(
      options.afterUserId,
      options.limit,
    )
    : [options.userId];

  for (const userId of userIds) {
    const result = await PlayedGameActivityReconciliationService.reconcileAllForUser(userId);
    console.log(JSON.stringify(result));
  }

  const nextAfterUserId = userIds.length > 0 ? userIds[userIds.length - 1] : options.afterUserId;
  console.log(JSON.stringify({
    processedUsers: userIds.length,
    nextAfterUserId,
    hasMore: options.userId === null && userIds.length === options.limit,
  }));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
