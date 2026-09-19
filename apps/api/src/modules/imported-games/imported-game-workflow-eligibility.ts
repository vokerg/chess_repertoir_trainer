export const STANDARD_IMPORTED_GAME_SPEEDS = ['blitz', 'rapid'] as const;
export const STANDARD_IMPORTED_GAME_VARIANTS = ['chess', 'standard'] as const;

const STANDARD_IMPORTED_GAME_SPEED_SET = new Set<string>(STANDARD_IMPORTED_GAME_SPEEDS);
const STANDARD_IMPORTED_GAME_VARIANT_SET = new Set<string>(STANDARD_IMPORTED_GAME_VARIANTS);

export function normalizeSpeedCategory(speedCategory: string | null | undefined): string | null {
  const normalized = speedCategory?.trim().toLowerCase();
  return normalized ? normalized : null;
}

export function isStandardImportedGameSpeed(speedCategory: string | null | undefined): boolean {
  const normalized = normalizeSpeedCategory(speedCategory);
  return normalized !== null && STANDARD_IMPORTED_GAME_SPEED_SET.has(normalized);
}

export function normalizeImportedGameVariant(variant: string | null | undefined): string | null {
  const normalized = variant?.trim().toLowerCase();
  return normalized ? normalized : null;
}

export function isStandardImportedGameVariant(variant: string | null | undefined): boolean {
  const normalized = normalizeImportedGameVariant(variant);
  return normalized === null || STANDARD_IMPORTED_GAME_VARIANT_SET.has(normalized);
}
