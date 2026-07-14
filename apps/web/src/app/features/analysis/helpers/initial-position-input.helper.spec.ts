import { parseInitialPositionInput } from './initial-position-input.helper';
import { buildFreeAnalysisLineTree } from './free-analysis-tree.helpers';

describe('parseInitialPositionInput', () => {
  it('parses FEN', () => {
    const fen = '8/8/8/8/8/8/4K3/7k w - - 0 1';

    expect(parseInitialPositionInput(fen)).toEqual({
      kind: 'FEN',
      startingFen: fen,
      moves: [],
    });
  });

  it('parses PGN', () => {
    const parsed = parseInitialPositionInput('1. e4 e5 2. Nf3 Nc6');

    expect(parsed.kind).toBe('MOVES');
    expect(parsed.moves).toEqual(['e2e4', 'e7e5', 'g1f3', 'b8c6']);
  });

  it('parses a plain SAN sequence', () => {
    expect(parseInitialPositionInput('d4 d5 c4').moves).toEqual([
      'd2d4',
      'd7d5',
      'c2c4',
    ]);
  });

  it('parses whitespace- and comma-separated UCI moves', () => {
    expect(parseInitialPositionInput('e2e4, e7e5\ng1f3').moves).toEqual([
      'e2e4',
      'e7e5',
      'g1f3',
    ]);
  });

  it('rejects invalid manual input', () => {
    expect(() => parseInitialPositionInput('definitely not chess')).toThrowError(
      'Could not read this as FEN, PGN, SAN, or UCI moves.',
    );
  });

  it('uses a custom starting FEN from PGN and builds LOCAL nodes', () => {
    const startingFen = '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1';
    const parsed = parseInitialPositionInput(
      `[SetUp "1"]\n[FEN "${startingFen}"]\n\n1. e4`,
    );
    const root = buildFreeAnalysisLineTree(parsed.moves, parsed.startingFen);

    expect(parsed.startingFen).toBe(startingFen);
    expect(parsed.moves).toEqual(['e2e4']);
    expect(root.children[0].node.source).toBe('LOCAL');
    expect(root.children[0].node.fenBefore).toBe(startingFen);
  });
});
