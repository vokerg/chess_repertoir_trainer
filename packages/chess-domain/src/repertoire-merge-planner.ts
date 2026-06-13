import { Chess } from 'chess.js';
import { normalizeFenForPosition } from './position';
import {
  buildRepertoireGraph,
  formatPathToNode,
  RepertoireColor,
  RepertoireLineInput,
  RepertoireMoveInput,
  sideToMoveFromFen,
} from './repertoire-graph';

export interface AnalysisMergeTree { rootFen: string; children: AnalysisMergeMove[]; }
export interface AnalysisMergeMove { moveUci: string; children: AnalysisMergeMove[]; }
export interface LineAnchor {
  kind: 'LINE_START' | 'NODE'; lineId: number; lineName: string; nodeId: number | null;
  fen: string; normalizedFen: string; moveSequenceSan: string | null;
}
export interface MergePreviewMove {
  moveUci: string; moveSan: string | null; fenBefore: string; fenAfter: string;
  normalizedFenBefore: string; status: 'REUSED' | 'CREATES' | 'CONFLICT';
  existingNodeId: number | null; reason: string | null; children: MergePreviewMove[];
}
export interface MergePreviewConflict {
  normalizedFenBefore: string; sideToMove: RepertoireColor; proposedMoveUci: string;
  proposedMoveSan: string | null;
  existingMoves: Array<{ moveUci: string; moveSan: string; lineRefs: Array<{
    lineId: number; lineName: string; nodeId: number | null; moveSequenceSan?: string | null;
  }>; }>;
}
export interface MergePreviewCounts {
  reusedMoves: number; createdMoves: number; conflictingMoves: number; totalAnalysisMoves: number;
}
export interface LineMergeCandidate {
  lineId: number; lineName: string; sideToTrain: RepertoireColor; anchor: LineAnchor;
  counts: MergePreviewCounts; conflicts: MergePreviewConflict[]; warnings: string[];
  previewTree: MergePreviewMove[];
}
export interface ChapterMergePreview {
  analysisRootFen: string; analysisRootNormalizedFen: string; candidates: LineMergeCandidate[];
  newLine: { allowed: boolean; counts: MergePreviewCounts; conflicts: MergePreviewConflict[];
    warnings: string[]; previewTree: MergePreviewMove[]; };
}

export function findLineAnchors(analysisRootFen: string, lines: RepertoireLineInput[]): LineAnchor[] {
  const rootKey = normalizeFenForPosition(analysisRootFen);
  const anchors: LineAnchor[] = [];
  for (const line of lines) {
    if (normalizeFenForPosition(line.startingFen) === rootKey) {
      anchors.push({ kind: 'LINE_START', lineId: line.id, lineName: line.name, nodeId: null,
        fen: line.startingFen, normalizedFen: rootKey, moveSequenceSan: null });
    }
    for (const node of line.moves) {
      if (normalizeFenForPosition(node.fenAfter) === rootKey) {
        anchors.push({ kind: 'NODE', lineId: line.id, lineName: line.name, nodeId: node.id,
          fen: node.fenAfter, normalizedFen: rootKey,
          moveSequenceSan: formatPathToNode(line.moves, node.id) });
      }
    }
  }
  return anchors;
}

export function previewMergeIntoLine(input: {
  analysisTree: AnalysisMergeTree; line: RepertoireLineInput; anchor: LineAnchor;
  courseLines: RepertoireLineInput[];
}): LineMergeCandidate {
  const context = createPreviewContext(input.line, input.courseLines);
  const previewTree = previewChildren(input.analysisTree.children, input.anchor.fen,
    input.anchor.kind === 'LINE_START' ? 'root' : input.anchor.nodeId!, context);
  finalizeInternalConflicts(context);
  return { lineId: input.line.id, lineName: input.line.name, sideToTrain: input.line.sideToTrain,
    anchor: input.anchor, counts: countPreview(previewTree), conflicts: context.conflicts,
    warnings: context.warnings, previewTree };
}

