export function formatTimeControl(initial?: number | null, increment?: number | null): string | null {
  if (typeof initial !== 'number' || typeof increment !== 'number') return null;
  return `${formatInitialMinutes(initial)}+${increment}`;
}

export function formatInitialMinutes(initialSeconds: number): string {
  if (initialSeconds < 60) return `${initialSeconds}s`;
  const minutes = initialSeconds / 60;
  return Number.isInteger(minutes) ? String(minutes) : String(Number(minutes.toFixed(1)));
}

export function timeControlFromRaw(raw?: string | null): string {
  if (!raw) return '';
  const match = raw.match(/^(\d+)\s*\+\s*(\d+)$/);
  if (!match) return raw;
  return formatTimeControl(Number(match[1]), Number(match[2])) || raw;
}
