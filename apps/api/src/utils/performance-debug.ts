export function performanceDebug(event: string, startedAt: number, details: Record<string, number | string> = {}): void {
  if (process.env['PERFORMANCE_DEBUG'] !== 'true') return;
  console.debug('[performance]', event, { durationMs: Number((performance.now() - startedAt).toFixed(2)), ...details });
}
