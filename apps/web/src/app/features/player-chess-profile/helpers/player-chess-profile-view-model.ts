import type {
  PlayerChessProfileConclusion,
  PlayerChessProfileDimension,
  PlayerChessProfileEvidenceStrength,
  PlayerChessProfileOpeningReference,
  PlayerChessProfilePerformanceItem,
  PlayerChessProfilePreferenceItem,
  PlayerChessProfileResponse,
  PlayerChessProfileSupportingGame,
} from '@chess-trainer/contracts/player-chess-profile';
import type { PlayerChessProfileAccountDto } from '../data-access/player-chess-profile.models';
import type { PlayerChessProfileEvidenceSelection } from '../state/player-chess-profile.models';

export interface PlayerChessProfileAccountViewModel {
  id: number;
  label: string;
  selected: boolean;
}

export interface PlayerChessProfileConclusionViewModel {
  id: string;
  index: number;
  summary: string;
  sampleLabel: string;
  metricLabel: string | null;
  evidenceLabel: string;
  kindLabel: string;
  positive: boolean;
  negative: boolean;
}

export interface PlayerChessProfilePreferenceRowViewModel {
  id: string;
  dimension: PlayerChessProfileDimension;
  value: string;
  title: string;
  summary: string;
  exposurePercent: number;
}

export interface PlayerChessProfilePerformanceRowViewModel {
  id: string;
  dimension: PlayerChessProfileDimension;
  value: string;
  title: string;
  summary: string;
  scoreDelta: number | null;
  deltaLabel: string;
  openingPositiveLabel: string;
  openingTroubleLabel: string;
  earlyMistakeLabel: string;
  accuracyLabel: string;
  evidenceLabel: string;
}

export interface PlayerChessProfileEvidenceMetricViewModel {
  id: string;
  label: string;
  value: string;
}

export interface PlayerChessProfileEvidenceOpeningViewModel {
  id: string;
  title: string;
  meta: string;
  gamesLabel: string;
}

export interface PlayerChessProfileEvidenceGameViewModel {
  id: number;
  title: string;
  meta: string;
  endedAtLabel: string;
  providerUrl: string | null;
}

export interface PlayerChessProfileEvidenceViewModel {
  title: string;
  summary: string;
  evidenceLabel: string;
  metrics: readonly PlayerChessProfileEvidenceMetricViewModel[];
  openings: readonly PlayerChessProfileEvidenceOpeningViewModel[];
  games: readonly PlayerChessProfileEvidenceGameViewModel[];
}

export interface PlayerChessProfileSummaryStatViewModel {
  id: string;
  label: string;
  value: string;
  detail: string;
}

export interface PlayerChessProfileCoverageBarViewModel {
  id: string;
  label: string;
  valueLabel: string;
  percent: number;
}

export interface PlayerChessProfileCoverageViewModel {
  summaryStats: readonly PlayerChessProfileSummaryStatViewModel[];
  coverageBars: readonly PlayerChessProfileCoverageBarViewModel[];
  notes: readonly string[];
}

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

export function buildPlayerChessProfileAccountViewModels(
  accounts: readonly PlayerChessProfileAccountDto[],
  selectedAccountIds: readonly number[],
): readonly PlayerChessProfileAccountViewModel[] {
  const selected = new Set(selectedAccountIds);
  return accounts.map((account) => ({
    id: account.id,
    label: `${account.displayName || account.username} · ${account.provider === 'LICHESS' ? 'Lichess' : 'Chess.com'}`,
    selected: selected.has(account.id),
  }));
}

