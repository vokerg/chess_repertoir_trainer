import type {
  PlayerChessProfileDimension,
  PlayerChessProfileEvidenceStrength,
  PlayerChessProfileResponse,
} from '@chess-trainer/contracts/player-chess-profile';

const DIMENSION_LABELS: Record<PlayerChessProfileDimension, string> = {
  CHARACTER: 'Character',
  SOUNDNESS: 'Soundness',
  THEORETICAL_STATUS: 'Theory status',
  THEORY_BURDEN: 'Theory burden',
  ROLE: 'Role',
};

export function playerChessProfileDimensionLabel(dimension: PlayerChessProfileDimension): string {
  return DIMENSION_LABELS[dimension];
}

export function playerChessProfileValueLabel(value: string): string {
  return value
    .toLocaleLowerCase('en-US')
    .split('_')
    .map((part) => part.charAt(0).toLocaleUpperCase('en-US') + part.slice(1))
    .join(' ');
}

export function playerChessProfileEvidenceLabel(strength: PlayerChessProfileEvidenceStrength): string {
  return strength === 'INSUFFICIENT'
    ? 'Insufficient evidence'
    : `${playerChessProfileValueLabel(strength)} evidence`;
}

export function playerChessProfilePercentLabel(value: number | null): string {
  if (value === null) return '—';
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}

export function playerChessProfileDeltaLabel(value: number | null): string {
  if (value === null) return '—';
  return `${value > 0 ? '+' : ''}${value.toFixed(value % 1 === 0 ? 0 : 1)} pp`;
}

export function playerChessProfileWdlLabel(item: {
  wdl: { wins: number; draws: number; losses: number };
}): string {
  return `${item.wdl.wins}–${item.wdl.draws}–${item.wdl.losses}`;
}

export function playerChessProfileSpeedLabel(
  speedPreset: PlayerChessProfileResponse['filters']['speedPreset'],
): string {
  if (speedPreset === 'ALL') return 'All speeds';
  if (speedPreset === 'BLITZ') return 'Blitz';
  if (speedPreset === 'BULLET') return 'Bullet';
  return 'Blitz and slower';
}

export function playerChessProfileColorsLabel(
  colors: PlayerChessProfileResponse['filters']['colors'],
): string {
  if (colors.length === 2) return 'White and Black';
  return colors[0] === 'WHITE' ? 'White' : 'Black';
}

export function playerChessProfilePeerGroupLabel(group: number): string {
  if (group === 0) return '<1000';
  if (group === 2500) return '2500+';
  return `${group}–${group + 199}`;
}

export function playerChessProfilePeerLabel(response: PlayerChessProfileResponse): string {
  return response.peerLevel.selectedGroups.map(playerChessProfilePeerGroupLabel).join(' + ');
}

export function playerChessProfileDateLabel(value: string | null): string {
  if (!value) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}
