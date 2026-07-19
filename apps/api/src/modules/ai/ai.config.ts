function readBoolean(value: string | undefined): boolean {
  return value === 'true' || value === '1' || value === 'yes';
}

function readPositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export interface AiConfig {
  enabled: boolean;
  gameReviewEnabled: boolean;
  provider: 'openai-compatible';
  baseUrl: string;
  model: string;
  apiKey: string;
  timeoutMs: number;
  maxRetries: number;
  thinkingMode: 'enabled' | 'disabled';
  reasoningEffort?: 'high' | 'max';
  debugLogging: boolean;
  configured: boolean;
}

export function loadAiConfig(env: NodeJS.ProcessEnv = process.env): AiConfig {
  const enabled = readBoolean(env['AI_WIDGETS_ENABLED']);
  const gameReviewEnabled = enabled && readBoolean(env['AI_GAME_REVIEW_ENABLED']);
  const provider = env['LLM_PROVIDER'] || 'openai-compatible';
  const baseUrl = (env['LLM_BASE_URL'] || '').trim().replace(/\/+$/, '');
  const model = (env['LLM_MODEL'] || '').trim();
  const apiKey = (env['LLM_API_KEY'] || '').trim();
  const thinkingMode = env['LLM_THINKING_MODE'] === 'enabled' ? 'enabled' : 'disabled';
  const reasoningEffort = env['LLM_REASONING_EFFORT'] === 'high' || env['LLM_REASONING_EFFORT'] === 'max'
    ? env['LLM_REASONING_EFFORT']
    : undefined;

  return {
    enabled,
    gameReviewEnabled,
    provider: 'openai-compatible',
    baseUrl,
    model,
    apiKey,
    timeoutMs: readPositiveInt(env['LLM_TIMEOUT_MS'], 120_000),
    maxRetries: Math.min(readPositiveInt(env['LLM_MAX_RETRIES'], 1), 3),
    thinkingMode,
    reasoningEffort,
    debugLogging: readBoolean(env['LLM_DEBUG_LOGGING']),
    configured: provider === 'openai-compatible' && Boolean(baseUrl && model && apiKey),
  };
}

export function gameReviewAvailable(config: AiConfig = loadAiConfig()): boolean {
  return config.enabled && config.gameReviewEnabled && config.configured;
}
