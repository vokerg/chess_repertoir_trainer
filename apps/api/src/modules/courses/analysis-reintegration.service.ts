import { Prisma } from '@prisma/client';
import {
  AnalysisMergeMove,
  normalizeFenForPosition,
  previewChapterReintegration,
  previewCreateNewLine,
  previewMergeIntoLine,
  RepertoireColor,
  RepertoireLineInput,
} from 'chess-domain';
import prisma from '../../prisma';
import {
  createLine,
  getChapterLinesWithMoves,
  getChapterWithCourse,
  getCourseLinesWithMoves,
  getLineWithMoves,
} from './courses.repository.prisma';
import { createMoveNodeInTransaction } from './courses.service';
import {
  ApplyAnalysisReintegrationInput,
  PreviewAnalysisReintegrationInput,
} from './analysis-reintegration.schemas';

export class AnalysisReintegrationError extends Error {
  constructor(message: string, readonly status: number, readonly conflicts?: unknown[]) {
    super(message);
  }
}

export const AnalysisReintegrationService = {
  previewChapter: async (chapterId: number, input: PreviewAnalysisReintegrationInput) => {
    const chapter = await getChapterWithCourse(chapterId);
    if (!chapter) throw new AnalysisReintegrationError('Chapter not found', 404);
    const [chapterLines, courseLines] = await Promise.all([
      getChapterLinesWithMoves(chapterId),
      getCourseLinesWithMoves(chapter.courseId),
    ]);
    return previewChapterReintegration({ analysisTree: input.analysisTree,
      chapterLines: chapterLines.map(toRepertoireLineInput),
      courseLines: courseLines.map(toRepertoireLineInput),
      newLineName: input.newLineName, newLineSideToTrain: input.newLineSideToTrain });
  },

  applyToChapter: async (chapterId: number, input: ApplyAnalysisReintegrationInput) =>
    prisma.$transaction(async (tx) => {
      const chapter = await getChapterWithCourse(chapterId, tx);
      if (!chapter) throw new AnalysisReintegrationError('Chapter not found', 404);
      const courseLines = (await getCourseLinesWithMoves(chapter.courseId, tx)).map(toRepertoireLineInput);

      if (input.target.kind === 'NEW_LINE') {
        const preview = previewCreateNewLine({ analysisTree: input.analysisTree,
          lineName: input.target.name, sideToTrain: input.target.sideToTrain, courseLines });
        if (!input.target.allowConflicts) rejectConflicts(preview.counts.conflictingMoves, preview.conflicts);
        const line = await createLine(chapterId, { name: input.target.name,
          sideToTrain: input.target.sideToTrain, startingFen: input.analysisTree.rootFen }, tx);
        const counts = await applyChildren(tx, line.id, null, input.analysisTree.children, []);
        return { targetKind: 'NEW_LINE' as const, lineId: line.id, lineName: line.name,
          createdMoves: counts.created, reusedMoves: counts.reused };
      }

      const selected = await getLineWithMoves(input.target.lineId, tx);
      if (!selected) throw new AnalysisReintegrationError('Line not found', 404);
      if (selected.chapterId !== chapterId || selected.chapter.courseId !== chapter.courseId) {
        throw new AnalysisReintegrationError('Selected line does not belong to this chapter.', 409);
      }
      const line = toRepertoireLineInput(selected);
      const anchor = resolveAnchor(line, input.target.anchor);
      const preview = previewMergeIntoLine({ analysisTree: input.analysisTree, line, anchor, courseLines });
      rejectConflicts(preview.counts.conflictingMoves, preview.conflicts);
      const counts = await applyChildren(tx, line.id, anchor.nodeId, input.analysisTree.children,
        selected.moves.map((node) => ({ id: node.id, parentId: node.parentId, moveUci: node.moveUci })));
      return { targetKind: 'EXISTING_LINE' as const, lineId: line.id, lineName: line.name,
        createdMoves: counts.created, reusedMoves: counts.reused };
    }),
};

function resolveAnchor(line: RepertoireLineInput, submitted: {
  kind: 'LINE_START' | 'NODE'; nodeId: number | null; normalizedFen: string;
}) {
  if (submitted.kind === 'LINE_START') {
    if (submitted.nodeId !== null || normalizeFenForPosition(line.startingFen) !== submitted.normalizedFen) {
      throw new AnalysisReintegrationError('Analysis reintegration anchor is stale or invalid.', 409);
    }
    return { kind: 'LINE_START' as const, lineId: line.id, lineName: line.name, nodeId: null,
      fen: line.startingFen, normalizedFen: submitted.normalizedFen, moveSequenceSan: null };
  }
  const node = submitted.nodeId === null ? undefined : line.moves.find((move) => move.id === submitted.nodeId);
  if (!node || normalizeFenForPosition(node.fenAfter) !== submitted.normalizedFen) {
    throw new AnalysisReintegrationError('Analysis reintegration anchor is stale or invalid.', 409);
  }
  return { kind: 'NODE' as const, lineId: line.id, lineName: line.name, nodeId: node.id,
    fen: node.fenAfter, normalizedFen: submitted.normalizedFen, moveSequenceSan: null };
}

async function applyChildren(tx: Prisma.TransactionClient, lineId: number, parentId: number | null,
  children: AnalysisMergeMove[], knownNodes: Array<{ id: number; parentId: number | null; moveUci: string }>) {
  let created = 0;
  let reused = 0;
  for (const child of children) {
    let node = knownNodes.find((item) => item.parentId === parentId && item.moveUci === child.moveUci);
    if (node) {
      reused += 1;
    } else {
      const createdNode = await createMoveNodeInTransaction(tx, lineId, { parentId, moveUci: child.moveUci });
      node = { id: createdNode.id, parentId: createdNode.parentId, moveUci: createdNode.moveUci };
      knownNodes.push(node);
      created += 1;
    }
    const nested = await applyChildren(tx, lineId, node.id, child.children, knownNodes);
    created += nested.created;
    reused += nested.reused;
  }
  return { created, reused };
}

function rejectConflicts(count: number, conflicts: unknown[]): void {
  if (count > 0) throw new AnalysisReintegrationError('Analysis tree has repertoire conflicts.', 409, conflicts);
}

function asRepertoireColor(value: string): RepertoireColor {
  if (value === 'WHITE' || value === 'BLACK') return value;
  throw new Error(`Invalid repertoire side to train: ${value}`);
}

function toRepertoireLineInput(line: any): RepertoireLineInput {
  return { id: line.id, name: line.name, chapterId: line.chapterId,
    sideToTrain: asRepertoireColor(line.sideToTrain), startingFen: line.startingFen || 'startpos',
    moves: [...line.moves].sort(sortMoveNodesStable).map((node: any) => ({ id: node.id,
      lineId: node.lineId, parentId: node.parentId, plyNumber: node.plyNumber,
      fenBefore: node.fenBefore, fenAfter: node.fenAfter, moveUci: node.moveUci,
      moveSan: node.moveSan, colorToMoveBefore: node.colorToMoveBefore,
      isUserMove: node.isUserMove, isCorrectUserMove: node.isCorrectUserMove })) };
}

function sortMoveNodesStable(a: any, b: any): number {
  if (a.parentId === null && b.parentId !== null) return -1;
  if (a.parentId !== null && b.parentId === null) return 1;
  return (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.plyNumber - b.plyNumber || a.id - b.id;
}
