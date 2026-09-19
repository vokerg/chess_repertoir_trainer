import type { LichessGamesSpeedPreset } from '@chess-trainer/contracts/opening-explorer';
import type { LichessGamesClient } from '../opening-explorer/lichess-opening-explorer.client';
import { resolveLichessGamesPopulation } from '../opening-explorer/opening-explorer.service';
import type { TrapPilotRecord } from './trap-pilot.types';
import type { TrapPopulationEvidenceSnapshot } from './trap-pilot.evidence';
import { withPopulationEvidenceHash } from './trap-pilot.evidence';
import { deriveTrapOccurrenceIdentity } from './trap-pilot.validator';

export interface CaptureTrapPopulationEvidenceInput {
  record: TrapPilotRecord;
  speedPreset: LichessGamesSpeedPreset;
  accessToken: string;
  client: LichessGamesClient;
  clock?: () => Date;
}

export async function captureTrapPopulationEvidence(
  input: CaptureTrapPopulationEvidenceInput,
): Promise<TrapPopulationEvidenceSnapshot> {
  if (!input.accessToken.trim()) throw new Error('A Lichess access token is required.');
  const population = await resolveLichessGamesPopulation({
    fen: input.record.trigger.normalizedFen,
    speedPreset: input.speedPreset,
    ratingTarget: 'ALL',
  }, 0);
  const snapshot = await input.client.fetchPosition({
    fen: input.record.trigger.normalizedFen,
    ratings: population.effective.ratingGroups,
    speeds: population.effective.speeds,
    movesLimit: 12,
    topGamesLimit: 0,
    accessToken: input.accessToken,
  });

  return withPopulationEvidenceHash({
    recordId: input.record.id,
    occurrenceIdentity: deriveTrapOccurrenceIdentity(input.record),
    profile: {
      id: 'lichess-games-explorer',
      version: 'product-speed-rating-presets-v1',
      speedPreset: input.speedPreset,
      ratingTarget: 'ALL',
      effectiveSpeeds: population.effective.speeds,
      effectiveRatingGroups: population.effective.ratingGroups,
    },
    capturedAt: (input.clock ?? (() => new Date()))().toISOString(),
    triggerFen: input.record.trigger.normalizedFen,
    games: snapshot.games,
    moves: snapshot.moves.map((move) => ({
      uci: move.uci,
      san: move.san,
      averageRating: move.averageRating,
      games: move.games,
    })),
  });
}
