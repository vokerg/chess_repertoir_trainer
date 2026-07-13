import type { MobileCourseBundleDto } from '@chess-trainer/contracts/mobile-sync';

export function validateCourseBundleReferences(bundle: MobileCourseBundleDto): void {
  if (bundle.course.id !== bundle.courseId) {
    throw new Error('The bundle course identity is inconsistent.');
  }

  const chapterIds = new Set(bundle.chapters.map((chapter) => chapter.id));
  const linesById = new Map(bundle.lines.map((line) => [line.id, line]));
  const nodesById = new Map(bundle.moveNodes.map((node) => [node.id, node]));

  for (const chapter of bundle.chapters) {
    if (chapter.courseId !== bundle.courseId) {
      throw new Error(`Chapter ${chapter.id} belongs to a different course.`);
    }
  }

  for (const line of bundle.lines) {
    if (!chapterIds.has(line.chapterId)) {
      throw new Error(`Line ${line.id} references missing chapter ${line.chapterId}.`);
    }
  }

  for (const node of bundle.moveNodes) {
    if (!linesById.has(node.lineId)) {
      throw new Error(`Move node ${node.id} references missing line ${node.lineId}.`);
    }
    if (node.parentId !== null) {
      const parent = nodesById.get(node.parentId);
      if (!parent || parent.lineId !== node.lineId) {
        throw new Error(`Move node ${node.id} has an invalid parent.`);
      }
    }
  }

  for (const subline of bundle.sublines) {
    const line = linesById.get(subline.lineId);
    if (!line) throw new Error(`Subline ${subline.sublineHash} references a missing line.`);
    if (line.startingFen !== subline.startingFen || line.sideToTrain !== subline.sideToTrain) {
      throw new Error(`Subline ${subline.sublineHash} does not match its line metadata.`);
    }
    if (subline.moves.length === 0 || subline.moves.at(-1)?.nodeId !== subline.leafNodeId) {
      throw new Error(`Subline ${subline.sublineHash} has an invalid leaf node.`);
    }
    for (const move of subline.moves) {
      const node = nodesById.get(move.nodeId);
      if (!node || node.lineId !== subline.lineId) {
        throw new Error(`Subline ${subline.sublineHash} references an invalid move node.`);
      }
      if (
        node.moveUci !== move.moveUci
        || node.moveSan !== move.moveSan
        || node.fenBefore !== move.fenBefore
        || node.fenAfter !== move.fenAfter
        || node.isUserMove !== move.isUserMove
      ) {
        throw new Error(`Subline ${subline.sublineHash} move snapshot is inconsistent.`);
      }
    }
  }
}
