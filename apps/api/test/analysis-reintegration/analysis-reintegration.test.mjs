import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import coursesModule from '../../dist/modules/courses/courses.routes.js';
import { AnalysisReintegrationError, AnalysisReintegrationService } from '../../dist/modules/courses/analysis-reintegration.service.js';

const app = Fastify();
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);
app.decorateRequest('auth', null);
app.addHook('onRequest', async (request) => {
  request.auth = { userId: 42, provider: 'dev', externalSubject: 'test-user' };
});
await app.register(coursesModule);
await app.ready();

const tree = { rootFen: 'startpos', children: [{ moveUci: 'e2e4', children: [] }] };
const previewMove = {
  moveUci: 'e2e4',
  moveSan: 'e4',
  fenBefore: 'startpos',
  fenAfter: 'after-e4',
  normalizedFenBefore: 'normalized',
  status: 'CREATES',
  existingNodeId: null,
  reason: null,
  children: [],
};
const conflictPayload = {
  normalizedFenBefore: 'normalized',
  sideToMove: 'WHITE',
  proposedMoveUci: 'e2e4',
  proposedMoveSan: 'e4',
  existingMoves: [{
    moveUci: 'd2d4',
    moveSan: 'd4',
    lineRefs: [{ lineId: 10, lineName: 'Target', nodeId: 99, moveSequenceSan: '1. d4' }],
  }],
};
const originalPreview = AnalysisReintegrationService.previewChapter;
const originalApply = AnalysisReintegrationService.applyToChapter;

try {
  let previewCall;
  AnalysisReintegrationService.previewChapter = async (userId, chapterId, body) => {
    previewCall = { userId, chapterId, body };
    return { analysisRootFen: tree.rootFen, analysisRootNormalizedFen: 'normalized', candidates: [
      { lineId: 10, lineName: 'Target', sideToTrain: 'WHITE', anchor: { kind: 'NODE', lineId: 10,
        lineName: 'Target', nodeId: 99, fen: 'fen', normalizedFen: 'normalized', moveSequenceSan: '1. e4' },
        counts: { reusedMoves: 0, createdMoves: 1, conflictingMoves: 0, totalAnalysisMoves: 1 },
        conflicts: [], warnings: [], previewTree: [previewMove] },
    ], newLine: { allowed: true, counts: { reusedMoves: 0, createdMoves: 1,
      conflictingMoves: 0, totalAnalysisMoves: 1 }, conflicts: [], warnings: [], previewTree: [previewMove] } };
  };
  const preview = await app.inject({ method: 'POST', url: '/api/chapters/7/analysis-reintegration/preview',
    payload: { analysisTree: tree, newLineSideToTrain: 'WHITE' } });
  assert.equal(preview.statusCode, 200);
  assert.equal(preview.json().candidates[0].anchor.kind, 'NODE');
  assert.equal(preview.json().candidates[0].previewTree[0].moveUci, 'e2e4');
  assert.equal(previewCall.chapterId, 7);
  assert.equal(previewCall.userId, 42);

  const invalid = await app.inject({ method: 'POST', url: '/api/chapters/7/analysis-reintegration/preview',
    payload: { analysisTree: { rootFen: '', children: [] } } });
  assert.equal(invalid.statusCode, 400);
  assert.deepEqual(invalid.json(), { error: 'Validation failed' });

  let applyCall;
  AnalysisReintegrationService.applyToChapter = async (userId, chapterId, body) => {
    applyCall = { userId, chapterId, body };
    return { targetKind: body.target.kind, lineId: 10, lineName: 'Target', createdMoves: 1, reusedMoves: 0 };
  };
  const apply = await app.inject({ method: 'POST', url: '/api/chapters/7/analysis-reintegration/apply', payload: {
    analysisTree: tree, target: { kind: 'EXISTING_LINE', lineId: 10,
      anchor: { kind: 'NODE', nodeId: 99, normalizedFen: 'normalized' } },
  } });
  assert.equal(apply.statusCode, 200);
  assert.deepEqual(apply.json(), {
    targetKind: 'EXISTING_LINE',
    lineId: 10,
    lineName: 'Target',
    createdMoves: 1,
    reusedMoves: 0,
  });
  assert.equal(applyCall.body.target.allowConflicts, false);
  assert.equal(applyCall.userId, 42);

  const newLineApply = await app.inject({ method: 'POST', url: '/api/chapters/7/analysis-reintegration/apply', payload: {
    analysisTree: tree, target: { kind: 'NEW_LINE', name: 'New', sideToTrain: 'WHITE', allowConflicts: true },
  } });
  assert.equal(newLineApply.statusCode, 200);
  assert.equal(applyCall.body.target.allowConflicts, true);

  AnalysisReintegrationService.applyToChapter = async () => {
    throw new AnalysisReintegrationError('Analysis tree has repertoire conflicts.', 409, [conflictPayload]);
  };
  const conflict = await app.inject({ method: 'POST', url: '/api/chapters/7/analysis-reintegration/apply', payload: {
    analysisTree: tree, target: { kind: 'NEW_LINE', name: 'New', sideToTrain: 'WHITE' },
  } });
  assert.equal(conflict.statusCode, 409);
  assert.deepEqual(conflict.json(), {
    error: 'Analysis tree has repertoire conflicts.',
    conflicts: [conflictPayload],
  });

  AnalysisReintegrationService.applyToChapter = async () => {
    throw new AnalysisReintegrationError('Analysis reintegration anchor is stale or invalid.', 409);
  };
  const stale = await app.inject({ method: 'POST', url: '/api/chapters/7/analysis-reintegration/apply', payload: {
    analysisTree: tree, target: { kind: 'EXISTING_LINE', lineId: 10,
      anchor: { kind: 'NODE', nodeId: 99, normalizedFen: 'normalized' } },
  } });
  assert.equal(stale.statusCode, 409);
  assert.deepEqual(stale.json(), { error: 'Analysis reintegration anchor is stale or invalid.' });

  AnalysisReintegrationService.applyToChapter = async () => { throw new AnalysisReintegrationError('Line not found', 404); };
  const missing = await app.inject({ method: 'POST', url: '/api/chapters/7/analysis-reintegration/apply', payload: {
    analysisTree: tree, target: { kind: 'EXISTING_LINE', lineId: 404,
      anchor: { kind: 'LINE_START', nodeId: null, normalizedFen: 'normalized' } },
  } });
  assert.equal(missing.statusCode, 404);
  assert.deepEqual(missing.json(), { error: 'Line not found' });

  console.log('Analysis reintegration route tests passed.');
} finally {
  AnalysisReintegrationService.previewChapter = originalPreview;
  AnalysisReintegrationService.applyToChapter = originalApply;
  await app.close();
}
