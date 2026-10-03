import { z } from 'zod';

export const gameLibrarySchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(100),
  gameCount: z.number().int().nonnegative(),
});
export const gameLibrariesResponseSchema = z.object({ items: z.array(gameLibrarySchema) });
export const gameLibraryNameSchema = z.object({ name: z.string().trim().min(1).max(100) });
export const gameLibraryParamsSchema = z.object({ libraryId: z.coerce.number().int().positive() });
export const gameLibraryEntryParamsSchema = gameLibraryParamsSchema.extend({ gameId: z.coerce.number().int().positive() });
export const gameLikeBodySchema = z.object({ liked: z.boolean() });
export const gameLibraryMutationResponseSchema = z.object({ success: z.literal(true) });
export type GameLibrary = z.infer<typeof gameLibrarySchema>;
export type GameLibrariesResponse = z.infer<typeof gameLibrariesResponseSchema>;
export type GameLibraryName = z.infer<typeof gameLibraryNameSchema>;
export type GameLibraryParams = z.infer<typeof gameLibraryParamsSchema>;
export type GameLibraryEntryParams = z.infer<typeof gameLibraryEntryParamsSchema>;
export type GameLikeBody = z.infer<typeof gameLikeBodySchema>;
export type GameLibraryMutationResponse = z.infer<typeof gameLibraryMutationResponseSchema>;
