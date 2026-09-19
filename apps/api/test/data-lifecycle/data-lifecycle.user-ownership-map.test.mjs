import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const cwd = process.cwd();
const schema = await readFile(path.join(cwd, 'prisma/schema.prisma'), 'utf8');
const userRepository = await readFile(
  path.join(cwd, 'src/modules/data-lifecycle/data-lifecycle.user.repository.prisma.ts'),
  'utf8',
);

const modelBlocks = [...schema.matchAll(/model\s+(\w+)\s+\{([\s\S]*?)\n\}/g)];
const appUserOwnedModels = [];

for (const [, modelName, body] of modelBlocks) {
  if (modelName === 'AppUser') continue;
  const relationLines = body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /\bAppUser\b/.test(line) && /@relation\(/.test(line));
  if (relationLines.length === 0) continue;

  assert.equal(
    relationLines.length,
    1,
    `${modelName} should have one direct AppUser ownership relation`,
  );
  assert.match(
    relationLines[0],
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
  assert.match(
    userRepository,
    new RegExp(
      `database\\.${delegate}\\.count\\\\?\\(\\{ where: \\{ userId \\} \\}\\)`,
    ),
    `${modelName} must participate in the pre-delete/post-delete ownership verification map`,
  );
}

assert.match(
  userRepository,
  /database\.oAuthLoginState\.count\(\{ where: \{ userId \} \}\)/,
  'FK-less OAuthLoginState rows must participate in whole-user verification',
);

console.log('Whole-user AppUser ownership map coverage tests passed.');
