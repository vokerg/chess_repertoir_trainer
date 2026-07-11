import { z } from 'zod';
export { apiErrorResponseSchema } from './api-error.schemas';

/**
 * Transitional response schema for legacy endpoints whose Prisma-backed payloads
 * have not yet moved into packages/contracts. Route modules must still document
 * the concrete operation, inputs, statuses, and why the payload remains opaque.
 */
export const legacyOpaqueResponseSchema = z.any().describe(
  'Legacy JSON payload retained for compatibility; migrate this response to packages/contracts before cross-workspace reuse.',
);

export const messageResponseSchema = z.object({ message: z.string() });
export const unauthorizedResponseSchema = z.object({ message: z.literal('Unauthorized') });
export const noContentResponseSchema = z.void();
