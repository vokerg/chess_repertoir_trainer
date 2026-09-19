import type { ZodType } from 'zod';
import type { AiConfig } from './ai.config';
import { AiFeatureError } from './ai.errors';

export type FetchLike = typeof fetch;

export interface LlmJsonRequest<T> {
  useCase: string;
  systemPrompt: string;
  input: unknown;
  outputSchema: ZodType<T>;
  maxOutputTokens: number;
}

export interface LlmJsonResult<T> {
  value: T;
  usage: {
    promptTokens: number | null;
    completionTokens: number | null;
  };
}

interface ClientLogger {
  info(fields: Record<string, unknown>, message: string): void;
  warn(fields: Record<string, unknown>, message: string): void;
}

class LlmAttemptError extends AiFeatureError {
  constructor(statusCode: number, code: string, message: string, readonly retryable: boolean) {
    super(statusCode, code, message);
  }
}

export class OpenAiCompatibleLlmClient {
  constructor(
    private readonly config: AiConfig,
    private readonly fetchImpl: FetchLike = fetch,
    private readonly logger?: ClientLogger,
  ) {}

  async generateJson<T>(request: LlmJsonRequest<T>): Promise<LlmJsonResult<T>> {
    let lastError: AiFeatureError | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt += 1) {
      const startedAt = Date.now();
      try {
        const result = await this.requestOnce(request);
        this.debug('info', {
          useCase: request.useCase,
          attempt,
          durationMs: Date.now() - startedAt,
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
        }, 'AI provider request completed');
        return result;
      } catch (error) {
        const mapped = this.mapUnexpectedError(error);
        lastError = mapped;
        this.debug('warn', {
          useCase: request.useCase,
          attempt,
          durationMs: Date.now() - startedAt,
          code: mapped.code,
          retrying: mapped instanceof LlmAttemptError && mapped.retryable && attempt < this.config.maxRetries,
        }, 'AI provider request failed');

        if (!(mapped instanceof LlmAttemptError) || !mapped.retryable || attempt >= this.config.maxRetries) {
          throw mapped;
        }
      }
    }

    throw lastError ?? new AiFeatureError(502, 'AI_PROVIDER_ERROR', 'AI provider request failed.');
  }

  private async requestOnce<T>(request: LlmJsonRequest<T>): Promise<LlmJsonResult<T>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const body: Record<string, unknown> = {
        model: this.config.model,
        messages: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: JSON.stringify(request.input) },
        ],
        response_format: { type: 'json_object' },
        thinking: { type: this.config.thinkingMode },
        max_tokens: request.maxOutputTokens,
      };
      if (this.config.thinkingMode === 'disabled') body['temperature'] = 0.2;
      if (this.config.thinkingMode === 'enabled' && this.config.reasoningEffort) {
        body['reasoning_effort'] = this.config.reasoningEffort;
      }

      const response = await this.fetchImpl(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new LlmAttemptError(429, 'AI_RATE_LIMITED', 'AI provider rate limit reached.', true);
        }
        if (response.status >= 500) {
          throw new LlmAttemptError(502, 'AI_PROVIDER_ERROR', 'AI provider is temporarily unavailable.', true);
        }
        throw new LlmAttemptError(502, 'AI_PROVIDER_ERROR', 'AI provider rejected the request.', false);
      }

      let payload: any;
      try {
        payload = await response.json();
      } catch {
        throw new LlmAttemptError(502, 'AI_INVALID_RESPONSE', 'AI provider returned invalid JSON.', true);
      }

      const content = payload?.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || !content.trim()) {
        throw new LlmAttemptError(502, 'AI_INVALID_RESPONSE', 'AI provider returned an empty response.', true);
      }

      let parsedContent: unknown;
      try {
        parsedContent = JSON.parse(content);
      } catch {
        throw new LlmAttemptError(502, 'AI_INVALID_RESPONSE', 'AI provider returned malformed JSON content.', true);
      }

      const parsed = request.outputSchema.safeParse(parsedContent);
      if (!parsed.success) {
        throw new LlmAttemptError(502, 'AI_INVALID_RESPONSE', 'AI provider response did not match the expected schema.', true);
      }

      return {
        value: parsed.data,
        usage: {
          promptTokens: numberOrNull(payload?.usage?.prompt_tokens),
          completionTokens: numberOrNull(payload?.usage?.completion_tokens),
        },
      };
    } catch (error) {
      if (error instanceof AiFeatureError) throw error;
      if (controller.signal.aborted) {
        throw new LlmAttemptError(504, 'AI_PROVIDER_TIMEOUT', 'AI provider request timed out.', true);
      }
      throw new LlmAttemptError(502, 'AI_PROVIDER_ERROR', 'AI provider request failed.', true);
    } finally {
      clearTimeout(timeout);
    }
  }

  private mapUnexpectedError(error: unknown): AiFeatureError {
    return error instanceof AiFeatureError
      ? error
      : new LlmAttemptError(502, 'AI_PROVIDER_ERROR', 'AI provider request failed.', true);
  }

  private debug(level: 'info' | 'warn', fields: Record<string, unknown>, message: string): void {
    if (!this.config.debugLogging || !this.logger) return;
    this.logger[level](fields, message);
  }
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
