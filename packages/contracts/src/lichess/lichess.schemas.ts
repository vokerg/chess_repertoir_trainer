import { z } from 'zod';

export const lichessConnectionAccountSchema = z.object({
  username: z.string(),
  lichessUserId: z.string(),
  externalAccountId: z.number().int().positive().nullable(),
  scopes: z.array(z.string()),
  connectedAt: z.iso.datetime(),
  expiresAt: z.iso.datetime().nullable(),
});

export const lichessConnectionStatusSchema = z.discriminatedUnion('connected', [
  z.object({ connected: z.literal(false) }),
  z.object({
    connected: z.literal(true),
    account: lichessConnectionAccountSchema,
  }),
]);

export const lichessBotChallengeOptionSchema = z.object({
  username: z.string(),
  label: z.string(),
});

export const lichessBotChallengeOptionsResponseSchema = z.object({
  bots: z.array(lichessBotChallengeOptionSchema),
  defaultUsername: z.string(),
});

export const lichessBotChallengeResponseSchema = z.object({
  challengeId: z.string().nullable(),
  url: z.string().nullable(),
  username: z.string(),
  rawStatus: z.string().optional(),
});

export const lichessDisconnectResponseSchema = z.object({
  disconnected: z.literal(true),
});

export type LichessConnectionAccount = z.infer<typeof lichessConnectionAccountSchema>;
export type LichessConnectionStatus = z.infer<typeof lichessConnectionStatusSchema>;
export type LichessBotChallengeOption = z.infer<typeof lichessBotChallengeOptionSchema>;
export type LichessBotChallengeOptionsResponse = z.infer<typeof lichessBotChallengeOptionsResponseSchema>;
export type LichessBotChallengeResponse = z.infer<typeof lichessBotChallengeResponseSchema>;
export type LichessDisconnectResponse = z.infer<typeof lichessDisconnectResponseSchema>;
