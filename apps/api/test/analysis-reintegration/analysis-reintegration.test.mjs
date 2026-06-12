import assert from 'node:assert/strict';
import Fastify from 'fastify';
import coursesModule from '../../dist/modules/courses/courses.routes.js';
import { AnalysisReintegrationError, AnalysisReintegrationService } from '../../dist/modules/courses/analysis-reintegration.service.js';

const app = Fastify();
await app.register(coursesModule);
await app.ready();

const tree = { rootFen: 'startpos', children: [{ moveUci: 'e2e4', children: [] }] };
const originalPreview = AnalysisReintegrationService.previewChapter;
const originalApply = AnalysisReintegrationService.applyToChapter;

try {
  let previewCall;
  AnalysisReintegrationService.previewChapter = async (chapterId, body) => {
    previewCall = { chapterId, body };
    return { analysisRootFen: tree.rootFen, analysisRootNormalizedFen: 'normalized', candidates: [
      { lineId: 10, lineName: 'Target', sideToTrain: 'WHITE', anchor: { kind: 'NODE', lineId: 10,
        lineName: 'Target', nodeId: 99, fen: 'fen', normalizedFen: 'normalized', moveSequenceSan: '1. e4' },
        counts: { reusedMoves: 0, createdMoves: 1, conflictingMoves: 0, totalAnalysisMoves: 1 },
        conflicts: [], warnings: [], previewTree: [] },
    ], newLine: { allowed: true, counts: { reusedMoves: 0, createdMoves: 1,
      conflictingMoves: 0, totalAnalysisMoves: 1 }, conflicts: [], warnings: [], previewTree: [] } };
  };
  const preview = await app.inject({ method: 'POST', url: '/api/chapters/7/analysis-reintegration/preview',
    payload: { analysisTree: tree, newLineSideToTrain: 'WHITE' } });
  assert.equal(preview.statusCode, 200);
  assert.equal(preview.json().candidates[0].anchor.kind, 'NODE');
  assert.equal(previewCall.chapterId, 7);

  const invalid = await app.inject({ method: 'POST', url: '/api/chapters/7/analysis-reintegration/preview',
    payload: { analysisTree: { rootFen: '', children: [] } } });
  assert.equal(invalid.statusCode, 400);

  let applyCall;
  AnalysisReintegrationService.applyToChapter = async (chapterId, body) => {
    applyCall = { chapterId, body };
    return { targetKind: body.target.kind, lineId: 10, lineName: 'Target', createdMoves: 1, reusedMoves: 0 };
  };
  const apply = await app.inject({ method: 'POST', url: '/api/chapters/7/analysis-reintegration/apply', payload: {
    analysisTree: tree, target: { kind: 'EXISTING_LINE', lineId: 10,
      anchor: { kind: 'NODE', nodeId: 99, normalizedFen: 'normalized' } },
  } });
  assert.equal(apply.statusCode, 200);
  assert.equal(apply.json().createdMoves, 1);
  assert.equal(applyCall.body.target.allowConflicts, false);

  AnalysisReintegrationService.applyToChapter = async () => {
    throw new AnalysisReintegrationError('Analysis tree has repertoire conflicts.', 409, [{ proposedMoveUci: 'e2e4' }]);
  };
  const conflict = await app.inject({ method: 'POST', url: '/api/chapters/7/analysis-reintegration/apply', payload: {
    analysisTree: tree, target: { kind: 'NEW_LINE', name: 'New', sideToTrain: 'WHITE' },
  } });
  assert.equal(conflict.statusCode, 409);
  assert.equal(conflict.json().conflicts[0].proposedMoveUci, 'e2e4');

  AnalysisReintegrationService.applyToChapter = async () => {
    throw new AnalysisReintegrationError('Analysis reintegration anchor is stale or invalid.', 409);
  };
  const stale = await app.inject({ method: 'POST', url: '/api/chapters/7/analysis-reintegration/apply', payload: {
    analysisTree: tree, target: { kind: 'EXISTING_LINE', lineId: 10,
      anchor: { kind: 'NODE', nodeId: 99, normalizedFen: 'normalized' } },
  } });
  assert.equal(stale.statusCode, 409);

  AnalysisReintegrationService.applyToChapter = async () => { throw new AnalysisReintegrationError('Line not found', 404); };
  const missing = await app.inject({ method: 'POST', url: '/api/chapters/7/analysis-reintegration/apply', payload: {
    analysisTree: tree, target: { kind: 'EXISTING_LINE', lineId: 404,
      anchor: { kind: 'LINE_START', nodeId: null, normalizedFen: 'normalized' } },
  } });
  assert.equal(missing.statusCode, 404);

  console.log('Analysis reintegration route tests passed.');
} finally {
  AnalysisReintegrationService.previewChapter = originalPreview;
  AnalysisReintegrationService.applyToChapter = originalApply;
  await app.close();
}
