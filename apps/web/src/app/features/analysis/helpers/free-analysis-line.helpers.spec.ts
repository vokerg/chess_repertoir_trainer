import { buildFreeAnalysisLineTree } from './free-analysis-tree.helpers';

describe('buildFreeAnalysisLineTree', () => {
  it('builds and selects a replayable main line from UCI moves', () => {
    const root = buildFreeAnalysisLineTree(['e2e4', 'e7e5', 'g1f3']);

    expect(root.children[0].node.moveSan).toBe('e4');
    expect(root.children[0].children[0].node.moveSan).toBe('e5');
    expect(root.children[0].children[0].children[0].node.moveSan).toBe('Nf3');
  });

  it('rejects an illegal move in the line', () => {
    expect(() => buildFreeAnalysisLineTree(['e2e5'])).toThrow();
  });
});