export function playerChessProfileContextLabel(
  response: PlayerChessProfileResponse,
  accounts: readonly PlayerChessProfileAccountDto[],
): string {
  const selectedAccountIds = response.filters.accountIds;
  const accountLabel = selectedAccountIds?.length
    ? selectedAccountIds
      .map((id) => accounts.find((account) => account.id === id))
      .filter((account): account is PlayerChessProfileAccountDto => Boolean(account))
      .map((account) => account.displayName || account.username)
      .join(', ') || `${selectedAccountIds.length} selected account${selectedAccountIds.length === 1 ? '' : 's'}`
    : 'All connected accounts';

  return [
    `${response.coverage.totalGames} game${response.coverage.totalGames === 1 ? '' : 's'}`,
    accountLabel,
    playerChessProfileSpeedLabel(response.filters.speedPreset),
    playerChessProfileColorsLabel(response.filters.colors),
    response.filters.rated ? 'Rated' : 'Casual',
    `${response.filters.range.from} to ${response.filters.range.to}`,
  ].join(' · ');
}

function conclusionKindLabel(conclusion: PlayerChessProfileConclusion): string {
  if (conclusion.code === 'PREFERENCE') return 'Preference';
  if (conclusion.code === 'PERFORMS_BETTER') return 'Above baseline';
  if (conclusion.code === 'PERFORMS_WORSE') return 'Below baseline';
  if (conclusion.code === 'OPENING_TROUBLE') return 'Trouble area';
  return 'Not enough data';
}

export function buildPlayerChessProfileConclusionViewModels(
  response: PlayerChessProfileResponse,
): readonly PlayerChessProfileConclusionViewModel[] {
  return response.conclusions.map((conclusion, index) => ({
    id: `${index}:${conclusion.code}:${conclusion.dimension ?? 'NONE'}:${conclusion.value ?? 'NONE'}`,
    index,
    summary: conclusion.summary,
    sampleLabel: `${conclusion.sampleSize} game${conclusion.sampleSize === 1 ? '' : 's'}`,
    metricLabel: conclusion.metricValue === null
      ? null
      : playerChessProfilePercentLabel(conclusion.metricValue),
    evidenceLabel: playerChessProfileEvidenceLabel(conclusion.evidenceStrength),
    kindLabel: conclusionKindLabel(conclusion),
    positive: conclusion.code === 'PERFORMS_BETTER',
    negative: conclusion.code === 'PERFORMS_WORSE' || conclusion.code === 'OPENING_TROUBLE',
  }));
}

export function buildPlayerChessProfilePreferenceRows(
  response: PlayerChessProfileResponse,
  dimension: PlayerChessProfileDimension,
): readonly PlayerChessProfilePreferenceRowViewModel[] {
  return response.preference.items
    .filter((item) => item.dimension === dimension && item.value !== 'UNKNOWN')
    .sort((left, right) => right.games - left.games || left.value.localeCompare(right.value))
    .map((item) => ({
      id: `${item.dimension}:${item.value}`,
      dimension: item.dimension,
      value: item.value,
      title: playerChessProfileValueLabel(item.value),
      summary: `${item.games} games · ${playerChessProfilePercentLabel(item.exposurePercent)} exposure`,
      exposurePercent: item.exposurePercent,
    }));
}

export function buildPlayerChessProfilePerformanceRows(
  response: PlayerChessProfileResponse,
  dimension: PlayerChessProfileDimension,
): readonly PlayerChessProfilePerformanceRowViewModel[] {
  return response.performance.items
    .filter((item) => item.dimension === dimension && item.value !== 'UNKNOWN')
    .sort((left, right) => {
      const leftDelta = left.scoreDelta ?? Number.NEGATIVE_INFINITY;
      const rightDelta = right.scoreDelta ?? Number.NEGATIVE_INFINITY;
      return rightDelta - leftDelta || right.games - left.games || left.value.localeCompare(right.value);
    })
    .map((item) => ({
      id: `${item.dimension}:${item.value}`,
      dimension: item.dimension,
      value: item.value,
      title: playerChessProfileValueLabel(item.value),
      summary: `${item.games} games · ${playerChessProfileWdlLabel(item)} · ${playerChessProfilePercentLabel(item.scorePercent)} score`,
      scoreDelta: item.scoreDelta,
      deltaLabel: playerChessProfileDeltaLabel(item.scoreDelta),
      openingPositiveLabel: playerChessProfilePercentLabel(item.openingPositiveRate),
      openingTroubleLabel: playerChessProfilePercentLabel(item.openingTroubleRate),
      earlyMistakeLabel: playerChessProfilePercentLabel(item.earlyMistakeRate),
      accuracyLabel: playerChessProfilePercentLabel(item.averageAccuracy),
      evidenceLabel: playerChessProfileEvidenceLabel(item.resultEvidenceStrength),
    }));
}

