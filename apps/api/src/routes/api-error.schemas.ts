import { z } from 'zod';

export const apiErrorResponseSchema = z.object({ error: z.unknown() });

export const validationErrorResponseSchema = z.object({
  error: z.literal('Validation failed'),
});
