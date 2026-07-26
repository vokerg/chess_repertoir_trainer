import type {
  LichessGamesRatingGroup,
  LichessGamesSpeed,
} from '@chess-trainer/contracts/opening-explorer';

export interface LichessGamesExplorerFilters {
  since: string | null;
  until: string | null;
  ratings: readonly LichessGamesRatingGroup[];
  speeds: readonly LichessGamesSpeed[];
}

export const lichessRatingOptions: readonly {
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

export const lichessSpeedOptions: readonly {
  value: LichessGamesSpeed;
  label: string;
}[] = [
  { value: 'ultraBullet', label: 'UltraBullet' },
  { value: 'bullet', label: 'Bullet' },
  { value: 'blitz', label: 'Blitz' },
  { value: 'rapid', label: 'Rapid' },
  { value: 'classical', label: 'Classical' },
  { value: 'correspondence', label: 'Correspondence' },
];

export function defaultLichessGamesExplorerFilters(): LichessGamesExplorerFilters {
  return {
    since: null,
    until: null,
    ratings: lichessRatingOptions.map((option) => option.value),
    speeds: lichessSpeedOptions.map((option) => option.value),
  };
}
