import type { PlayerChessProfileResponse } from '@chess-trainer/contracts/player-chess-profile';
import {
  playerChessProfilePeerLabel,
  playerChessProfilePercentLabel,
  playerChessProfileWdlLabel,
} from './player-chess-profile-labels';

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
