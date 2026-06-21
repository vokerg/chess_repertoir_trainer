import {
  countLineTreeDescendants,
  findLineTreeNode,
  findLineTreeParent,
  patchLineTreeNode,
} from './line-tree.helpers';
import { LineTreeNode } from '../data-access/lines.models';

describe('line tree helpers', () => {
  const tree: LineTreeNode = {
    node: {
      id: 0,
      lineId: 1,
      parentId: null,
      plyNumber: 0,
      fenBefore: 'startpos',
      fenAfter: 'startpos',
      moveUci: '',
      moveSan: '',
      moveNumber: 0,
      colorToMoveBefore: 'WHITE',
      side: 'WHITE',
      isUserMove: false,
      isCorrectUserMove: false,
      sortOrder: 0,
    },
    children: [
      {
        node: {
          id: 1,
          lineId: 1,
          parentId: null,
          plyNumber: 1,
          fenBefore: 'startpos',
          fenAfter: 'fen-1',
          moveUci: 'e2e4',
          moveSan: 'e4',
          moveNumber: 1,
          colorToMoveBefore: 'WHITE',
          side: 'WHITE',
          isUserMove: true,
          isCorrectUserMove: true,
          sortOrder: 0,
        },
        children: [
          {
            node: {
              id: 2,
              lineId: 1,
              parentId: 1,
              plyNumber: 2,
              fenBefore: 'fen-1',
              fenAfter: 'fen-2',
              moveUci: 'e7e5',
              moveSan: 'e5',
              moveNumber: 1,
              colorToMoveBefore: 'BLACK',
              side: 'BLACK',
              isUserMove: false,
              isCorrectUserMove: false,
              sortOrder: 0,
            },
            children: [],
          },
        ],
      },
    ],
  };

  it('finds nodes and parents by id', () => {
    expect(findLineTreeNode(2, tree)?.node.moveSan).toBe('e5');
    expect(findLineTreeParent(2, tree)?.node.id).toBe(1);
    expect(findLineTreeParent(0, tree)).toBeNull();
  });

  it('counts descendants recursively', () => {
    expect(countLineTreeDescendants(tree)).toBe(2);
    expect(countLineTreeDescendants(tree.children[0])).toBe(1);
  });

  it('patches a node immutably', () => {
    const updated = patchLineTreeNode(tree, 2, { comment: 'Solid reply' });
    expect(updated).not.toBe(tree);
    expect(updated.children[0]).not.toBe(tree.children[0]);
    expect(updated.children[0].children[0].node.comment).toBe('Solid reply');
    expect(tree.children[0].children[0].node.comment).toBeUndefined();
  });
});
