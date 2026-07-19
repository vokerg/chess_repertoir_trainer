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
  return new AiFeatureError(502, 'AI_PROVIDER_ERROR', 'AI provider request failed.');
}
