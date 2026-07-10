import { ImportedGameListItem } from '../data-access/games.models';
import { displayTimeControl, gameDateLabel, playerLabel, profileUrl } from './games-table-display';

describe('games table display helpers', () => {
  it('formats structured and raw time controls consistently', () => {
    expect(displayTimeControl(game({ initial: 180, increment: 2 }))).toBe('3+2');
    expect(displayTimeControl(game({ raw: '90+30' }))).toBe('1.5+30');
    expect(displayTimeControl(game({ raw: 'correspondence' }))).toBe('correspondence');
  });

  it('formats game dates and falls back to the game id', () => {
    expect(gameDateLabel({ ...game({}), id: 42 })).toBe('#42');
    expect(gameDateLabel({ ...game({}), endedAt: 'invalid' })).toBe('—');
  });

  it('builds encoded provider profile links', () => {
    expect(profileUrl('LICHESS', 'A B')).toBe('https://lichess.org/@/A%20B');
    expect(profileUrl('CHESS_COM', 'A B')).toBe('https://www.chess.com/member/A%20B');
    expect(profileUrl(null, 'A B')).toBeNull();
  });

  it('formats player names with optional ratings', () => {
    expect(playerLabel({ username: 'player', rating: 1800 })).toBe('player (1800)');
    expect(playerLabel({ username: 'player', rating: null })).toBe('player');
    expect(playerLabel(null)).toBe('Unknown');
  });
});

function game(timeControl: Partial<ImportedGameListItem['timeControl']>): ImportedGameListItem {
  return {
    id: 1,
    accountId: 10,
    provider: 'LICHESS',
    providerGameId: 'game-1',
    providerUrl: null,
    endedAt: null,
    startedAt: null,
    speedCategory: null,
    rated: null,
    variant: null,
    timeControl: { raw: null, initial: null, increment: null, ...timeControl },
    white: { username: null, rating: null },
    black: { username: null, rating: null },
    userColor: null,
    opponentUsername: null,
    result: null,
    resultForUser: null,
    status: null,
    opening: { eco: null, name: null },
    tagCodes: [],
    tags: [],
    plyIndex: { status: 'NOT_INDEXED', indexedAt: null, error: null },
    analysis: emptyAnalysis(),
  };
}

function emptyAnalysis(): ImportedGameListItem['analysis'] {
  return {
    status: 'NOT_ANALYZED',
    runId: null,
    depth: null,
    completedAt: null,
    createdAt: null,
    whiteAccuracy: null,
    blackAccuracy: null,
    userAccuracy: null,
    summary: null,
    criticalMoveCount: null,
  };
}
