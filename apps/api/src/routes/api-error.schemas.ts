import { z } from 'zod';

export const validationErrorResponseSchema = z.object({
  error: z.literal('Validation failed'),
});