function matchingConclusionItem(
  response: PlayerChessProfileResponse,
  conclusion: PlayerChessProfileConclusion,
): PlayerChessProfilePreferenceItem | PlayerChessProfilePerformanceItem | null {
  if (!conclusion.dimension || !conclusion.value) return null;
  if (conclusion.code === 'PREFERENCE') {
    return response.preference.items.find(
      (item) => item.dimension === conclusion.dimension && item.value === conclusion.value,
    ) ?? null;
  }
  return response.performance.items.find(
    (item) => item.dimension === conclusion.dimension && item.value === conclusion.value,
  ) ?? response.preference.items.find(
    (item) => item.dimension === conclusion.dimension && item.value === conclusion.value,
  ) ?? null;
}

function matchingGames(
  games: readonly PlayerChessProfileSupportingGame[],
  openings: readonly PlayerChessProfileOpeningReference[],
): readonly PlayerChessProfileSupportingGame[] {
  if (openings.length === 0) return games;
  const keys = new Set(openings.map((opening) => `${opening.eco ?? ''}:${opening.name ?? ''}`));
  const related = games.filter(
    (game) => keys.has(`${game.openingEco ?? ''}:${game.openingName ?? ''}`),
  );
  return related.length > 0 ? related : games;
}

function evidenceMetrics(
  entries: readonly { label: string; value: string }[],
): readonly PlayerChessProfileEvidenceMetricViewModel[] {
  return entries.map((entry) => ({ id: entry.label, ...entry }));
}

function performanceMetrics(
  item: PlayerChessProfilePerformanceItem,
): readonly PlayerChessProfileEvidenceMetricViewModel[] {
  return evidenceMetrics([
    { label: 'Games', value: String(item.games) },
    { label: 'W–D–L', value: playerChessProfileWdlLabel(item) },
    { label: 'Score', value: playerChessProfilePercentLabel(item.scorePercent) },
    { label: 'Versus baseline', value: playerChessProfileDeltaLabel(item.scoreDelta) },
    { label: 'Opening positive', value: playerChessProfilePercentLabel(item.openingPositiveRate) },
    { label: 'Opening trouble', value: playerChessProfilePercentLabel(item.openingTroubleRate) },
    { label: 'Early mistakes', value: playerChessProfilePercentLabel(item.earlyMistakeRate) },
    { label: 'Average accuracy', value: playerChessProfilePercentLabel(item.averageAccuracy) },
  ]);
}

function preferenceMetrics(
  item: PlayerChessProfilePreferenceItem,
): readonly PlayerChessProfileEvidenceMetricViewModel[] {
  return evidenceMetrics([
    { label: 'Games', value: String(item.games) },
    { label: 'Exposure', value: playerChessProfilePercentLabel(item.exposurePercent) },
    { label: 'High-confidence games', value: String(item.confidenceGames.high) },
    { label: 'Medium-confidence games', value: String(item.confidenceGames.medium) },
    { label: 'Low-confidence games', value: String(item.confidenceGames.low) },
  ]);
}

