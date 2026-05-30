export class ApiError extends Error {
  status?: number;
  details?: unknown;

  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export function messageFromUnknownError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Unknown error';
}

export function mapApiErrorBody(body: unknown): string {
  if (!body || typeof body !== 'object') return 'Request failed';
  const value = body as Record<string, unknown>;
  const error = value.error;
  const message = value.message;

  if (typeof error === 'string') return error;
  if (Array.isArray(error)) return error.map(formatValidationIssue).join('\n');
  if (typeof message === 'string') return message;
  return 'Request failed';
}

function formatValidationIssue(issue: unknown): string {
  if (!issue || typeof issue !== 'object') return String(issue);
  const value = issue as Record<string, unknown>;
  const path = Array.isArray(value.path) ? value.path.join('.') : undefined;
  const message = typeof value.message === 'string' ? value.message : JSON.stringify(issue);
  return path ? `${path}: ${message}` : message;
}
