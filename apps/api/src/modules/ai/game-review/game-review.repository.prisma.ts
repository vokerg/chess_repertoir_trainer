import { Prisma } from '@prisma/client';
import type { AiGameReviewResponse } from '@chess-trainer/contracts/ai';
import prisma from '../../../prisma';

export async function findStoredGameReview(userId: number, importedGameId: number) {
  return prisma.importedGameAiReview.findFirst({
    where: {
      userId,
      importedGameId,
      importedGame: { userId },
    },
    select: {
      content: true,
    },
  });
}

export async function upsertStoredGameReview(input: {
  userId: number;
  importedGameId: number;
  analysisRunId: number;
  inputHash: string;
  schemaVersion: number;
  promptVersion: number;
  provider: string;
  model: string;
  content: AiGameReviewResponse;
  generatedAt: Date;
}) {
  const content = input.content as unknown as Prisma.InputJsonValue;
  return prisma.importedGameAiReview.upsert({
    where: { importedGameId: input.importedGameId },
    create: {
      userId: input.userId,
      importedGameId: input.importedGameId,
      analysisRunId: input.analysisRunId,
      inputHash: input.inputHash,
      schemaVersion: input.schemaVersion,
      promptVersion: input.promptVersion,
      provider: input.provider,
      model: input.model,
      content,
      generatedAt: input.generatedAt,
    },
    update: {
      userId: input.userId,
      analysisRunId: input.analysisRunId,
      inputHash: input.inputHash,
      schemaVersion: input.schemaVersion,
      promptVersion: input.promptVersion,
      provider: input.provider,
      model: input.model,
      content,
      generatedAt: input.generatedAt,
    },
  });
}
