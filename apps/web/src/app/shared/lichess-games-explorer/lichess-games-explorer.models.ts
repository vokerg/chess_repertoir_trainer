import type {
  LichessGamesPeerEvidencePeriod,
  LichessGamesRatingGroup,
  LichessGamesRatingTarget,
  LichessGamesSpeedPreset,
} from '@chess-trainer/contracts/opening-explorer';

export interface LichessGamesExplorerFilters {
  speedPreset: LichessGamesSpeedPreset;
  ratingTarget: LichessGamesRatingTarget;
  ratingGroup: LichessGamesRatingGroup | null;
}

export const lichessSpeedPresetOptions: readonly {
  value: LichessGamesSpeedPreset;
  label: string;
}[] = [
  { value: 'ALL', label: 'All speeds' },
  { value: 'BLITZ_AND_SLOWER', label: 'Blitz and slower' },
  { value: 'BLITZ', label: 'Blitz' },
  { value: 'BULLET', label: 'Bullet' },
];

export const lichessRatingGroupOptions: readonly {
  value: LichessGamesRatingGroup;
  label: string;
}[] = [
  { value: 0, label: '< 1000' },
  { value: 1000, label: '1000–1199' },
  { value: 1200, label: '1200–1399' },
  { value: 1400, label: '1400–1599' },
  { value: 1600, label: '1600–1799' },
  { value: 1800, label: '1800–1999' },
  { value: 2000, label: '2000–2199' },
  { value: 2200, label: '2200–2499' },
  { value: 2500, label: '2500+' },
];

export interface LichessRatingSelectionOption {
  value: string;
  label: string;
  target: LichessGamesRatingTarget;
  ratingGroup: LichessGamesRatingGroup | null;
}

export const lichessRatingSelectionOptions: readonly LichessRatingSelectionOption[] = [
  { value: 'ALL', label: 'All players', target: 'ALL', ratingGroup: null },
  { value: 'MY_PEERS', label: 'My peers', target: 'MY_PEERS', ratingGroup: null },
  {
    value: 'MY_PEERS_PLUS_ONE',
    label: 'My peers and above',
    target: 'MY_PEERS_PLUS_ONE',
    ratingGroup: null,
  },
  ...lichessRatingGroupOptions.map((option) => ({
    value: `GROUP:${option.value}`,
    label: option.label,
    target: 'GROUP' as const,
    ratingGroup: option.value,
  })),
];

export function defaultLichessGamesExplorerFilters(): LichessGamesExplorerFilters {
  return {
    speedPreset: 'BLITZ_AND_SLOWER',
    ratingTarget: 'MY_PEERS_PLUS_ONE',
    ratingGroup: null,
  };
}

export function ratingSelectionValue(filters: LichessGamesExplorerFilters): string {
  return filters.ratingTarget === 'GROUP' && filters.ratingGroup !== null
    ? `GROUP:${filters.ratingGroup}`
    : filters.ratingTarget;
}

export function ratingGroupLabel(group: LichessGamesRatingGroup): string {
  return lichessRatingGroupOptions.find((option) => option.value === group)?.label ?? String(group);
}

export function effectiveRatingLabel(groups: readonly LichessGamesRatingGroup[]): string {
  if (groups.length === lichessRatingGroupOptions.length) return 'All players';
  if (groups.length === 0) return 'No rating groups';
  if (groups.length === 1) return ratingGroupLabel(groups[0]);

  const first = groups[0];
  const last = groups.at(-1)!;
  if (first === 0 && last === 2500) return 'All players';
  const firstLabel = first === 0 ? '< 1000' : String(first);
  const lastLabel = last === 2500 ? '2500+' : String(last + 199);
  return `${firstLabel}–${lastLabel}`;
}

export function evidencePeriodLabel(period: LichessGamesPeerEvidencePeriod): string {
  switch (period) {
    case 'RECENT_THREE_MONTHS': return 'recent peer evidence';
    case 'ALL_HISTORY': return 'all-history peer evidence';
    case 'GENERIC_FALLBACK': return 'default peer estimate';
  }
}

export function speedPresetLabel(preset: LichessGamesSpeedPreset): string {
  return lichessSpeedPresetOptions.find((option) => option.value === preset)?.label ?? preset;
}