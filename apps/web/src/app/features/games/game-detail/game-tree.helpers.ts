import { Chess } from 'chess.js';
import { ImportedGameAnalysisMove, UserColor } from '../data-access/games.models';
import { GameTree, GameTreeNode, PlayedGameMove } from './game-detail.models';

export function parseGamePgn(pgn: string): PlayedGameMove[] {
  if (!pgn.trim()) return [];
  const chess = new Chess();
  chess.loadPgn(pgn);
  return (chess.history({ verbose: true }) as Array<{
    color: string; san: string; from: string; to: string; promotion?: string; before: string; after: string;
  }>).map((move, index) => {
    const plyNumber = index + 1;
    return {
      plyNumber,
      moveNumber: Math.ceil(plyNumber / 2),
      side: move.color === 'b' ? 'BLACK' : 'WHITE',
      san: move.san,
      uci: `${move.from}${move.to}${move.promotion || ''}`,
      fenBefore: move.before,
      fenAfter: move.after,
    };
  });
}

export function buildGameTree(
  moves: PlayedGameMove[],
  userColor: UserColor | null | undefined,
  analysisByPly: Readonly<Record<number, ImportedGameAnalysisMove>>,
): GameTree {
  const startFen = moves[0]?.fenBefore || new Chess().fen();
  const root: GameTreeNode = {
    node: { id: 0, plyNumber: null, moveNumber: null, side: null, moveSan: null, moveUci: null, fenBefore: startFen, fenAfter: startFen, isUserMove: false, source: 'GAME', analysisMove: null },
    children: [],
  };
  let parent = root;
  for (const move of moves) {
    const child: GameTreeNode = {
      node: {
        id: move.plyNumber,
        plyNumber: move.plyNumber,
        moveNumber: move.moveNumber,
        side: move.side,
        moveSan: move.san,
        moveUci: move.uci,
        fenBefore: move.fenBefore,
        fenAfter: move.fenAfter,
        isUserMove: move.side === userColor,
        source: 'GAME',
        analysisMove: analysisByPly[move.plyNumber] || null,
      },
      children: [],
    };
    parent.children = [child];
    parent = child;
  }
  return { root };
}

export function findGameTreeNode(id: number, node?: GameTreeNode | null): GameTreeNode | null {
  if (!node) return null;
  if (node.node.id === id) return node;
  for (const child of node.children) {
    const found = findGameTreeNode(id, child);
    if (found) return found;
  }
  return null;
}

export function findGameTreeParent(id: number, node?: GameTreeNode | null, parent: GameTreeNode | null = null): GameTreeNode | null {
  if (!node) return null;
  if (node.node.id === id) return parent;
  for (const child of node.children) {
    const found = findGameTreeParent(id, child, node);
    if (found) return found;
  }
  return null;
}

export function appendGameTreeChild(root: GameTreeNode, parentId: number, child: GameTreeNode): GameTreeNode {
  if (root.node.id === parentId) return { ...root, children: [...root.children, child] };
  return { ...root, children: root.children.map((current) => appendGameTreeChild(current, parentId, child)) };
}

export function attachGameTreeAnalysis(
  root: GameTreeNode,
  analysisByPly: Readonly<Record<number, ImportedGameAnalysisMove>>,
): GameTreeNode {
  const plyNumber = root.node.plyNumber;
  return {
    ...root,
    node: {
      ...root.node,
      analysisMove: plyNumber === null ? null : analysisByPly[plyNumber] || null,
    },
    children: root.children.map((child) => attachGameTreeAnalysis(child, analysisByPly)),
  };
}
