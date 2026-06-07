import { Chess } from 'chess.js';
import prisma from '../prisma';
import { touchLineRepertoireUpdatedAt } from '../modules/courses/line-repertoire-timestamp.service';

function colorToMove(chess: Chess): 'WHITE' | 'BLACK' {
  return chess.turn() === 'w' ? 'WHITE' : 'BLACK';
}

function moveToUci(move: any) {
  return `${move.from}${move.to}${move.promotion ?? ''}`;
}

function stripPgnMetadata(pgn: string) {
  return pgn
    .replace(/\r/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/;[^\n]*/g, ' ')
    .replace(/\$\d+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizePgn(pgn: string) {
  const cleaned = stripPgnMetadata(pgn).replace(/\(/g, ' ( ').replace(/\)/g, ' ) ');
  return cleaned
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => !/^\d+\.(\.\.)?$/.test(token))
    .filter((token) => !/^\d+\.\.\.$/.test(token))
    .filter((token) => !['1-0', '0-1', '1/2-1/2', '*'].includes(token));
}

function sortNodes(nodes: any[]) {
  return [...nodes].sort((a, b) => {
    const parentDelta = (a.parentId ?? 0) - (b.parentId ?? 0);
    if (parentDelta !== 0) return parentDelta;
    const sortDelta = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    if (sortDelta !== 0) return sortDelta;
    return a.id - b.id;
  });
}

function exportNode(node: any, childrenByParent: Map<number | null, any[]>): string {
  const children = sortNodes(childrenByParent.get(node.id) ?? []);
  if (!children.length) return '';

  const main = children[0];
  const variations = children.slice(1);
  const turn = node.fenAfter.split(' ')[1];
  const movePrefix = turn === 'w' ? `${Math.ceil((node.plyNumber + 1) / 2)}. ` : '';
  const mainText = `${movePrefix}${main.moveSan}`;
  const continuation = exportNode(main, childrenByParent);
  const variationText = variations
    .map((variation) => {
      const varPrefix =
        turn === 'w'
          ? `${Math.ceil((node.plyNumber + 1) / 2)}. `
          : `${Math.ceil((node.plyNumber + 1) / 2)}... `;
      const body =
        `${varPrefix}${variation.moveSan} ${exportNode(variation, childrenByParent)}`.trim();
      return `(${body})`;
    })
    .join(' ');

  return [mainText, variationText, continuation].filter(Boolean).join(' ').trim();
}

async function createImportedMove(
  line: any,
  parentId: number | null,
  fenBefore: string,
  san: string,
  plyNumber: number,
  sortOrder: number,
) {
  const chess = fenBefore === 'startpos' ? new Chess() : new Chess(fenBefore);
  const colorBefore = colorToMove(chess);
  const move = chess.move(san, { sloppy: true } as any);
  if (!move) throw new Error(`Illegal PGN move '${san}' from ${fenBefore}`);

  const isUserMove = colorBefore === line.sideToTrain;
  const existingCorrectUserMove = isUserMove
    ? await prisma.moveNode.findFirst({
        where: { lineId: line.id, parentId, isUserMove: true, isCorrectUserMove: true },
      })
    : null;

  return prisma.moveNode.create({
    data: {
      lineId: line.id,
      parentId,
      plyNumber,
      fenBefore,
      fenAfter: chess.fen(),
      moveUci: moveToUci(move),
      moveSan: move.san,
      moveNumber: Math.ceil(plyNumber / 2),
      colorToMoveBefore: colorBefore,
      side: colorBefore,
      isUserMove,
      isCorrectUserMove: isUserMove && !existingCorrectUserMove,
      sortOrder,
    },
  });
}

export const PgnService = {
  exportLine: async (lineId: number) => {
    const line = await prisma.line.findUnique({ where: { id: lineId }, include: { moves: true } });
    if (!line) throw new Error('Line not found');

    const childrenByParent = new Map<number | null, any[]>();
    for (const move of line.moves) {
      const key = move.parentId ?? null;
      const list = childrenByParent.get(key) ?? [];
      list.push(move);
      childrenByParent.set(key, list);
    }

    const root = {
      id: 0,
      plyNumber: 0,
      fenAfter: line.startingFen,
    };
    const moves = exportNode(root, childrenByParent);
    return `[Event "${line.name.replace(/"/g, '\\"')}"]\n[Site "Chess Repertoire Trainer"]\n[Result "*"]\n\n${moves} *\n`;
  },

  importLine: async (
    chapterId: number,
    data: { name: string; sideToTrain: string; startingFen?: string; pgn: string },
  ) => {
    const tokens = tokenizePgn(data.pgn);
    if (!tokens.length) throw new Error('No PGN moves found');

    const line = await prisma.line.create({
      data: {
        chapterId,
        name: data.name,
        sideToTrain: data.sideToTrain,
        startingFen: data.startingFen || 'startpos',
      },
    });

    type Frame = {
      parentId: number | null;
      fen: string;
      ply: number;
      sortOrder: number;
      returnTo?: Frame;
    };
    let frame: Frame = { parentId: null, fen: line.startingFen, ply: 1, sortOrder: 0 };
    let lastMoveStart: Frame | null = null;
    const stack: Frame[] = [];

    for (const token of tokens) {
      if (token === '(') {
        if (lastMoveStart) {
          stack.push(frame);
          frame = { ...lastMoveStart, sortOrder: (lastMoveStart.sortOrder ?? 0) + 1 };
        }
        continue;
      }
      if (token === ')') {
        const restored = stack.pop();
        if (restored) frame = restored;
        continue;
      }
      if (/^\d+\.+$/.test(token)) continue;

      const before: Frame = { ...frame };
      const created = await createImportedMove(
        line,
        frame.parentId,
        frame.fen,
        token,
        frame.ply,
        frame.sortOrder,
      );
      lastMoveStart = before;
      frame = {
        parentId: created.id,
        fen: created.fenAfter,
        ply: frame.ply + 1,
        sortOrder: 0,
      };
    }

    await touchLineRepertoireUpdatedAt(prisma, line.id);
    return prisma.line.findUniqueOrThrow({ where: { id: line.id } });
  },
};