export function previewCreateNewLine(input: {
  analysisTree: AnalysisMergeTree; lineName: string; sideToTrain: RepertoireColor;
  syntheticLineId?: number; courseLines: RepertoireLineInput[];
}): ChapterMergePreview['newLine'] {
  const line: RepertoireLineInput = { id: input.syntheticLineId ?? -1, name: input.lineName,
    sideToTrain: input.sideToTrain, startingFen: input.analysisTree.rootFen, moves: [] };
  const context = createPreviewContext(line, input.courseLines);
  const previewTree = previewChildren(input.analysisTree.children, input.analysisTree.rootFen,
    'root', context);
  finalizeInternalConflicts(context);
  const counts = countPreview(previewTree);
  return { allowed: counts.conflictingMoves === 0, counts, conflicts: context.conflicts,
    warnings: context.warnings, previewTree };
}

export function previewChapterReintegration(input: {
  analysisTree: AnalysisMergeTree; chapterLines: RepertoireLineInput[];
  courseLines: RepertoireLineInput[]; newLineSideToTrain?: RepertoireColor; newLineName?: string;
}): ChapterMergePreview {
  const anchors = findLineAnchors(input.analysisTree.rootFen, input.chapterLines);
  const candidates = anchors.map((anchor) => previewMergeIntoLine({
    analysisTree: input.analysisTree,
    line: input.chapterLines.find((line) => line.id === anchor.lineId)!,
    anchor,
    courseLines: input.courseLines,
  }));
  const maxReusedMoves = Math.max(0, ...candidates.map((candidate) => candidate.counts.reusedMoves));
  return {
    analysisRootFen: input.analysisTree.rootFen,
    analysisRootNormalizedFen: normalizeFenForPosition(input.analysisTree.rootFen),
    candidates: maxReusedMoves === 0
      ? candidates
      : candidates.filter((candidate) => candidate.counts.reusedMoves === maxReusedMoves),
    newLine: input.newLineSideToTrain
      ? previewCreateNewLine({ analysisTree: input.analysisTree,
          lineName: input.newLineName?.trim() || 'New analysis line',
          sideToTrain: input.newLineSideToTrain, courseLines: input.courseLines })
      : emptyNewLinePreview(input.analysisTree),
  };
}

type ParentKey = number | 'root';
interface PreviewContext {
  line: RepertoireLineInput;
  childrenByParent: Map<ParentKey, RepertoireMoveInput[]>;
  courseGraph: ReturnType<typeof buildRepertoireGraph>;
  conflicts: MergePreviewConflict[];
  warnings: string[];
  proposed: Map<string, Array<{ moveUci: string; moveSan: string | null; preview: MergePreviewMove }>>;
}

function createPreviewContext(line: RepertoireLineInput, courseLines: RepertoireLineInput[]): PreviewContext {
  const childrenByParent = new Map<ParentKey, RepertoireMoveInput[]>();
  for (const node of line.moves) {
    const key = node.parentId ?? 'root';
    childrenByParent.set(key, [...(childrenByParent.get(key) ?? []), node]);
  }
  return { line, childrenByParent, courseGraph: buildRepertoireGraph(courseLines), conflicts: [],
    warnings: [], proposed: new Map() };
}

function previewChildren(analysisChildren: AnalysisMergeMove[], currentFen: string,
  concreteParent: ParentKey | null, context: PreviewContext): MergePreviewMove[] {
  return analysisChildren.map((analysisChild) => {
    const normalizedFenBefore = normalizeFenForPosition(currentFen);
    const chess = currentFen === 'startpos' ? new Chess() : new Chess(currentFen);
    let move: ReturnType<Chess['move']> | null;
    try { move = chess.move(parseUci(analysisChild.moveUci)); } catch { move = null; }
    if (!move) {
      const preview: MergePreviewMove = { moveUci: analysisChild.moveUci, moveSan: null,
        fenBefore: currentFen, fenAfter: currentFen, normalizedFenBefore, status: 'CONFLICT',
        existingNodeId: null, reason: 'Illegal move from this position.', children: [] };
      context.warnings.push(`Illegal move ${analysisChild.moveUci} from ${normalizedFenBefore}.`);
      return preview;
    }

    const existing = concreteParent === null ? undefined
      : context.childrenByParent.get(concreteParent)?.find((node) => node.moveUci === analysisChild.moveUci);
    const fenAfter = existing?.fenAfter ?? chess.fen();
    const preview: MergePreviewMove = { moveUci: analysisChild.moveUci,
      moveSan: existing?.moveSan ?? move.san, fenBefore: existing?.fenBefore ?? currentFen,
      fenAfter, normalizedFenBefore, status: existing ? 'REUSED' : 'CREATES',
      existingNodeId: existing?.id ?? null, reason: null, children: [] };

    if (sideToMoveFromFen(currentFen) === context.line.sideToTrain) {
      registerProposed(normalizedFenBefore, preview, context);
      if (!existing) detectCourseConflict(preview, context);
    }
    preview.children = previewChildren(analysisChild.children, fenAfter, existing?.id ?? null, context);
    return preview;
  });
}

