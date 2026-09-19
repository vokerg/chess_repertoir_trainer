import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { newCourseRepertoireTargetExample } from '@chess-trainer/contracts/repertoire-target';
import routes from '../../dist/modules/courses/builder-course-reintegration.routes.js';
import { AnalysisReintegrationError } from '../../dist/modules/courses/analysis-reintegration.service.js';
import { BuilderCourseReintegrationService } from '../../dist/modules/courses/builder-course-reintegration.service.js';

const app = Fastify();
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);
app.decorateRequest('auth', null);
app.addHook('onRequest', async (request) => {
  request.auth = { userId: 42, provider: 'dev', externalSubject: 'test-user' };
});
await app.register(routes);
await app.ready();

const draft = {
  draftVersion: '2026-07-v1',
  sessionModelVersion: '2026-07-v1',
  sessionId: 'route-session',
  ownerId: '42',
  sessionRevision: 4,
  sessionLifecycle: 'COMPLETED',
  targetRevision: 1,
  targetContractVersion: newCourseRepertoireTargetExample.contractVersion,
  targetId: newCourseRepertoireTargetExample.targetId,
  targetCapturedAt: newCourseRepertoireTargetExample.createdAt,
  target: newCourseRepertoireTargetExample,
  repertoireSide: newCourseRepertoireTargetExample.side,
  startingFen: 'startpos',
  analysisTree: { rootFen: 'startpos', children: [{ moveUci: 'e2e4', children: [] }] },
  materializedDecisionCount: 1,
  materializedMoveCount: 1,
  transpositionLeafCount: 0,
  excludedBranches: [],
};
const counts = {
  reusedMoves: 0,
  createdMoves: 1,
  conflictingMoves: 0,
  totalDraftMoves: 1,
  skippedBranches: 0,
};
const originalPreview = BuilderCourseReintegrationService.previewChapter;
const originalApply = BuilderCourseReintegrationService.applyToChapter;

try {
  let previewCall;
  BuilderCourseReintegrationService.previewChapter = async (userId, chapterId, body) => {
    previewCall = { userId, chapterId, body };
    return {
      contractVersion: '2026-07-v1',
      previewToken: `sha256:${'a'.repeat(64)}`,
      previewedAt: '2026-07-29T12:00:00.000Z',
      course: { id: 1, name: 'Course', contentRevision: 3 },
      chapter: { id: 7, name: 'Chapter' },
      draft: {
        sessionId: draft.sessionId,
        sessionRevision: draft.sessionRevision,
        targetId: draft.targetId,
        targetRevision: draft.targetRevision,
        repertoireSide: draft.repertoireSide,
        materializedDecisionCount: 1,
        materializedMoveCount: 1,
        transpositionLeafCount: 0,
        excludedBranches: [],
      },
      candidates: [],
      newLine: {
        status: 'CREATES',
        allowed: true,
        equivalentLine: null,
        counts,
        conflicts: [],
        warnings: [],
        previewTree: [],
      },
    };
  };
  const preview = await app.inject({
    method: 'POST',
    url: '/api/chapters/7/builder-course-reintegration/preview',
    payload: { draft, newLineName: 'Builder line' },
  });
  assert.equal(preview.statusCode, 200);
  assert.equal(preview.json().previewToken, `sha256:${'a'.repeat(64)}`);
  assert.equal(previewCall.userId, 42);
  assert.equal(previewCall.chapterId, 7);
  assert.equal(previewCall.body.contractVersion, '2026-07-v1');

  const invalid = await app.inject({
    method: 'POST',
    url: '/api/chapters/7/builder-course-reintegration/preview',
    payload: { draft: { ...draft, materializedMoveCount: 2 }, newLineName: 'Builder line' },
  });
  assert.equal(invalid.statusCode, 400);

  let applyCall;
  BuilderCourseReintegrationService.applyToChapter = async (userId, chapterId, body) => {
    applyCall = { userId, chapterId, body };
    return {
      contractVersion: '2026-07-v1',
      targetKind: 'NEW_LINE',
      courseId: 1,
      chapterId,
      lineId: 9,
      lineName: 'Builder line',
      createdMoves: 1,
      reusedMoves: 0,
      skippedBranches: 0,
      conflictingMoves: 0,
      totalDraftMoves: 1,
      courseContentRevision: 4,
      idempotent: false,
    };
  };
  const apply = await app.inject({
    method: 'POST',
    url: '/api/chapters/7/builder-course-reintegration/apply',
    payload: {
      draft,
      newLineName: 'Builder line',
      previewToken: `sha256:${'a'.repeat(64)}`,
      target: { kind: 'NEW_LINE', name: 'Builder line' },
    },
  });
  assert.equal(apply.statusCode, 200);
  assert.equal(apply.json().createdMoves, 1);
  assert.equal(applyCall.userId, 42);
  assert.equal(applyCall.body.target.kind, 'NEW_LINE');

  BuilderCourseReintegrationService.applyToChapter = async () => {
    throw new AnalysisReintegrationError('Builder course preview is stale.', 409);
  };
  const stale = await app.inject({
    method: 'POST',
    url: '/api/chapters/7/builder-course-reintegration/apply',
    payload: {
      draft,
      newLineName: 'Builder line',
      previewToken: `sha256:${'a'.repeat(64)}`,
      target: { kind: 'NEW_LINE', name: 'Builder line' },
    },
  });
  assert.equal(stale.statusCode, 409);
  assert.equal(stale.json().error, 'Builder course preview is stale.');

  console.log('Builder course reintegration route tests passed.');
} finally {
  BuilderCourseReintegrationService.previewChapter = originalPreview;
  BuilderCourseReintegrationService.applyToChapter = originalApply;
  await app.close();
}
