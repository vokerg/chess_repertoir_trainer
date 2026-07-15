import { z } from 'zod';
import {
  openingStrugglesQuerySchema as openingStrugglesWireQuerySchema,
} from '@chess-trainer/contracts/opening-struggles';

export const openingStrugglesQuerySchema = openingStrugglesWireQuerySchema.transform((query) => ({
  ...query,
  from: query.from ? new Date(query.from) : undefined,
  to: query.to ? new Date(query.to) : undefined,
}));

export type OpeningStrugglesQuery = z.infer<typeof openingStrugglesQuerySchema>;
