import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const schema = await readFile(path.join(apiRoot, 'prisma/schema.prisma'), 'utf8');
const userRepository = await readFile(
  path.join(apiRoot, 'src/modules/data-lifecycle/data-lifecycle.user.repository.prisma.ts'),
  'utf8',
);

const modelBlocks = [...schema.matchAll(/model\s+(\w+)\s+\{([\s\S]*?)\n\}/g)];
const appUserOwnedModels = [];

for (const [, modelName, body] of modelBlocks) {
  if (modelName === 'AppUser') continue;
  const appUserRelations = [...body.matchAll(/\\bAppUser\\b\\s+@relation\\(([^)]*)\\)/g)];
  if (appUserRelations.length === 0) continue;

  assert.equal(
    appUserRelations.length,
    1,
    `${modelName} should have one direct AppUser ownership relation`,
  );
  assert.match(
    appUserRelations[0][1],
    /onDelete:\s*Cascade/,
    `${modelName} must cascade from AppUser so final identity deletion cannot be blocked`,
  );
  appUserOwnedModels.push(modelName);
}

assert.deepEqual(
  appUserOwnedModels.sort(),
  [
    'Course',
    'DataPreparationRun',
    'ExternalAccount',
    'ImportRun',
    'ImportedGame',
    'ImportedGameAiReview',
    'JobRun',
    'LichessConnection',
    'LichessPuzzleReviewState',
    'LichessPuzzleRound',
    'RepertoireSublineReviewState',
    'ScenarioTrainingSession',
    'TacticalDetection',
    'TacticalDetectionFeedback',
    'TacticalDetectionProcessedGame',
    'TacticalDetectionRun',
    'TrainingSession',
    'TrainingSublineAttempt',
    'UserActivityDailyAggregate',
  ],
  'Update whole-user deletion ownership coverage when a direct AppUser relation changes',
);

for (const modelName of appUserOwnedModels) {
  const delegate = modelName[0].toLowerCase() + modelName.slice(1);
  assert.ok(
    userRepository.includes(`database.${delegate}.count({ where: { userId } })`),
    `${modelName} must participate in the pre-delete/post-delete ownership verification map`,
  );
}

assert.match(
  userRepository,
  /database\.oAuthLoginState\.count\(\{ where: \{ userId \} \}\)/,
  'FK-less OAuthLoginState rows must participate in whole-user verification',
);

console.log('Whole-user AppUser ownership map coverage tests passed.');
