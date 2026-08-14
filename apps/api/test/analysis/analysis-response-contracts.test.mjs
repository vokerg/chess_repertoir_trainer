import assert from 'node:assert/strict';
import {
  positionAnalysisBulkResponseSchema,
  positionAnalysisLookupResponseSchema,
  positionAnalysisStoreResponseSchema,
} from '@chess-trainer/contracts/analysis';
import { normalizeFenForPosition } from 'chess-domain';
import prismaModule from '../../dist/prisma.js';
import { PositionAnalysisService } from '../../dist/modules/analysis/position-analysis.service.js';

const prisma = prismaModule.default;
const fen = '8/8/8/8/4K3/8/8/7k w - - 0 1';
const normalizedFen = normalizeFenForPosition(fen);

async function cleanup() {
  await prisma.position.deleteMany({ where: { normalizedFen } });
}

try {
  await cleanup();

  const stored = await PositionAnalysisService.storePositionSearch({
    fen,
    bestMoveUci: 'e4e5',
    bestScoreCpWhite: 12,
    lines: [{
      multipv: 1,
      depth: 18,
      moveUci: 'e4e5',
      scoreCpWhite: 12,
      pvUci: ['e4e5'],
    }],
  });
  assert.deepEqual(
    positionAnalysisStoreResponseSchema.parse({ positionAnalysis: stored, position: stored }),
    { positionAnalysis: stored, position: stored },
  );

  const lookedUp = await PositionAnalysisService.getPositionAnalysis(fen);
  assert.deepEqual(
    positionAnalysisLookupResponseSchema.parse({ positionAnalysis: lookedUp }),
    { positionAnalysis: lookedUp },
  );

  const bulkLookedUp = await PositionAnalysisService.getPositionAnalyses([fen]);
  assert.deepEqual(
    positionAnalysisBulkResponseSchema.parse({ positionAnalyses: bulkLookedUp }),
    { positionAnalyses: bulkLookedUp },
  );

  const bulkStored = await PositionAnalysisService.storePositionSearches([{
    fen,
    bestMoveUci: 'e4d5',
    bestScoreCpWhite: 20,
    lines: [{
      multipv: 1,
      depth: 20,
      moveUci: 'e4d5',
      scoreCpWhite: 20,
      pvUci: ['e4d5'],
    }],
  }]);
  assert.deepEqual(
    positionAnalysisBulkResponseSchema.parse({ positionAnalyses: bulkStored }),
    { positionAnalyses: bulkStored },
  );

  console.log('Analysis response service contract tests passed.');
} finally {
  await cleanup();
  await prisma.$disconnect();
}
