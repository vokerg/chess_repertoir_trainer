export class AiFeatureError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AiFeatureError';
  }
}

export function asAiFeatureError(error: unknown): AiFeatureError {
  if (error instanceof AiFeatureError) return error;
  return new AiFeatureError(500, 'AI_INTERNAL_ERROR', 'AI game review failed unexpectedly.');
}