function detectCourseConflict(preview: MergePreviewMove, context: PreviewContext): void {
  const position = context.courseGraph.positions.get(preview.normalizedFenBefore);
  if (!position || position.userMoves.size === 0 || position.userMoves.has(preview.moveUci)) return;
  preview.status = 'CONFLICT';
  preview.reason = 'Different trained-side move already exists in this course.';
  addConflict(context, preview, [...position.userMoves.values()].map((move) => ({
    moveUci: move.moveUci, moveSan: move.moveSan, lineRefs: move.lineRefs,
  })));
}

function registerProposed(key: string, preview: MergePreviewMove, context: PreviewContext): void {
  const proposed = context.proposed.get(key) ?? [];
  proposed.push({ moveUci: preview.moveUci, moveSan: preview.moveSan, preview });
  context.proposed.set(key, proposed);
}

function finalizeInternalConflicts(context: PreviewContext): void {
  for (const [normalizedFenBefore, proposals] of context.proposed) {
    const moves = new Map(proposals.map((item) => [item.moveUci, item]));
    if (moves.size <= 1) continue;
    for (const item of proposals) {
      item.preview.status = 'CONFLICT';
      item.preview.reason = 'Analysis tree proposes different trained-side moves from this position.';
      addConflict(context, item.preview, [...moves.values()]
        .filter((other) => other.moveUci !== item.moveUci)
        .map((other) => ({ moveUci: other.moveUci, moveSan: other.moveSan ?? other.moveUci,
          lineRefs: [] })));
    }
  }
}

function addConflict(context: PreviewContext, preview: MergePreviewMove,
  existingMoves: MergePreviewConflict['existingMoves']): void {
  if (context.conflicts.some((item) => item.normalizedFenBefore === preview.normalizedFenBefore
    && item.proposedMoveUci === preview.moveUci)) return;
  context.conflicts.push({ normalizedFenBefore: preview.normalizedFenBefore,
    sideToMove: context.line.sideToTrain, proposedMoveUci: preview.moveUci,
    proposedMoveSan: preview.moveSan, existingMoves });
}

function countPreview(tree: MergePreviewMove[]): MergePreviewCounts {
  const counts: MergePreviewCounts = { reusedMoves: 0, createdMoves: 0, conflictingMoves: 0,
    totalAnalysisMoves: 0 };
  const visit = (moves: MergePreviewMove[]) => moves.forEach((move) => {
    counts.totalAnalysisMoves += 1;
    if (move.status === 'REUSED') counts.reusedMoves += 1;
    else if (move.status === 'CREATES') counts.createdMoves += 1;
    else counts.conflictingMoves += 1;
    visit(move.children);
  });
  visit(tree);
  return counts;
}

function emptyNewLinePreview(tree: AnalysisMergeTree): ChapterMergePreview['newLine'] {
  const totalAnalysisMoves = countAnalysisMoves(tree.children);
  return { allowed: false, counts: { reusedMoves: 0, createdMoves: totalAnalysisMoves,
    conflictingMoves: 0, totalAnalysisMoves }, conflicts: [],
    warnings: ['Select a side to train to preview a new line.'], previewTree: [] };
}

function countAnalysisMoves(moves: AnalysisMergeMove[]): number {
  return moves.reduce((sum, move) => sum + 1 + countAnalysisMoves(move.children), 0);
}

function parseUci(moveUci: string): { from: string; to: string; promotion?: string } {
  return { from: moveUci.slice(0, 2), to: moveUci.slice(2, 4),
    promotion: moveUci.length === 5 ? moveUci[4] : undefined };
}
