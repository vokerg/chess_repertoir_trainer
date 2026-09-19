import { z } from 'zod';
export { apiErrorResponseSchema } from './api-error.schemas';

export const messageResponseSchema = z.object({ message: z.string() });
export const unauthorizedResponseSchema = z.object({ message: z.literal('Unauthorized') });
export const noContentResponseSchema = z.void();
