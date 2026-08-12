import prisma from '../prisma';
import {
  isStandardImportedGameVariant,
} from '../modules/imported-games/imported-game-workflow-eligibility';
import {
  getLichessResultForUser,
  normalizeLichessGame,
  readLichessNdjson,
} from '../modules/account-imports/providers/lichess/lichess-account-import';
import {
  PlayedGameActivityReconciliationService,
  resolveCommittedImportReconciliationRange,
} from '../modules/activity-feed/played-game-activity.service';
import { AccountRatingStatsService } from './accountRatingStatsService';

export { getLichessResultForUser };

const LICHESS_GAMES_URL = 'https://lichess.org/api/games/user';
const OVERLAP_MS = 24 * 60 * 60 * 1000;
const LEGACY_IMPORT_WRITE_BATCH_SIZE = 100;

type LegacyLichessImportGame = ReturnType<typeof normalizeLichessGame> & {
  userId: number;
  accountId: number;
  provider: string;
};

function buildSince(cursor?: Date | null) {
  if (!cursor) return null;
  return new Date(Math.max(0, cursor.getTime() - OVERLAP_MS));
}

export const LichessImportService = {
  syncAccount: async (userId: number, accountId: number) => {
    const account = await prisma.externalAccount.findFirst({
      where: { id: accountId, userId, provider: 'LICHESS', isActive: true },
    });

    if (!account) throw new Error('Active Lichess account not found');

    const syncSince = buildSince(account.syncCursorTime);
    const importRun = await prisma.importRun.create({
      data: {
        userId: account.userId,
        accountId: account.id,
        provider: account.provider,
        status: 'RUNNING',
        syncSince,
      },
    });

    let gamesSeen = 0;
    let gamesImported = 0;
    let gamesSkipped = 0;
    let gamesFailed = 0;
    let minActivityEndedAt: Date | null = null;
    let maxEndedAt = account.syncCursorTime ?? null;
    let pendingGames: LegacyLichessImportGame[] = [];

    const flushPendingGames = async () => {
      if (pendingGames.length === 0) return;
      const batch = pendingGames;
      pendingGames = [];
      try {
        const created = await prisma.importedGame.createMany({
          data: batch,
          skipDuplicates: true,
        });
        gamesImported += created.count;
        gamesSkipped += batch.length - created.count;
        for (const game of batch) {
          if (!game.endedAt) continue;
          if (!minActivityEndedAt || game.endedAt < minActivityEndedAt) {
            minActivityEndedAt = game.endedAt;
          }
          if (!maxEndedAt || game.endedAt > maxEndedAt) {
            maxEndedAt = game.endedAt;
          }
        }
      } catch (error) {
        gamesFailed += batch.length;
        throw error;
      }
    };

    try {
      const url = new URL(`${LICHESS_GAMES_URL}/${encodeURIComponent(account.username)}`);
      url.searchParams.set('finished', 'true');
      url.searchParams.set('sort', 'dateAsc');
      url.searchParams.set('pgnInJson', 'true');
      url.searchParams.set('opening', 'true');
      if (syncSince) url.searchParams.set('since', String(syncSince.getTime()));

      const response = await fetch(url, {
        headers: {
          Accept: 'application/x-ndjson',
        },
      });

      if (!response.ok) {
        throw new Error(`Lichess returned ${response.status} ${response.statusText}`);
      }

      for await (const game of readLichessNdjson(response)) {
        gamesSeen += 1;
        let data: LegacyLichessImportGame;
        try {
          const normalized = normalizeLichessGame(game, account.username);
          data = {
            userId: account.userId,
            accountId: account.id,
            provider: account.provider,
            ...normalized,
          };
        } catch {
          gamesFailed += 1;
          continue;
        }

        if (!isStandardImportedGameVariant(data.variant)) {
          gamesSkipped += 1;
          if (data.endedAt && (!maxEndedAt || data.endedAt > maxEndedAt)) {
            maxEndedAt = data.endedAt;
          }
          continue;
        }

        pendingGames.push(data);
        if (pendingGames.length >= LEGACY_IMPORT_WRITE_BATCH_SIZE) {
          await flushPendingGames();
        }
      }
      await flushPendingGames();

      const reconciliationRange = resolveCommittedImportReconciliationRange({
        syncSince,
        firstPersistedEndedAt: minActivityEndedAt,
        lastPersistedEndedAt: maxEndedAt,
      });
      if (reconciliationRange) {
        await PlayedGameActivityReconciliationService.reconcileCommittedRange({
          userId: account.userId,
          accountId: account.id,
          ...reconciliationRange,
        });
      }

      const completedAt = new Date();
      await prisma.$transaction([
        prisma.importRun.update({
          where: { id: importRun.id },
          data: {
            status: 'COMPLETED',
            gamesSeen,
            gamesImported,
            gamesUpdated: 0,
            gamesSkipped,
            gamesFailed,
            completedAt,
            syncUntil: maxEndedAt,
          },
        }),
        prisma.externalAccount.update({
          where: { id: account.id },
          data: {
            lastSyncAt: completedAt,
            syncCursorTime: maxEndedAt,
            lastSyncRunId: importRun.id,
          },
        }),
      ]);

      if (gamesImported > 0) {
        await AccountRatingStatsService.recomputeForAccount(account.userId, account.id);
      }

      return {
        importRunId: importRun.id,
        status: 'COMPLETED',
        gamesSeen,
        gamesImported,
        gamesUpdated: 0,
        gamesSkipped,
        gamesFailed,
        syncSince,
        syncUntil: maxEndedAt,
      };
    } catch (err: any) {
      await prisma.importRun.update({
        where: { id: importRun.id },
        data: {
          status: 'FAILED',
          gamesSeen,
          gamesImported,
          gamesUpdated: 0,
          gamesSkipped,
          gamesFailed,
          error: err.message ?? String(err),
          completedAt: new Date(),
          syncUntil: maxEndedAt,
        },
      });
      throw err;
    }
  },
};
