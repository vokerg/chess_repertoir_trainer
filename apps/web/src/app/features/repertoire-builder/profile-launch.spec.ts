import { convertToParamMap } from '@angular/router';
import type {
  PlayerChessProfileOpeningCharacter,
  PlayerChessProfileOpeningGroup,
  PlayerChessProfileResponse,
} from '@chess-trainer/contracts/player-chess-profile';
import {
  builderLaunchReturnUrl,
  builderLaunchStartingPoint,
  parseRepertoireBuilderLaunch,
} from './helpers/repertoire-builder-launch';
import {
  buildRepertoireBuilderProfileLaunchQueryParams,
  buildRepertoireBuilderProfileSuggestions,
} from './profile-launch';

const GENERATED_AT = '2026-07-30T18:00:00.000Z';

const profile: Pick<
  PlayerChessProfileResponse,
  'generatedAt' | 'classificationVersion' | 'filters' | 'openingGroups'
> = {
  generatedAt: GENERATED_AT,
  classificationVersion: '2026-07-rules-v2',
  filters: {
    range: { from: '2026-04-30', to: '2026-07-30' },
    speedPreset: 'BLITZ_AND_SLOWER',
    speeds: ['blitz', 'rapid'],
    colors: ['WHITE', 'BLACK'],
    rated: true,
  },
  openingGroups: [
    openingGroup('WHITE', 12, ['SOLID', 'POSITIONAL'], 'LOW'),
    openingGroup('WHITE', 4, ['BALANCED'], 'MEDIUM'),
    openingGroup('BLACK', 10, ['SHARP', 'TACTICAL'], 'HIGH'),
    openingGroup('BLACK', 3, ['DYNAMIC'], 'MEDIUM'),
  ],
};

describe('profile-derived Builder launch', () => {
  it('derives independent transparent persona suggestions without hidden theory or coverage policy', () => {
    const suggestions = buildRepertoireBuilderProfileSuggestions(profile);

    expect(suggestions).toHaveSize(2);
    expect(suggestions[0]).toEqual(jasmine.objectContaining({
      side: 'WHITE',
      profiledGames: 16,
      strongestCharacter: 'SOLID',
      setup: jasmine.objectContaining({
        persona: 'SOLID',
        startingScope: 'FULL',
        maximumTheoryBurden: 'MEDIUM',
        coveragePercent: 80,
        speedPreset: 'BLITZ_AND_SLOWER',
        ratingTarget: 'MY_PEERS',
      }),
    }));
    expect(suggestions[1]).toEqual(jasmine.objectContaining({
      side: 'BLACK',
      profiledGames: 13,
      strongestCharacter: 'SHARP',
      setup: jasmine.objectContaining({
        persona: 'AGGRESSIVE',
        startingScope: 'FULL',
        maximumTheoryBurden: 'MEDIUM',
        coveragePercent: 80,
      }),
    }));
  });

  it('round-trips one bounded profile suggestion without serializing compatibility-only controls', () => {
    const suggestion = buildRepertoireBuilderProfileSuggestions(profile)[0];
    const params = buildRepertoireBuilderProfileLaunchQueryParams(suggestion);
    const parsed = parseRepertoireBuilderLaunch(
      convertToParamMap(params),
      new Date('2026-07-30T19:00:00.000Z'),
    );

    expect(params['theoryBurden']).toBeUndefined();
    expect(params['coveragePercent']).toBeUndefined();
    expect(parsed.error).toBeNull();
    expect(parsed.context).toEqual(jasmine.objectContaining({
      source: 'PLAYER_PROFILE',
      intent: 'PROFILE_STARTING_POINT',
      side: 'WHITE',
      profiledGames: 16,
      setup: suggestion.setup,
      profileSource: {
        kind: 'PLAYER_PROFILE',
        profileContractVersion: '2026-07-v1',
        profileGeneratedAt: GENERATED_AT,
        classificationVersion: '2026-07-rules-v2',
      },
    }));
    expect(builderLaunchStartingPoint(parsed.context)).toEqual({ kind: 'INITIAL_POSITION' });
    expect(builderLaunchReturnUrl(parsed.context!)).toBe('/progress/profile');
  });

  it('rejects stale profile route state without blocking ordinary Builder setup', () => {
    const suggestion = buildRepertoireBuilderProfileSuggestions(profile)[0];
    const parsed = parseRepertoireBuilderLaunch(
      convertToParamMap(buildRepertoireBuilderProfileLaunchQueryParams(suggestion)),
      new Date('2026-08-01T19:00:00.000Z'),
    );

    expect(parsed.context).toBeNull();
    expect(parsed.error).toContain('expired');
    expect(builderLaunchStartingPoint(parsed.context)).toEqual({ kind: 'INITIAL_POSITION' });
  });

  it('rejects malformed profile provenance and omits insufficient sides', () => {
    const suggestions = buildRepertoireBuilderProfileSuggestions({
      ...profile,
      openingGroups: [openingGroup('WHITE', 4, ['SOLID'], 'LOW')],
    });
    expect(suggestions).toEqual([]);

    const malformed = {
      ...buildRepertoireBuilderProfileLaunchQueryParams(
        buildRepertoireBuilderProfileSuggestions(profile)[0],
      ),
      profileContractVersion: 'unsupported',
    };
    const parsed = parseRepertoireBuilderLaunch(
      convertToParamMap(malformed),
      new Date('2026-07-30T19:00:00.000Z'),
    );
    expect(parsed.context).toBeNull();
    expect(parsed.error).toContain('Chess profile link');
  });
});

function openingGroup(
  side: 'WHITE' | 'BLACK',
  games: number,
  character: PlayerChessProfileOpeningCharacter[],
  theoryBurden: 'LOW' | 'MEDIUM' | 'HIGH',
): PlayerChessProfileOpeningGroup {
  return {
    eco: 'A00',
    name: `${side} sample`,
    userColor: side,
    games,
    analysedGames: games,
    accuracyGames: games,
    wdl: { wins: games, draws: 0, losses: 0 },
    scorePercent: 100,
    openingPositiveRate: 50,
    openingTroubleRate: 10,
    earlyMistakeRate: 5,
    averageAccuracy: 80,
    classification: {
      version: '2026-07-rules-v2',
      source: 'GENERATED_BOOK',
      side,
      soundness: 'SOUND',
      character,
      theoreticalStatus: 'MAINLINE',
      theoryBurden,
      roles: side === 'WHITE' ? ['INITIATOR'] : ['RESPONDER'],
      confidence: 'HIGH',
      matchedRuleIds: ['test-rule'],
    },
  };
}
