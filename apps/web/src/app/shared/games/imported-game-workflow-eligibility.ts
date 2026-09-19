export const STANDARD_IMPORTED_GAME_SPEEDS = ['blitz', 'rapid'] as const;

const STANDARD_IMPORTED_GAME_SPEED_SET = new Set<string>(STANDARD_IMPORTED_GAME_SPEEDS);

export function normalizeSpeedCategory(speedCategory: string | null | undefined): string | null {
  const normalized = speedCategory?.trim().toLowerCase();
  return normalized ? normalized : null;
}

export function isStandardImportedGameSpeed(speedCategory: string | null | undefined): boolean {
  const normalized = normalizeSpeedCategory(speedCategory);
  return normalized !== null && STANDARD_IMPORTED_GAME_SPEED_SET.has(normalized);
}
