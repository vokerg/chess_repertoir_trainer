import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  tacticalDetectionListResponseSchema,
  tacticalDetectionRunResponseSchema,
  trainingLogResponseSchema,
} from '@chess-trainer/contracts/lab';
import prismaModule from '../../dist/prisma.js';
import {
  tacticalDetectionListSchema,
  tacticalDetectionRunSchema,
} from '../../dist/modules/lab/tactical-detections/tactical-detection.schema.js';
import {
  getTacticalDetections,
  runTacticalDetection,
} from '../../dist/modules/lab/tactical-detections/tactical-detection.service.js';
import { trainingLogQuerySchema } from '../../dist/modules/lab/training-log/training-log.schema.js';
import { getTrainingLog } from '../../dist/modules/lab/training-log/training-log.service.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
let userId;

try {
  const user = await prisma.appUser.create({
    data: { displayName: `lab-contract-${suffix}` },
  });
  userId = user.id;

  const trainingLog = await getTrainingLog(
    userId,
    trainingLogQuerySchema.parse({ limit: 10 }),
  );
  assert.deepEqual(trainingLog, { items: [] });
  assert.deepEqual(trainingLogResponseSchema.parse(trainingLog), trainingLog);

  const tacticalList = await getTacticalDetections(
    userId,
    tacticalDetectionListSchema.parse({ limit: 10 }),
  );
  assert.deepEqual(tacticalList.items, []);
  assert.equal(typeof tacticalList.from, 'string');
  assert.equal(typeof tacticalList.to, 'string');
  assert.deepEqual(tacticalDetectionListResponseSchema.parse(tacticalList), tacticalList);

  const gameTacticalList = await getTacticalDetections(
    userId,
    tacticalDetectionListSchema.parse({ gameId: 2_147_483_647, limit: 10 }),
  );
  assert.equal(gameTacticalList.from, null);
  assert.equal(gameTacticalList.to, null);
  assert.deepEqual(gameTacticalList.items, []);
  assert.deepEqual(
    tacticalDetectionListResponseSchema.parse(gameTacticalList),
    gameTacticalList,
  );

  const tacticalRun = await runTacticalDetection(
    userId,
    tacticalDetectionRunSchema.parse({ force: false }),
  );
  assert.equal(tacticalRun.scannedGames, 0);
  assert.equal(tacticalRun.skippedAlreadyProcessedGames, 0);
  assert.equal(tacticalRun.processedGames, 0);
  assert.equal(tacticalRun.detectionsInserted, 0);
  assert.equal(tacticalRun.missedShots, 0);
  assert.equal(tacticalRun.punishedOpponentBlunders, 0);
  assert.equal(tacticalRun.userBlunders, 0);
  assert.deepEqual(tacticalDetectionRunResponseSchema.parse(tacticalRun), tacticalRun);

  console.log('Lab response service contract tests passed.');
} finally {
  if (userId) await prisma.appUser.delete({ where: { id: userId } });
  await prisma.$disconnect();
}
