import assert from 'node:assert/strict';
import { newCourseRepertoireTargetExample } from '@chess-trainer/contracts/repertoire-target';
import prismaModule from '../../dist/prisma.js';
import {
  AnalysisReintegrationError,
  applyAnalysisReintegrationInTransaction,
} from '../../dist/modules/courses/analysis-reintegration.service.js';
import { BuilderCourseReintegrationService } from '../../dist/modules/courses/builder-course-reintegration.service.js';
import {
  ChapterService,
  CourseService,
  LineService,
  MoveNodeService,
} from '../../dist/modules/courses/courses.service.js';

const prisma = prismaModule.default;
let userId;
let otherUserId;

function draft(ownerId, moves, sessionId = 'builder-course-db') {
  const treeMoves = moves.reduceRight((children, moveUci) => [{ moveUci, children }], []);
  return {
    draftVersion: '2026-07-v1',
    sessionModelVersion: '2026-07-v1',
    sessionId,
    ownerId: String(ownerId),
    sessionRevision: moves.length + 1,
    sessionLifecycle: 'COMPLETED',
    targetRevision: 1,
    targetContractVersion: newCourseRepertoireTargetExample.contractVersion,
    targetId: newCourseRepertoireTargetExample.targetId,
    targetCapturedAt: newCourseRepertoireTargetExample.createdAt,
    target: newCourseRepertoireTargetExample,
    repertoireSide: 'WHITE',
    startingFen: 'startpos',
    analysisTree: { rootFen: 'startpos', children: treeMoves },
    materializedDecisionCount: moves.length,
    materializedMoveCount: moves.length,
    transpositionLeafCount: 0,
    excludedBranches: [],
  };
}

async function revision(courseId) {
  return (await prisma.course.findUniqueOrThrow({ where: { id: courseId } })).contentRevision;
}