function conclusionMetrics(
  conclusion: PlayerChessProfileConclusion,
  item: PlayerChessProfilePreferenceItem | PlayerChessProfilePerformanceItem | null,
): readonly PlayerChessProfileEvidenceMetricViewModel[] {
  const entries: { label: string; value: string }[] = [
    { label: 'Sample', value: String(conclusion.sampleSize) },
  ];
  if (conclusion.metricValue !== null) {
    entries.push({ label: 'Metric', value: playerChessProfilePercentLabel(conclusion.metricValue) });
  }
  if (conclusion.baselineValue !== null) {
    entries.push({ label: 'Baseline', value: playerChessProfilePercentLabel(conclusion.baselineValue) });
  }
  if (conclusion.delta !== null) {
    entries.push({ label: 'Difference', value: playerChessProfileDeltaLabel(conclusion.delta) });
  }
  const itemMetrics = item && 'scoreDelta' in item
    ? performanceMetrics(item)
    : item
      ? preferenceMetrics(item)
      : [];
  const existing = new Set(entries.map((entry) => entry.label));
  return [
    ...evidenceMetrics(entries),
    ...itemMetrics.filter((metric) => !existing.has(metric.label)),
  ];
}

function evidenceOpeningViewModels(
  openings: readonly PlayerChessProfileOpeningReference[],
): readonly PlayerChessProfileEvidenceOpeningViewModel[] {
  return openings.map((opening) => ({
    id: `${opening.userColor}:${opening.eco ?? 'NONE'}:${opening.name ?? 'NONE'}`,
    title: opening.name || opening.eco || 'Unknown opening',
    meta: `${opening.eco || 'No ECO'} · ${playerChessProfileValueLabel(opening.userColor)}`,
    gamesLabel: `${opening.games} game${opening.games === 1 ? '' : 's'}`,
  }));
}

