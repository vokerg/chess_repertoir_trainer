import type { PrismaClient } from '@prisma/client';
import prisma from '../../../../prisma';

export interface ChessComImportAccount {
  id: number;
  userId: number;
  provider: string;
  username: string;
}

export interface ChessComAccountRepository {
  getActiveOwnedAccount(userId: number, accountId: number): Promise<ChessComImportAccount | null>;
}

export function createChessComAccountRepository(
  database: PrismaClient = prisma,
): ChessComAccountRepository {
  return {
    getActiveOwnedAccount(userId, accountId) {
      return database.externalAccount.findFirst({
        where: {
          id: accountId,
          userId,
          provider: 'CHESS_COM',
          isActive: true,
        },
        select: {
          id: true,
          userId: true,
          provider: true,
          username: true,
        },
      });
    },
  };
}

export const ChessComAccountRepository = createChessComAccountRepository();