try {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const user = await prisma.appUser.create({
    data: { authProvider: 'test', authSubject: `builder-course-${suffix}` },
  });
  const other = await prisma.appUser.create({
    data: { authProvider: 'test', authSubject: `builder-course-other-${suffix}` },
  });
  userId = user.id;
  otherUserId = other.id;

  const course = await CourseService.create(userId, { name: 'Builder materialization' });
  const chapter = await ChapterService.create(userId, course.id, { name: 'Main' });
  const newLineDraft = draft(userId, ['e2e4', 'e7e5']);
  const beforeNewLine = await revision(course.id);

  const newLinePreview = await BuilderCourseReintegrationService.previewChapter(userId, chapter.id, {
    contractVersion: '2026-07-v1',
    draft: newLineDraft,
    newLineName: 'Builder line',
  });
  assert.equal(newLinePreview.newLine.status, 'CREATES');
  assert.equal(newLinePreview.newLine.allowed, true);
  assert.equal(newLinePreview.newLine.counts.createdMoves, 2);

  const created = await BuilderCourseReintegrationService.applyToChapter(userId, chapter.id, {
    contractVersion: '2026-07-v1',
    draft: newLineDraft,
    newLineName: 'Builder line',
    previewToken: newLinePreview.previewToken,
    target: { kind: 'NEW_LINE', name: 'Builder line' },
  });
  assert.equal(created.createdMoves, 2);
  assert.equal(created.reusedMoves, 0);
  assert.equal(created.idempotent, false);
  assert.equal(await revision(course.id), beforeNewLine + 1);
  assert.equal(await prisma.moveNode.count({ where: { lineId: created.lineId } }), 2);

  await assert.rejects(
    BuilderCourseReintegrationService.applyToChapter(userId, chapter.id, {
      contractVersion: '2026-07-v1',
      draft: newLineDraft,
      newLineName: 'Builder line',
      previewToken: newLinePreview.previewToken,
      target: { kind: 'NEW_LINE', name: 'Builder line' },
    }),
    (error) => error instanceof AnalysisReintegrationError && error.status === 409,
  );

  const repeatedPreview = await BuilderCourseReintegrationService.previewChapter(userId, chapter.id, {
    contractVersion: '2026-07-v1',
    draft: newLineDraft,
    newLineName: 'Builder line',
  });
  assert.equal(repeatedPreview.newLine.status, 'REUSES_EXISTING_LINE');
  assert.equal(repeatedPreview.newLine.equivalentLine.lineId, created.lineId);
  const beforeRepeated = await revision(course.id);
  const repeated = await BuilderCourseReintegrationService.applyToChapter(userId, chapter.id, {
    contractVersion: '2026-07-v1',
    draft: newLineDraft,
    newLineName: 'Builder line',
    previewToken: repeatedPreview.previewToken,
    target: { kind: 'NEW_LINE', name: 'Builder line' },
  });
  assert.equal(repeated.idempotent, true);
  assert.equal(repeated.lineId, created.lineId);
  assert.equal(await revision(course.id), beforeRepeated);

  await assert.rejects(
    BuilderCourseReintegrationService.previewChapter(userId, chapter.id, {
      contractVersion: '2026-07-v1',
      draft: { ...newLineDraft, ownerId: String(otherUserId) },
      newLineName: 'Wrong owner',
    }),
    (error) => error instanceof AnalysisReintegrationError && error.status === 403,
  );
  await assert.rejects(
    BuilderCourseReintegrationService.previewChapter(otherUserId, chapter.id, {
      contractVersion: '2026-07-v1',
      draft: draft(otherUserId, ['e2e4'], 'other-session'),
      newLineName: 'Not owned',
    }),
    (error) => error instanceof AnalysisReintegrationError && error.status === 404,
  );

  const mergeCourse = await CourseService.create(userId, { name: 'Merge target' });
  const mergeChapter = await ChapterService.create(userId, mergeCourse.id, { name: 'Main' });
  const mergeLine = await LineService.create(userId, mergeChapter.id, {
    name: 'Existing line',
    sideToTrain: 'WHITE',
    startingFen: 'startpos',
  });
  await MoveNodeService.create(userId, mergeLine.id, { moveUci: 'e2e4' });
  const mergeDraft = draft(userId, ['e2e4', 'e7e5'], 'merge-session');
  const mergePreview = await BuilderCourseReintegrationService.previewChapter(userId, mergeChapter.id, {
    contractVersion: '2026-07-v1',
    draft: mergeDraft,
    newLineName: 'Alternative',
  });
  const mergeCandidate = mergePreview.candidates.find((candidate) => candidate.lineId === mergeLine.id);
  assert.ok(mergeCandidate);
  assert.equal(mergeCandidate.counts.reusedMoves, 1);
  assert.equal(mergeCandidate.counts.createdMoves, 1);
  const beforeMerge = await revision(mergeCourse.id);
  const merged = await BuilderCourseReintegrationService.applyToChapter(userId, mergeChapter.id, {
    contractVersion: '2026-07-v1',
    draft: mergeDraft,
    newLineName: 'Alternative',
    previewToken: mergePreview.previewToken,
    target: {
      kind: 'EXISTING_LINE',
      lineId: mergeCandidate.lineId,
      anchor: {
        kind: mergeCandidate.anchor.kind,
        nodeId: mergeCandidate.anchor.nodeId,
        normalizedFen: mergeCandidate.anchor.normalizedFen,
      },
    },
  });
  assert.equal(merged.createdMoves, 1);
  assert.equal(merged.reusedMoves, 1);
  assert.equal(await revision(mergeCourse.id), beforeMerge + 1);

  const mergeAgainPreview = await BuilderCourseReintegrationService.previewChapter(userId, mergeChapter.id, {
    contractVersion: '2026-07-v1',
    draft: mergeDraft,
    newLineName: 'Alternative',
  });
  const mergeAgainCandidate = mergeAgainPreview.candidates.find((candidate) => candidate.lineId === mergeLine.id);
  assert.ok(mergeAgainCandidate);
  const beforeMergeAgain = await revision(mergeCourse.id);
  const mergedAgain = await BuilderCourseReintegrationService.applyToChapter(userId, mergeChapter.id, {
    contractVersion: '2026-07-v1',
    draft: mergeDraft,
    newLineName: 'Alternative',
    previewToken: mergeAgainPreview.previewToken,
    target: {
      kind: 'EXISTING_LINE',
      lineId: mergeAgainCandidate.lineId,
      anchor: {
        kind: mergeAgainCandidate.anchor.kind,
        nodeId: mergeAgainCandidate.anchor.nodeId,
        normalizedFen: mergeAgainCandidate.anchor.normalizedFen,
      },
    },
  });
  assert.equal(mergedAgain.idempotent, true);
  assert.equal(mergedAgain.createdMoves, 0);
  assert.equal(await revision(mergeCourse.id), beforeMergeAgain);

  const conflictCourse = await CourseService.create(userId, { name: 'Conflict target' });
  const conflictChapter = await ChapterService.create(userId, conflictCourse.id, { name: 'Main' });
  const conflictLine = await LineService.create(userId, conflictChapter.id, {
    name: 'Only move', sideToTrain: 'WHITE', startingFen: 'startpos',
  });
  await MoveNodeService.create(userId, conflictLine.id, { moveUci: 'c2c4' });
  const conflictDraft = draft(userId, ['d2d4'], 'conflict-session');
  const conflictPreview = await BuilderCourseReintegrationService.previewChapter(userId, conflictChapter.id, {
    contractVersion: '2026-07-v1',
    draft: conflictDraft,
    newLineName: 'Conflicting line',
  });
  assert.equal(conflictPreview.newLine.allowed, false);
  assert.equal(conflictPreview.newLine.counts.conflictingMoves, 1);
  const conflictLineCount = await prisma.line.count({ where: { chapterId: conflictChapter.id } });
  await assert.rejects(
    BuilderCourseReintegrationService.applyToChapter(userId, conflictChapter.id, {
      contractVersion: '2026-07-v1',
      draft: conflictDraft,
      newLineName: 'Conflicting line',
      previewToken: conflictPreview.previewToken,
      target: { kind: 'NEW_LINE', name: 'Conflicting line' },
    }),
    (error) => error instanceof AnalysisReintegrationError && error.status === 409,
  );
  assert.equal(await prisma.line.count({ where: { chapterId: conflictChapter.id } }), conflictLineCount);

  const rollbackCourse = await CourseService.create(userId, { name: 'Rollback target' });
  const rollbackChapter = await ChapterService.create(userId, rollbackCourse.id, { name: 'Main' });
  const rollbackRevision = await revision(rollbackCourse.id);
  await assert.rejects(prisma.$transaction(async (tx) => {
    await applyAnalysisReintegrationInTransaction(tx, userId, rollbackChapter.id, {
      analysisTree: { rootFen: 'startpos', children: [{ moveUci: 'g1f3', children: [] }] },
      target: {
        kind: 'NEW_LINE',
        name: 'Rolled back',
        sideToTrain: 'WHITE',
        allowConflicts: false,
      },
    });
    throw new Error('force rollback');
  }), /force rollback/);
  assert.equal(await prisma.line.count({ where: { chapterId: rollbackChapter.id } }), 0);
  assert.equal(await revision(rollbackCourse.id), rollbackRevision);

  console.log('Builder course reintegration database tests passed.');
} finally {
  if (userId) await prisma.appUser.delete({ where: { id: userId } });
  if (otherUserId) await prisma.appUser.delete({ where: { id: otherUserId } });
  await prisma.$disconnect();
}