function dateLabel(value: string | null): string {
  if (!value) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

function evidenceGameViewModels(
  games: readonly PlayerChessProfileSupportingGame[],
): readonly PlayerChessProfileEvidenceGameViewModel[] {
  return games.map((game) => ({
    id: game.id,
    title: game.openingName || game.openingEco || `Game ${game.id}`,
    meta: [
      game.resultForUser ? playerChessProfileValueLabel(game.resultForUser) : 'Unknown result',
      playerChessProfileValueLabel(game.userColor),
      game.speedCategory ? playerChessProfileValueLabel(game.speedCategory) : 'Unknown speed',
    ].join(' · '),
    endedAtLabel: dateLabel(game.endedAt),
    providerUrl: game.providerUrl,
  }));
}

function evidenceViewModel(
  title: string,
  summary: string,
  evidenceStrength: PlayerChessProfileEvidenceStrength,
  metrics: readonly PlayerChessProfileEvidenceMetricViewModel[],
  openings: readonly PlayerChessProfileOpeningReference[],
  games: readonly PlayerChessProfileSupportingGame[],
): PlayerChessProfileEvidenceViewModel {
  return {
    title,
    summary,
    evidenceLabel: playerChessProfileEvidenceLabel(evidenceStrength),
    metrics,
    openings: evidenceOpeningViewModels(openings),
    games: evidenceGameViewModels(matchingGames(games, openings)),
  };
}

export function buildPlayerChessProfileEvidence(
  response: PlayerChessProfileResponse,
  selection: PlayerChessProfileEvidenceSelection | null,
): PlayerChessProfileEvidenceViewModel | null {
  if (!selection) return null;

  if (selection.kind === 'CONCLUSION') {
    const conclusion = response.conclusions[selection.index];
    if (!conclusion) return null;
    const item = matchingConclusionItem(response, conclusion);
    const openings = item?.supportingOpenings ?? [];
    return evidenceViewModel(
      conclusion.summary,
      conclusion.dimension && conclusion.value
        ? `${playerChessProfileDimensionLabel(conclusion.dimension)} · ${playerChessProfileValueLabel(conclusion.value)}`
        : 'Selected profile context',
      conclusion.evidenceStrength,
      conclusionMetrics(conclusion, item),
      openings,
      response.supportingGames,
    );
  }

  if (selection.kind === 'PERFORMANCE') {
    const item = response.performance.items.find(
      (candidate) => candidate.dimension === selection.dimension && candidate.value === selection.value,
    );
    if (!item) return null;
    return evidenceViewModel(
      `${playerChessProfileValueLabel(item.value)} performance`,
      `${playerChessProfileDimensionLabel(item.dimension)} in the selected games.`,
      item.resultEvidenceStrength,
      performanceMetrics(item),
      item.supportingOpenings,
      response.supportingGames,
    );
  }

  const item = response.preference.items.find(
    (candidate) => candidate.dimension === selection.dimension && candidate.value === selection.value,
  );
  if (!item) return null;
  const evidenceStrength: PlayerChessProfileEvidenceStrength = item.games < 5
    ? 'INSUFFICIENT'
    : item.games < 15
      ? 'LOW'
      : item.games < 40
        ? 'MEDIUM'
        : 'HIGH';
  return evidenceViewModel(
    `${playerChessProfileValueLabel(item.value)} preference`,
    `${playerChessProfileDimensionLabel(item.dimension)} exposure in the selected games.`,
    evidenceStrength,
    preferenceMetrics(item),
    item.supportingOpenings,
    response.supportingGames,
  );
}

function coveragePercent(value: number, denominator: number): number {
  return denominator > 0 ? Math.min(100, Math.round((value / denominator) * 100)) : 0;
}

export function buildPlayerChessProfileCoverageViewModel(
  response: PlayerChessProfileResponse,
): PlayerChessProfileCoverageViewModel {
  const notes: string[] = [];
  if (response.coverage.lowConfidenceOpeningGames > 0) {
    notes.push(`${response.coverage.lowConfidenceOpeningGames} games use low-confidence opening classification.`);
  }
  if (response.coverage.unknownDimensionOpeningGames > 0) {
    notes.push(`${response.coverage.unknownDimensionOpeningGames} games contain at least one unknown profile dimension.`);
  }
  if (response.coverage.omittedOpeningGames > 0) {
    notes.push(
      `${response.coverage.omittedOpeningGames} long-tail opening games are outside the top ${response.coverage.openingGroupLimit} profile groups.`,
    );
  }

  return {
    summaryStats: [
      {
        id: 'selected-games',
        label: 'Selected games',
        value: String(response.baseline.games),
        detail: `${playerChessProfileWdlLabel(response.baseline)} W–D–L`,
      },
      {
        id: 'score',
        label: 'Score',
        value: playerChessProfilePercentLabel(response.baseline.scorePercent),
        detail: 'Selected-game baseline',
      },
      {
        id: 'opening-positive',
        label: 'Opening positive',
        value: playerChessProfilePercentLabel(response.baseline.openingPositiveRate),
        detail: 'Advantage or success',
      },
      {
        id: 'opening-trouble',
        label: 'Opening trouble',
        value: playerChessProfilePercentLabel(response.baseline.openingTroubleRate),
        detail: 'Trouble or disaster',
      },
      {
        id: 'early-mistakes',
        label: 'Early mistakes',
        value: playerChessProfilePercentLabel(response.baseline.earlyMistakeRate),
        detail: 'Mistake or blunder',
      },
      {
        id: 'peer-context',
        label: 'Peer context',
        value: playerChessProfilePeerLabel(response),
        detail: `${response.peerLevel.eligibleGames} rating-evidence games`,
      },
    ],
    coverageBars: [
      {
        id: 'analysis',
        label: 'Analysis coverage',
        valueLabel: `${response.coverage.analysedGames}/${response.coverage.totalGames} · ${playerChessProfilePercentLabel(response.coverage.analysisPercent)}`,
        percent: response.coverage.analysisPercent ?? 0,
      },
      {
        id: 'named-openings',
        label: 'Named openings',
        valueLabel: `${response.coverage.namedOpeningGames}/${response.coverage.totalGames}`,
        percent: coveragePercent(response.coverage.namedOpeningGames, response.coverage.totalGames),
      },
      {
        id: 'classified-openings',
        label: 'Classified openings',
        valueLabel: `${response.coverage.classifiedOpeningGames}/${response.coverage.profiledOpeningGames}`,
        percent: coveragePercent(
          response.coverage.classifiedOpeningGames,
          response.coverage.profiledOpeningGames,
        ),
      },
    ],
    notes,
  };
}
