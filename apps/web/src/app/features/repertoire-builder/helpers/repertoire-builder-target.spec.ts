import type { LichessGamesPeerResolution } from '@chess-trainer/contracts/opening-explorer';
import { repertoireTargetSchema } from '@chess-trainer/contracts/repertoire-target';
import {
  buildRepertoireBuilderTarget,
  defaultRepertoireBuilderSetup,
  targetPopulationLabel,
} from './repertoire-builder-target';
import type { RepertoireBuilderProfileDefaults } from '../state/repertoire-builder.models';

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

const profileDefaults: RepertoireBuilderProfileDefaults = {
  source: {
    kind: 'PLAYER_PROFILE',
    profileContractVersion: '2026-07-v1',
    profileGeneratedAt: '2026-07-29T07:30:00.000Z',
    classificationVersion: '2026-07-rules-v2',
  },
  setup: {
    side: 'WHITE',
    startingScope: 'FULL',
    customStartingPosition: '',
    speedPreset: 'BLITZ_AND_SLOWER',
    ratingTarget: 'MY_PEERS',
    ratingGroup: null,
    persona: 'SOLID',
    maximumTheoryBurden: 'HIGH',
    coveragePercent: 80,
  },
};

describe('repertoire builder target factory', () => {
  it('creates a schema-valid explicit population target with non-gating V1 compatibility internals', () => {
    const target = buildRepertoireBuilderTarget({
      ...defaultRepertoireBuilderSetup(),
      speedPreset: 'BLITZ',
      ratingTarget: 'GROUP',
      ratingGroup: 1800,
      persona: 'SOLID',
      maximumTheoryBurden: 'LOW',
      coveragePercent: 95,
    }, null, NOW, TARGET_ID);

    expect(repertoireTargetSchema.safeParse(target).success).toBeTrue();
    expect(target.population.requested).toEqual({
      kind: 'EXPLICIT_LICHESS_GROUP',
      ratingGroup: 1800,
    });
    expect(target.population.peerResolution).toBeNull();
    expect(target.objective.maximumTheoryBurden).toBe('HIGH');
    expect(target.coverage.opponentResponseCoveragePercent).toBe(80);
    expect(target.defaults.some((entry) => entry.field === 'population')).toBeFalse();
    expect(target.overriddenFields).toEqual(['speedPreset']);
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

  it('accepts profile defaults while keeping coverage as a system compatibility field', () => {
    const target = buildRepertoireBuilderTarget({
      ...profileDefaults.setup,
      profileDefaults,
    }, peerResolution, NOW, TARGET_ID);

    expect(repertoireTargetSchema.safeParse(target).success).toBeTrue();
    expect(target.overriddenFields).toEqual([]);
    expect(target.defaults.filter((entry) => entry.field !== 'population')).toEqual([
      jasmine.objectContaining({ field: 'speedPreset', source: profileDefaults.source }),
      jasmine.objectContaining({ field: 'objective', source: profileDefaults.source }),
      jasmine.objectContaining({
        field: 'coverage',
        source: jasmine.objectContaining({ kind: 'SYSTEM_DEFAULT' }),
      }),
    ]);
    expect(target.population.requested.kind).toBe('MY_PEERS');
    expect(target.defaults).toContain(jasmine.objectContaining({
      field: 'population',
      source: { kind: 'PEER_RESOLUTION' },
    }));
  });

  it('records an alternate persona override against immutable profile defaults', () => {
    const target = buildRepertoireBuilderTarget({
      ...profileDefaults.setup,
      profileDefaults,
      persona: 'SURPRISE',
    }, peerResolution, NOW, TARGET_ID);

    expect(target.objective.persona).toBe('SURPRISE');
    expect(target.objective.preferredCharacters).toEqual(['SURPRISE', 'TACTICAL']);
    expect(target.overriddenFields).toEqual(['objective']);
    expect(target.defaults.find((entry) => entry.field === 'objective')?.source)
      .toEqual(profileDefaults.source);
  });

  it('drops profile provenance safely when the selected side no longer matches', () => {
    const target = buildRepertoireBuilderTarget({
      ...profileDefaults.setup,
      side: 'BLACK',
      profileDefaults,
    }, peerResolution, NOW, TARGET_ID);

    expect(target.defaults.some((entry) => entry.source.kind === 'PLAYER_PROFILE')).toBeFalse();
    expect(target.defaults).toContain(jasmine.objectContaining({
      field: 'objective',
      source: jasmine.objectContaining({ kind: 'PERSONA_PRESET' }),
    }));
  });

  it('records an exact existing-course starting point', () => {
    const target = buildRepertoireBuilderTarget(
      { ...defaultRepertoireBuilderSetup(), ratingTarget: 'ALL' },
      null,
      NOW,
      TARGET_ID,
      { kind: 'COURSE_POSITION', courseId: 7, lineId: 13 },
    );

    expect(repertoireTargetSchema.safeParse(target).success).toBeTrue();
    expect(target.startingPoint).toEqual({ kind: 'COURSE_POSITION', courseId: 7, lineId: 13 });
  });
});
