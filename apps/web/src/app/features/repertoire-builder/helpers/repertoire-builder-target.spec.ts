import type { LichessGamesPeerResolution } from '@chess-trainer/contracts/opening-explorer';
import { repertoireTargetSchema } from '@chess-trainer/contracts/repertoire-target';
import {
  buildRepertoireBuilderTarget,
  defaultRepertoireBuilderSetup,
  targetPopulationLabel,
} from './repertoire-builder-target';

const NOW = '2026-07-29T08:00:00.000Z';
const TARGET_ID = '00000000-0000-4000-8000-000000000010';

const peerResolution: LichessGamesPeerResolution = {
  evidencePeriod: 'RECENT_THREE_MONTHS',
  eligibleGames: 48,
  selectedGroups: [1400, 1600],
  distribution: [
    { group: 1400, games: 28 },
    { group: 1600, games: 20 },
  ],
  contributions: [
    { accountId: 7, provider: 'LICHESS', username: 'builder-user', speed: 'blitz', games: 48 },
  ],
  normalizationProfile: {
    id: 'universal-online-strength',
    version: '2026-07-lichess-bands-v1',
  },
  resolverPolicyVersion: 'dominant-contiguous-window-v1',
};

describe('repertoire builder target factory', () => {
  it('creates a schema-valid explicit population target with transparent overrides', () => {
    const target = buildRepertoireBuilderTarget({
      ...defaultRepertoireBuilderSetup(),
      speedPreset: 'BLITZ',
      ratingTarget: 'GROUP',
      ratingGroup: 1800,
      persona: 'SOLID',
      maximumTheoryBurden: 'MEDIUM',
      coveragePercent: 90,
    }, null, NOW, TARGET_ID);

    expect(repertoireTargetSchema.safeParse(target).success).toBeTrue();
    expect(target.population.requested).toEqual({
      kind: 'EXPLICIT_LICHESS_GROUP',
      ratingGroup: 1800,
    });
    expect(target.population.peerResolution).toBeNull();
    expect(target.defaults.some((entry) => entry.field === 'population')).toBeFalse();
    expect(target.overriddenFields).toEqual(['speedPreset', 'objective', 'coverage']);
    expect(targetPopulationLabel(target)).toContain('1800–1999');
  });

  it('retains factual peer evidence and adds exactly one higher group', () => {
    const target = buildRepertoireBuilderTarget(
      defaultRepertoireBuilderSetup(),
      peerResolution,
      NOW,
      TARGET_ID,
    );

    expect(target.population.requested.kind).toBe('MY_PEERS_PLUS_ONE');
    expect(target.population.effectiveRatingGroups).toEqual([1400, 1600, 1800]);
    expect(target.accountIds).toEqual([7]);
    expect(target.population.peerResolution).toEqual(peerResolution);
    expect(target.defaults).toContain(jasmine.objectContaining({
      field: 'population',
      source: { kind: 'PEER_RESOLUTION' },
    }));
    expect(target.overriddenFields).not.toContain('population');
    expect(targetPopulationLabel(target)).toContain('My peers and one group higher');
  });
});
