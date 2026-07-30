import type { RepertoireBuilderProfileSuggestion } from '../../repertoire-builder/profile-launch';
import { buildPlayerChessProfileBuilderActions } from './player-chess-profile-page.component';

const whiteSuggestion: RepertoireBuilderProfileSuggestion = {
  side: 'WHITE',
  setup: {
    side: 'WHITE',
    speedPreset: 'BLITZ_AND_SLOWER',
    ratingTarget: 'MY_PEERS',
    ratingGroup: null,
    persona: 'SOLID',
    maximumTheoryBurden: 'LOW',
    coveragePercent: 85,
  },
  profileSource: {
    kind: 'PLAYER_PROFILE',
    profileContractVersion: '2026-07-v1',
    profileGeneratedAt: '2026-07-30T18:00:00.000Z',
    classificationVersion: '2026-07-rules-v2',
  },
  profiledGames: 16,
  strongestCharacter: 'SOLID',
  evidenceSummary: '16 profiled white games · Solid intent',
};

describe('Player Chess Profile Builder actions', () => {
  it('renders only available side-specific suggestions', () => {
    const actions = buildPlayerChessProfileBuilderActions([whiteSuggestion], () => undefined);

    expect(actions).toHaveSize(1);
    expect(actions[0].id).toBe('repertoire-start-white');
    expect(actions[0].label).toBe('Build White repertoire · Solid');
  });

  it('passes the immutable selected suggestion to the launch command', () => {
    const launched: RepertoireBuilderProfileSuggestion[] = [];
    const actions = buildPlayerChessProfileBuilderActions(
      [whiteSuggestion],
      (suggestion) => launched.push(suggestion),
    );

    actions[0].run();

    expect(launched).toEqual([whiteSuggestion]);
  });

  it('renders no planned or disabled action when evidence is insufficient', () => {
    expect(buildPlayerChessProfileBuilderActions([], () => undefined)).toEqual([]);
  });
});
