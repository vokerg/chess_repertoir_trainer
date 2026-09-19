import type {
  PlayerChessProfileConclusion,
  PlayerChessProfileDimension,
  PlayerChessProfileResponse,
} from '@chess-trainer/contracts/player-chess-profile';
import type { PlayerChessProfileAccountDto } from '../data-access/player-chess-profile.models';
import {
  playerChessProfileColorsLabel,
  playerChessProfileDeltaLabel,
  playerChessProfileEvidenceLabel,
  playerChessProfilePercentLabel,
  playerChessProfileSpeedLabel,
  playerChessProfileValueLabel,
  playerChessProfileWdlLabel,
} from './player-chess-profile-labels';

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
