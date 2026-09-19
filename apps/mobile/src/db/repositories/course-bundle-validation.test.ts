import type { MobileCourseBundleDto } from '@chess-trainer/contracts/mobile-sync';
import { describe, expect, it } from 'vitest';
import { validateCourseBundleReferences } from './course-bundle-validation';

const bundle: MobileCourseBundleDto = {
  bundleSchemaVersion: 1,
  courseId: 10,
  contentRevision: 3,
  generatedAt: '2026-07-13T10:00:00.000Z',
  course: { id: 10, name: 'White repertoire', description: null },
  chapters: [{ id: 20, courseId: 10, name: 'Open games', description: null, sortOrder: 0 }],
  lines: [{
    id: 30,
    chapterId: 20,
    name: 'Ruy Lopez',
    sideToTrain: 'WHITE',
    startingFen: 'startpos',
    notes: null,
    tags: ['e4'],
  }],
  moveNodes: [{
    id: 40,
    lineId: 30,
    parentId: null,
    plyNumber: 1,
    fenBefore: 'startpos',
    fenAfter: 'fen-after-e4',
    moveUci: 'e2e4',
    moveSan: 'e4',
    moveNumber: 1,
    colorToMoveBefore: 'WHITE',
    side: 'WHITE',
    isUserMove: true,
    isCorrectUserMove: true,
    sortOrder: 0,
    branchLabel: null,
    branchWeight: null,
    comment: null,
    annotation: null,
  }],
  sublines: [{
    version: 1,
    lineId: 30,
    startingFen: 'startpos',
    sideToTrain: 'WHITE',
    sublineHash: 'hash',
    sublineKeyVersion: 1,
    leafNodeId: 40,
    moves: [{
      nodeId: 40,
      moveUci: 'e2e4',
      moveSan: 'e4',
      fenBefore: 'startpos',
      fenAfter: 'fen-after-e4',
      isUserMove: true,
      comment: null,
      annotation: null,
      branchLabel: null,
    }],
  }],
};

describe('validateCourseBundleReferences', () => {
  it('accepts a consistent bundle', () => {
    expect(() => validateCourseBundleReferences(bundle)).not.toThrow();
  });

  it('rejects a subline whose snapshot differs from its move node', () => {
    const invalid = structuredClone(bundle);
    invalid.sublines[0]!.moves[0]!.fenAfter = 'tampered';
    expect(() => validateCourseBundleReferences(invalid)).toThrow(/snapshot is inconsistent/i);
  });

  it('rejects cross-line parent references', () => {
    const invalid = structuredClone(bundle);
    invalid.lines.push({
      id: 31,
      chapterId: 20,
      name: 'Other line',
      sideToTrain: 'WHITE',
      startingFen: 'startpos',
      notes: null,
      tags: [],
    });
    invalid.moveNodes.push({ ...invalid.moveNodes[0]!, id: 41, lineId: 31, parentId: 40 });
    expect(() => validateCourseBundleReferences(invalid)).toThrow(/invalid parent/i);
  });
});
