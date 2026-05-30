export function percent(value?: number | null): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-';
  return `${Math.round(value)}%`;
}
