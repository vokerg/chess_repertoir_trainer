import { findLineAnchors, type RepertoireLineInput } from 'chess-domain';
import type { CourseReviewLineAnchor } from './repertoire-coverage.types';

export function findCourseReviewLineAnchors(
  normalizedFen: string,
  lines: RepertoireLineInput[],
): CourseReviewLineAnchor[] {
  const lineById = new Map(lines.map((line) => [line.id, line]));
  const fullFen = normalizedFen.trim().split(/\s+/).length === 4
    ? `${normalizedFen.trim()} 0 1`
    : normalizedFen.trim();

  return findLineAnchors(fullFen, lines)
    .flatMap((anchor): CourseReviewLineAnchor[] => {
      const line = lineById.get(anchor.lineId);
      if (!line?.chapterId) return [];
      return [{
        kind: anchor.kind,
        lineId: anchor.lineId,
        lineName: anchor.lineName,
        chapterId: line.chapterId,
        nodeId: anchor.nodeId,
        moveSequenceSan: anchor.moveSequenceSan,
      }];
    })
    .sort((left, right) => (
      left.chapterId - right.chapterId
      || left.lineId - right.lineId
      || anchorOrder(left.kind) - anchorOrder(right.kind)
      || (left.nodeId ?? 0) - (right.nodeId ?? 0)
    ));
}

function anchorOrder(kind: CourseReviewLineAnchor['kind']): number {
  return kind === 'LINE_START' ? 0 : 1;
}
