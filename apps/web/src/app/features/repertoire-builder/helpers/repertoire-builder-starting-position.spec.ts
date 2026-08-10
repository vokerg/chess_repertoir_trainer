import {
  repertoireBuilderStartingScopeOptions,
  resolveRepertoireBuilderStartingPosition,
  validateRepertoireBuilderStartingPosition,
} from './repertoire-builder-starting-position';
import { defaultRepertoireBuilderSetup } from './repertoire-builder-target';

const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const AFTER_E4_C5 = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';

describe('repertoire Builder starting position', () => {
  it('keeps full repertoire setup at the initial position', () => {
    expect(resolveRepertoireBuilderStartingPosition(defaultRepertoireBuilderSetup())).toEqual({
      startingFen: 'startpos',
      startingPoint: { kind: 'INITIAL_POSITION' },
    });
  });

  it('resolves common White and Black scope shortcuts to the exact FEN after move one', () => {
    const setup = { ...defaultRepertoireBuilderSetup(), startingScope: 'E4' as const };

    expect(resolveRepertoireBuilderStartingPosition(setup)).toEqual({
      startingFen: AFTER_E4,
      startingPoint: { kind: 'FEN', fen: AFTER_E4 },
    });
    expect(repertoireBuilderStartingScopeOptions('WHITE').find((option) => option.value === 'E4')?.label)
      .toBe('Start with 1.e4');
    expect(repertoireBuilderStartingScopeOptions('BLACK').find((option) => option.value === 'E4')?.label)
      .toBe('Against 1.e4');
  });

  it('accepts a manual move sequence and snapshots its final position', () => {
    const setup = {
      ...defaultRepertoireBuilderSetup(),
      startingScope: 'CUSTOM' as const,
      customStartingPosition: '1. e4 c5',
    };

    expect(resolveRepertoireBuilderStartingPosition(setup)).toEqual({
      startingFen: AFTER_E4_C5,
      startingPoint: { kind: 'FEN', fen: AFTER_E4_C5 },
    });
    expect(validateRepertoireBuilderStartingPosition(setup)).toBeNull();
  });

  it('accepts a four-field FEN and rejects invalid manual input', () => {
    const fenSetup = {
      ...defaultRepertoireBuilderSetup(),
      startingScope: 'CUSTOM' as const,
      customStartingPosition: '8/8/8/8/8/8/4K3/7k w - -',
    };
    expect(resolveRepertoireBuilderStartingPosition(fenSetup).startingFen)
      .toBe('8/8/8/8/8/8/4K3/7k w - - 0 1');

    expect(validateRepertoireBuilderStartingPosition({
      ...fenSetup,
      customStartingPosition: 'definitely not chess',
    })).toBe('Could not read this as FEN, PGN, SAN, or UCI moves.');
  });
});
