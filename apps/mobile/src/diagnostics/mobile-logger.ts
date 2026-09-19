export type MobileLogLevel = 'info' | 'warn' | 'error';

export type MobileLogEntry = {
  sequence: number;
  level: MobileLogLevel;
  scope: string;
  message: string;
  occurredAt: string;
  details: Record<string, unknown> | null;
};

const MAX_ENTRIES = 200;
const entries: MobileLogEntry[] = [];
let sequence = 0;

export const mobileLogger = {
  info(scope: string, message: string, details?: Record<string, unknown>): void {
    write('info', scope, message, details);
  },
  warn(scope: string, message: string, details?: Record<string, unknown>): void {
    write('warn', scope, message, details);
  },
  error(scope: string, message: string, error?: unknown): void {
    write('error', scope, message, serializeError(error));
  },
  snapshot(): MobileLogEntry[] {
    return entries.map((entry) => ({ ...entry, details: entry.details ? { ...entry.details } : null }));
  },
  clear(): void {
    entries.length = 0;
  },
};

function write(
  level: MobileLogLevel,
  scope: string,
  message: string,
  details?: Record<string, unknown>,
): void {
  sequence += 1;
  const entry: MobileLogEntry = {
    sequence,
    level,
    scope,
    message,
    occurredAt: new Date().toISOString(),
    details: details ?? null,
  };
  entries.push(entry);
  if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES);

  const output = `[${scope}] ${message}`;
  if (level === 'error') {
    const printableDetails = details ? { ...details, stack: undefined } : null;
    console.error(output, printableDetails ? JSON.stringify(printableDetails) : '');
  } else if (level === 'warn') {
    console.warn(output, details ?? '');
  } else {
    console.info(output, details ?? '');
  }
}

function serializeError(error: unknown): Record<string, unknown> | undefined {
  if (error === undefined) return undefined;
  if (error instanceof Error) {
    const extended = error as Error & {
      status?: unknown;
      requestUrl?: unknown;
      responseBody?: unknown;
    };
    return {
      name: error.name,
      message: error.message,
      status: extended.status ?? null,
      requestUrl: extended.requestUrl ?? null,
      responseBody: extended.responseBody ?? null,
      stack: error.stack ?? null,
    };
  }
  return { value: String(error) };
}
