import prisma from '../../prisma';
import { SINGLETON_USER_ID } from '../../services/currentUserService';
import { ListImportedGamesQuery } from './games.schemas';

const COMPLETED_ANALYSIS_STATUS = 'COMPLETED';

function buildWhere(query: ListImportedGamesQuery) {
  const where: any = { userId: SINGLETON_USER_ID };

  if (query.accountId) where.accountId = query.accountId;
  if (query.provider) where.provider = query.provider;
  if (query.resultForUser) where.resultForUser = query.resultForUser;
  if (query.userColor) where.userColor = query.userColor;
  if (query.speedCategory) where.speedCategory = query.speedCategory;
  if (query.timeControl) where.timeControlRaw = query.timeControl;
  if (query.rated !== undefined) where.rated = query.rated;

  if (query.analyzed === 'ANALYZED') {
    where.analysisRuns = { some: { status: COMPLETED_ANALYSIS_STATUS } };
  }

  if (query.analyzed === 'NOT_ANALYZED') {
    where.analysisRuns = { none: { status: COMPLETED_ANALYSIS_STATUS } };
  }

  if (query.search) {
    where.OR = [
      { providerGameId: { contains: query.search, mode: 'insensitive' } },
      { whiteUsername: { contains: query.search, mode: 'insensitive' } },
      { blackUsername: { contains: query.search, mode: 'insensitive' } },
      { opponentUsername: { contains: query.search, mode: 'insensitive' } },
      { openingName: { contains: query.search, mode: 'insensitive' } },
      { openingEco: { contains: query.search, mode: 'insensitive' } },
      { result: { contains: query.search, mode: 'insensitive' } },
      { status: { contains: query.search, mode: 'insensitive' } },
      { timeControlRaw: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  return where;
}

export async function listImportedGames(query: ListImportedGamesQuery) {
  const take = query.take ?? 100;
  const skip = query.skip ?? 0;
  const where = buildWhere(query);

  const [total, games] = await Promise.all([
    prisma.importedGame.count({ where }),
    prisma.importedGame.findMany({
      where,
      orderBy: [{ endedAt: 'desc' }, { id: 'desc' }],
      take,
      skip,
      include: {
        account: {
          select: {
            id: true,
            provider: true,
            username: true,
            displayName: true,
          },
        },
        analysisRuns: {
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 1,
          select: {
            id: true,
            status: true,
            depth: true,
            multipv: true,
            engineName: true,
            engineVersion: true,
            positionsTotal: true,
            positionsDone: true,
            accuracyVersion: true,
            whiteAccuracy: true,
            blackAccuracy: true,
            whiteAverageCentipawnLoss: true,
            blackAverageCentipawnLoss: true,
            whiteMovesAnalyzed: true,
            blackMovesAnalyzed: true,
            error: true,
            startedAt: true,
            completedAt: true,
            createdAt: true,
          },
        },
      },
    }),
  ]);

  return { total, take, skip, games };
}
