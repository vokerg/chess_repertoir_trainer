import {
  freeAnalysisRouteInputFromQuery,
  sameFreeAnalysisRouteInput,
} from './free-analysis-route-query.helpers';

describe('freeAnalysisRouteInputFromQuery', () => {
  it('normalizes game, ply, fen, and move query params', () => {
    const input = freeAnalysisRouteInputFromQuery(
      queryFrom({
        fen: 'startpos',
        gameId: '42',
        ply: '7',
        moves: 'e2e4, e7e5,,g1f3',
      }),
    );

    expect(input).toEqual({
      fen: 'startpos',
      gameId: 42,
      ply: 7,
      moves: ['e2e4', 'e7e5', 'g1f3'],
    });
  });

  it('drops invalid numeric params and blank moves', () => {
    const input = freeAnalysisRouteInputFromQuery(
      queryFrom({
        gameId: '-1',
        ply: 'nope',
        moves: ' , ',
      }),
    );

    expect(input).toEqual({
      fen: null,
      gameId: null,
      ply: null,
      moves: [],
    });
  });
});

describe('sameFreeAnalysisRouteInput', () => {
  it('compares normalized route inputs by value', () => {
    expect(
      sameFreeAnalysisRouteInput(
        { fen: null, gameId: 1, ply: 2, moves: ['e2e4', 'e7e5'] },
        { fen: null, gameId: 1, ply: 2, moves: ['e2e4', 'e7e5'] },
      ),
    ).toBeTrue();

    expect(
      sameFreeAnalysisRouteInput(
        { fen: null, gameId: 1, ply: 2, moves: ['e2e4'] },
        { fen: null, gameId: 1, ply: 2, moves: ['d2d4'] },
      ),
    ).toBeFalse();
  });
});

function queryFrom(values: Record<string, string | undefined>) {
  return {
    get(name: string): string | null {
      return values[name] ?? null;
    },
  };
}
